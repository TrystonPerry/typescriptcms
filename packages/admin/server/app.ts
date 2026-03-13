import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type Request,
  type Response as ExpressResponse,
  type NextFunction,
} from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

export interface AdminOptions {
  githubClientId?: string;
  githubClientSecret?: string;
  /** URL the admin client is served from (used for CORS and OAuth redirects). */
  serverUrl?: string;
  /** Cookie signing secret. Omit for unsigned cookies (dev only). */
  sessionSecret?: string;
  /** Absolute path to a local CMS directory. Enables local disk mode (skips GitHub auth). */
  cmsPath?: string;
}

const PREVIEW_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

interface PreviewSession {
  id: string;
  owner: string;
  repo: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  files: Map<string, Record<string, unknown>>;
}

function now(): number {
  return Date.now();
}

function pathEncode(value: string): string {
  return value
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function parseBody(response: globalThis.Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function githubFetch(
  endpoint: string,
  token: string,
  init: RequestInit = {}
): Promise<unknown> {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });

  const parsed = await parseBody(response);

  if (!response.ok) {
    const message =
      typeof parsed === "string"
        ? parsed
        : typeof parsed === "object" && parsed !== null && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : "GitHub API request failed";

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return parsed;
}

function withGithubErrorHint(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("resource not accessible by integration")) {
    return `${message}. The authenticated token cannot write repository contents. Use a GitHub OAuth App with 'repo' scope, or if you are using a GitHub App, grant Contents 'Read and write' permission and reinstall/re-authorize.`;
  }

  if (normalized.includes("must have push access")) {
    return `${message}. Your GitHub account can read this repository but cannot push to the selected branch.`;
  }

  return message;
}

async function findLocalFiles(dir: string, suffix: string, base = ""): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const results: string[] = [];

  for (const entry of entries) {
    const relative = base ? `${base}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      results.push(...(await findLocalFiles(path.join(dir, entry.name), suffix, relative)));
    } else if (entry.name.endsWith(suffix)) {
      results.push(relative);
    }
  }

  return results;
}

async function findLocalConfigFiles(dir: string, base = ""): Promise<string[]> {
  return findLocalFiles(dir, ".config.json", base);
}

/**
 * Create the admin Express app. Returns a router that handles all `/admin/**`
 * routes (API, auth, and — if `clientDistDir` is provided — the built Vue UI).
 *
 * Mount it in any Express-compatible server:
 *
 * ```ts
 * import { createAdminApp } from "@typescriptcms/admin/server";
 * app.use(createAdminApp({ ... }));
 * ```
 *
 * Or use it with Nitro / h3:
 *
 * ```ts
 * import { fromNodeMiddleware } from "h3";
 * import { createAdminApp } from "@typescriptcms/admin/server";
 * export default fromNodeMiddleware(createAdminApp({ ... }));
 * ```
 */
export function createAdminApp(opts: AdminOptions = {}) {
  const githubClientId = opts.githubClientId ?? process.env.GITHUB_CLIENT_ID;
  const githubClientSecret =
    opts.githubClientSecret ?? process.env.GITHUB_CLIENT_SECRET;
  const serverUrl =
    opts.serverUrl ?? process.env.ADMIN_SERVER_URL ?? "http://localhost:5500";
  const sessionSecret =
    opts.sessionSecret ?? process.env.SESSION_SECRET;
  const cmsPathRaw = opts.cmsPath ?? process.env.TYPESCRIPTCMS_CMS_PATH ?? "";
  const localMode = cmsPathRaw.length > 0;
  const resolvedCmsPath = cmsPathRaw ? path.resolve(cmsPathRaw) : "";

  if (!sessionSecret) {
    console.warn("SESSION_SECRET is not set. For local dev only.");
  }

  const app = express.Router();
  const previewSessions = new Map<string, PreviewSession>();

  function cleanupExpiredPreviewSessions(): void {
    const current = now();

    for (const [sessionId, session] of previewSessions.entries()) {
      if (session.expiresAt <= current) {
        previewSessions.delete(sessionId);
      }
    }
  }

  function touchPreviewSession(session: PreviewSession): void {
    const current = now();
    session.updatedAt = current;
    session.expiresAt = current + PREVIEW_SESSION_TTL_MS;
  }

  function getValidPreviewSession(sessionId: string): PreviewSession | undefined {
    const session = previewSessions.get(sessionId);

    if (!session) {
      return undefined;
    }

    if (session.expiresAt <= now()) {
      previewSessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  setInterval(cleanupExpiredPreviewSessions, 5 * 60 * 1000).unref();

  function getAccessToken(req: Request): string | undefined {
    return req.signedCookies.gh_access_token || req.cookies.gh_access_token;
  }

  function requireAuth(
    req: Request,
    res: ExpressResponse,
    next: NextFunction
  ): void {
    if (localMode) {
      next();
      return;
    }

    if (!getAccessToken(req)) {
      res.status(401).json({ message: "Not authenticated with GitHub." });
      return;
    }

    next();
  }

  function clearAuthCookies(res: ExpressResponse): void {
    res.clearCookie("gh_access_token");
    res.clearCookie("gh_access_token", { signed: true });
    res.clearCookie("gh_oauth_state");
  }

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(sessionSecret));

  // ── Auth ──────────────────────────────────────────────

  app.get("/admin/auth/github", (req, res) => {
    if (!githubClientId || !githubClientSecret) {
      res.status(500).send("GitHub OAuth environment variables are missing.");
      return;
    }

    const state = randomUUID();
    res.cookie("gh_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60 * 1000,
    });

    const searchParams = new URLSearchParams({
      client_id: githubClientId,
      redirect_uri: `${serverUrl}/admin/auth/github/callback`,
      scope: "repo read:user",
      state,
      allow_signup: "true",
    });

    res.redirect(`${GITHUB_AUTHORIZE_URL}?${searchParams.toString()}`);
  });

  app.get("/admin/auth/github/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state =
      typeof req.query.state === "string" ? req.query.state : undefined;

    if (!code || !state) {
      res.status(400).send("GitHub callback is missing required params.");
      return;
    }

    const stateCookie = req.cookies.gh_oauth_state;
    if (!stateCookie || stateCookie !== state) {
      res.status(400).send("OAuth state validation failed.");
      return;
    }

    if (!githubClientId || !githubClientSecret) {
      res.status(500).send("GitHub OAuth environment variables are missing.");
      return;
    }

    const tokenResponse = await fetch(GITHUB_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
        redirect_uri: `${serverUrl}/admin/auth/github/callback`,
      }),
    });

    const tokenJson = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenJson.access_token) {
      const description =
        tokenJson.error_description ?? tokenJson.error ?? "OAuth exchange failed";
      res.status(400).send(description);
      return;
    }

    res.cookie("gh_access_token", tokenJson.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
      signed: Boolean(sessionSecret),
    });
    res.clearCookie("gh_oauth_state");

    res.redirect(`${serverUrl}/admin/editor`);
  });

  app.post("/admin/auth/logout", (_req, res) => {
    clearAuthCookies(res);
    res.status(204).send();
  });

  // ── API ───────────────────────────────────────────────

  app.get("/admin/api/session", async (req, res) => {
    if (localMode) {
      res.json({ authenticated: true, local: true });
      return;
    }

    const token = getAccessToken(req);

    if (!token) {
      res.json({ authenticated: false });
      return;
    }

    try {
      const user = (await githubFetch("/user", token)) as {
        login: string;
        avatar_url: string;
        html_url: string;
        name?: string;
      };

      res.json({
        authenticated: true,
        user: {
          login: user.login,
          name: user.name ?? user.login,
          avatarUrl: user.avatar_url,
          profileUrl: user.html_url,
        },
      });
    } catch {
      clearAuthCookies(res);
      res.json({ authenticated: false });
    }
  });

  app.get("/admin/api/repos", requireAuth, async (req, res) => {
    const token = getAccessToken(req);

    try {
      const repos = (await githubFetch(
        "/user/repos?per_page=100&sort=updated&type=owner",
        token!
      )) as Array<{
        id: number;
        name: string;
        full_name: string;
        private: boolean;
        default_branch: string;
        owner: { login: string };
        pushed_at: string;
      }>;

      res.json({
        repos: repos.map((repo) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          owner: repo.owner.login,
          defaultBranch: repo.default_branch,
          pushedAt: repo.pushed_at,
        })),
      });
    } catch (error) {
      res.status((error as { status?: number }).status ?? 500).json({
        message: withGithubErrorHint((error as Error).message),
      });
    }
  });

  app.get("/admin/api/tree", requireAuth, async (req, res) => {
    const owner =
      typeof req.query.owner === "string" ? req.query.owner : undefined;
    const repo = typeof req.query.repo === "string" ? req.query.repo : undefined;
    const requestedPath =
      typeof req.query.path === "string" ? req.query.path : "";

    if (!owner || !repo) {
      res.status(400).json({ message: "owner and repo are required." });
      return;
    }

    const token = getAccessToken(req)!;
    const encodedPath = pathEncode(requestedPath);

    try {
      const endpoint = encodedPath
        ? `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/contents/${encodedPath}`
        : `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/contents`;

      const response = await githubFetch(endpoint, token);

      const entries = Array.isArray(response) ? response : [response];

      const files = entries
        .map((entry) => {
          if (typeof entry !== "object" || entry === null) {
            return null;
          }

          const typed = entry as {
            name: string;
            path: string;
            type: string;
            sha: string;
            size: number;
          };

          return {
            name: typed.name,
            path: typed.path,
            type: typed.type === "dir" ? "dir" : "file",
            sha: typed.sha,
            size: typed.size,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }

          return a.type === "dir" ? -1 : 1;
        });

      res.json({ entries: files });
    } catch (error) {
      res.status((error as { status?: number }).status ?? 500).json({
        message: withGithubErrorHint((error as Error).message),
      });
    }
  });

  app.get("/admin/api/cms-configs", async (req, res) => {
    if (localMode) {
      try {
        const configPaths = await findLocalConfigFiles(resolvedCmsPath);

        const files = await Promise.all(
          configPaths.map(async (relativePath) => {
            const fullPath = path.join(resolvedCmsPath, relativePath);
            const raw = await fs.readFile(fullPath, "utf-8");

            try {
              return { path: relativePath, config: JSON.parse(raw) };
            } catch (error) {
              return { path: relativePath, config: null, parseError: (error as Error).message };
            }
          }),
        );

        res.json({ files });
      } catch (error) {
        res.status(500).json({ message: (error as Error).message });
      }

      return;
    }

    if (!getAccessToken(req)) {
      res.status(401).json({ message: "Not authenticated with GitHub." });
      return;
    }

    const owner =
      typeof req.query.owner === "string" ? req.query.owner : undefined;
    const repo = typeof req.query.repo === "string" ? req.query.repo : undefined;
    const folder =
      typeof req.query.folder === "string"
        ? req.query.folder.replace(/^\/+|\/+$/g, "")
        : "";

    if (!owner || !repo) {
      res.status(400).json({ message: "owner and repo are required." });
      return;
    }

    const token = getAccessToken(req)!;

    try {
      const repoDetails = (await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        token
      )) as { default_branch: string };

      const treeResponse = (await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
          repo
        )}/git/trees/${encodeURIComponent(
          repoDetails.default_branch
        )}?recursive=1`,
        token
      )) as {
        tree: Array<{ path: string; type: string; sha: string }>;
      };

      const prefix = folder ? `${folder}/` : "";

      const matches = treeResponse.tree.filter((entry) => {
        if (entry.type !== "blob" || !entry.path.endsWith(".config.json")) {
          return false;
        }

        if (!folder) {
          return true;
        }

        return entry.path === folder || entry.path.startsWith(prefix);
      });

      const files = await Promise.all(
        matches.map(async (entry) => {
          const blob = (await githubFetch(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repo
            )}/git/blobs/${encodeURIComponent(entry.sha)}`,
            token
          )) as { content: string; encoding: string };

          const raw =
            blob.encoding === "base64"
              ? Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString(
                  "utf-8"
                )
              : blob.content;

          try {
            return {
              path: entry.path,
              config: JSON.parse(raw),
            };
          } catch (error) {
            return {
              path: entry.path,
              config: null,
              parseError: (error as Error).message,
            };
          }
        })
      );

      res.json({ files });
    } catch (error) {
      res.status((error as { status?: number }).status ?? 500).json({
        message: withGithubErrorHint((error as Error).message),
      });
    }
  });

  // ── Component schemas ──────────────────────────────────

  app.get("/admin/api/cms-components", async (req, res) => {
    if (localMode) {
      try {
        const componentsDir = path.join(resolvedCmsPath, "components");
        const configPaths = await findLocalFiles(componentsDir, ".config.json");

        const components: Record<string, unknown> = {};

        for (const relativePath of configPaths) {
          const fullPath = path.join(componentsDir, relativePath);
          const raw = await fs.readFile(fullPath, "utf-8");
          const name = path.basename(relativePath, ".config.json");

          try {
            components[name] = JSON.parse(raw);
          } catch {}
        }

        res.json({ components });
      } catch (error) {
        res.status(500).json({ message: (error as Error).message });
      }

      return;
    }

    if (!getAccessToken(req)) {
      res.status(401).json({ message: "Not authenticated with GitHub." });
      return;
    }

    const owner = typeof req.query.owner === "string" ? req.query.owner : undefined;
    const repo = typeof req.query.repo === "string" ? req.query.repo : undefined;
    const folder = typeof req.query.folder === "string"
      ? req.query.folder.replace(/^\/+|\/+$/g, "")
      : "";

    if (!owner || !repo) {
      res.status(400).json({ message: "owner and repo are required." });
      return;
    }

    const token = getAccessToken(req)!;

    try {
      const repoDetails = (await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        token
      )) as { default_branch: string };

      const treeResponse = (await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(repoDetails.default_branch)}?recursive=1`,
        token
      )) as { tree: Array<{ path: string; type: string; sha: string }> };

      const componentsPrefix = folder ? `${folder}/components/` : "components/";

      const matches = treeResponse.tree.filter((entry) =>
        entry.type === "blob" &&
        entry.path.startsWith(componentsPrefix) &&
        entry.path.endsWith(".config.json")
      );

      const components: Record<string, unknown> = {};

      for (const entry of matches) {
        const blob = (await githubFetch(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${encodeURIComponent(entry.sha)}`,
          token
        )) as { content: string; encoding: string };

        const raw = blob.encoding === "base64"
          ? Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf-8")
          : blob.content;

        const name = path.basename(entry.path, ".config.json");

        try {
          components[name] = JSON.parse(raw);
        } catch {}
      }

      res.json({ components });
    } catch (error) {
      res.status((error as { status?: number }).status ?? 500).json({
        message: withGithubErrorHint((error as Error).message),
      });
    }
  });

  // ── Page files ────────────────────────────────────────

  app.get("/admin/api/cms-pages", async (req, res) => {
    if (localMode) {
      try {
        const pagePaths = await findLocalFiles(resolvedCmsPath, ".page.json");

        const files = await Promise.all(
          pagePaths.map(async (relativePath) => {
            const fullPath = path.join(resolvedCmsPath, relativePath);
            const raw = await fs.readFile(fullPath, "utf-8");

            try {
              return { path: relativePath, page: JSON.parse(raw) };
            } catch (error) {
              return { path: relativePath, page: null, parseError: (error as Error).message };
            }
          }),
        );

        res.json({ files });
      } catch (error) {
        res.status(500).json({ message: (error as Error).message });
      }

      return;
    }

    if (!getAccessToken(req)) {
      res.status(401).json({ message: "Not authenticated with GitHub." });
      return;
    }

    const owner = typeof req.query.owner === "string" ? req.query.owner : undefined;
    const repo = typeof req.query.repo === "string" ? req.query.repo : undefined;
    const folder = typeof req.query.folder === "string"
      ? req.query.folder.replace(/^\/+|\/+$/g, "")
      : "";

    if (!owner || !repo) {
      res.status(400).json({ message: "owner and repo are required." });
      return;
    }

    const token = getAccessToken(req)!;

    try {
      const repoDetails = (await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        token
      )) as { default_branch: string };

      const treeResponse = (await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(repoDetails.default_branch)}?recursive=1`,
        token
      )) as { tree: Array<{ path: string; type: string; sha: string }> };

      const prefix = folder ? `${folder}/` : "";

      const matches = treeResponse.tree.filter((entry) => {
        if (entry.type !== "blob" || !entry.path.endsWith(".page.json")) return false;
        if (!folder) return true;
        return entry.path.startsWith(prefix);
      });

      const files = await Promise.all(
        matches.map(async (entry) => {
          const blob = (await githubFetch(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${encodeURIComponent(entry.sha)}`,
            token
          )) as { content: string; encoding: string };

          const raw = blob.encoding === "base64"
            ? Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf-8")
            : blob.content;

          try {
            return { path: entry.path, page: JSON.parse(raw) };
          } catch (error) {
            return { path: entry.path, page: null, parseError: (error as Error).message };
          }
        })
      );

      res.json({ files });
    } catch (error) {
      res.status((error as { status?: number }).status ?? 500).json({
        message: withGithubErrorHint((error as Error).message),
      });
    }
  });

  app.put("/admin/api/cms-page-file", async (req, res) => {
    const filePath = typeof req.body.path === "string" ? req.body.path : undefined;
    const page = req.body.page;

    if (!filePath || typeof page !== "object" || page === null) {
      res.status(400).json({ message: "path and page are required." });
      return;
    }

    if (localMode) {
      try {
        const fullPath = path.join(resolvedCmsPath, filePath);
        const resolved = path.resolve(fullPath);

        if (!resolved.startsWith(resolvedCmsPath)) {
          res.status(400).json({ message: "Invalid file path." });
          return;
        }

        await fs.writeFile(resolved, JSON.stringify(page, null, 2) + "\n", "utf-8");
        res.json({ result: { path: filePath } });
      } catch (error) {
        res.status(500).json({ message: (error as Error).message });
      }

      return;
    }

    if (!getAccessToken(req)) {
      res.status(401).json({ message: "Not authenticated with GitHub." });
      return;
    }

    const owner = typeof req.body.owner === "string" ? req.body.owner : undefined;
    const repo = typeof req.body.repo === "string" ? req.body.repo : undefined;
    const message = typeof req.body.message === "string" && req.body.message.trim().length > 0
      ? req.body.message.trim()
      : "Update page from TypeScript CMS admin";

    if (!owner || !repo) {
      res.status(400).json({ message: "owner and repo are required." });
      return;
    }

    const token = getAccessToken(req)!;

    try {
      const encodedPath = pathEncode(filePath);

      const existing = (await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
        token
      )) as { sha: string };

      const putResponse = await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
        token,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            content: Buffer.from(JSON.stringify(page, null, 2), "utf-8").toString("base64"),
            sha: existing.sha,
          }),
        }
      );

      res.json({ result: putResponse });
    } catch (error) {
      res.status((error as { status?: number }).status ?? 500).json({
        message: withGithubErrorHint((error as Error).message),
      });
    }
  });

  // ── Preview sessions ──────────────────────────────────

  app.post("/admin/api/preview/sessions", requireAuth, (req, res) => {
    const owner = typeof req.body.owner === "string" ? req.body.owner : (localMode ? "local" : undefined);
    const repo = typeof req.body.repo === "string" ? req.body.repo : (localMode ? "local" : undefined);

    if (!owner || !repo) {
      res.status(400).json({ message: "owner and repo are required." });
      return;
    }

    const createdAt = now();
    const sessionId = randomUUID();

    const session: PreviewSession = {
      id: sessionId,
      owner,
      repo,
      createdAt,
      updatedAt: createdAt,
      expiresAt: createdAt + PREVIEW_SESSION_TTL_MS,
      files: new Map(),
    };

    previewSessions.set(sessionId, session);

    res.status(201).json({
      sessionId: session.id,
      owner: session.owner,
      repo: session.repo,
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  app.put(
    "/admin/api/preview/sessions/:sessionId/file",
    requireAuth,
    (req, res) => {
      const sessionId = req.params.sessionId;
      const filePath =
        typeof req.body.path === "string" ? req.body.path : undefined;
      const content = req.body.content;

      if (!filePath || typeof content !== "object" || content === null) {
        res.status(400).json({ message: "path and content are required." });
        return;
      }

      const session = getValidPreviewSession(sessionId);

      if (!session) {
        res
          .status(404)
          .json({ message: "Preview session not found or expired." });
        return;
      }

      session.files.set(filePath, content as Record<string, unknown>);
      touchPreviewSession(session);

      res.json({
        sessionId: session.id,
        path: filePath,
        updatedAt: new Date(session.updatedAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
      });
    }
  );

  app.get(
    "/admin/api/preview/sessions/:sessionId/snapshot",
    requireAuth,
    (req, res) => {
      const sessionId = req.params.sessionId;
      const session = getValidPreviewSession(sessionId);

      if (!session) {
        res
          .status(404)
          .json({ message: "Preview session not found or expired." });
        return;
      }

      touchPreviewSession(session);

      res.json({
        sessionId: session.id,
        owner: session.owner,
        repo: session.repo,
        createdAt: new Date(session.createdAt).toISOString(),
        updatedAt: new Date(session.updatedAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        files: Array.from(session.files.entries()).map(([path, content]) => ({
          path,
          content,
        })),
      });
    }
  );

  app.delete(
    "/admin/api/preview/sessions/:sessionId",
    requireAuth,
    (req, res) => {
      previewSessions.delete(req.params.sessionId);
      res.status(204).send();
    }
  );

  app.put("/admin/api/cms-config-file", async (req, res) => {
    const filePath =
      typeof req.body.path === "string" ? req.body.path : undefined;
    const content = req.body.content;

    if (!filePath || typeof content !== "object" || content === null) {
      res.status(400).json({ message: "path and content are required." });
      return;
    }

    if (localMode) {
      try {
        const fullPath = path.join(resolvedCmsPath, filePath);
        const resolved = path.resolve(fullPath);

        if (!resolved.startsWith(resolvedCmsPath)) {
          res.status(400).json({ message: "Invalid file path." });
          return;
        }

        await fs.writeFile(resolved, JSON.stringify(content, null, 2) + "\n", "utf-8");
        res.json({ result: { path: filePath } });
      } catch (error) {
        res.status(500).json({ message: (error as Error).message });
      }

      return;
    }

    if (!getAccessToken(req)) {
      res.status(401).json({ message: "Not authenticated with GitHub." });
      return;
    }

    const owner = typeof req.body.owner === "string" ? req.body.owner : undefined;
    const repo = typeof req.body.repo === "string" ? req.body.repo : undefined;
    const message =
      typeof req.body.message === "string" && req.body.message.trim().length > 0
        ? req.body.message.trim()
        : "Update CMS config values";

    if (!owner || !repo) {
      res.status(400).json({ message: "owner and repo are required." });
      return;
    }

    const token = getAccessToken(req)!;

    try {
      const encodedPath = pathEncode(filePath);

      const existing = (await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
          repo
        )}/contents/${encodedPath}`,
        token
      )) as { sha: string };

      const putResponse = await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
          repo
        )}/contents/${encodedPath}`,
        token,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            content: Buffer.from(
              JSON.stringify(content, null, 2),
              "utf-8"
            ).toString("base64"),
            sha: existing.sha,
          }),
        }
      );

      res.json({ result: putResponse });
    } catch (error) {
      res.status((error as { status?: number }).status ?? 500).json({
        message: withGithubErrorHint((error as Error).message),
      });
    }
  });

  return app;
}
