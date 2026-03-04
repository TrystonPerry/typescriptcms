# TypeScript CMS Workspace

This repository now has two packages:

- `packages/library`: core TypeScript CMS plugin and example usage
- `packages/admin`: Vue-based admin UI for GitHub auth, repo selection, folder browsing, and CMS config editing

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Run the admin UI:

```bash
npm run dev:admin
```

3. Run the library example app:

```bash
npm run dev:library
```

## Admin OAuth setup

Create an OAuth App in GitHub and set callback URL to:

- `http://localhost:5174/auth/github/callback` when using `conductor:run`
- `http://localhost:8787/auth/github/callback` when using `npm run dev:admin`

Then copy `packages/admin/.env.example` to `packages/admin/.env` and fill in the credentials.

Important: this project currently expects a **GitHub OAuth App** token flow.
If you configure a GitHub App instead, you must grant `Contents: Read and write`
permissions and reinstall/re-authorize, or saves will fail with
`Resource not accessible by integration`.

## Conductor Worktree Setup

This repo now includes a `conductor.json` file plus two worktree scripts:

- `scripts/conductor-setup.zsh`: dependency install + admin env bootstrap
- `scripts/conductor-run.zsh`: starts admin API, admin UI, and library UI together

Run locally the same way Conductor does:

```bash
npm run conductor:setup
npm run conductor:run
```

The run script is Conductor-aware and uses `CONDUCTOR_PORT` as the base:

- admin UI: `${CONDUCTOR_PORT}/admin`
- admin API: `${CONDUCTOR_PORT + 1}`
- library UI: `${CONDUCTOR_PORT + 2}`

If you run outside Conductor, default ports are:

- admin UI: `http://localhost:5173/admin`
- admin API: `http://localhost:5174`
- library UI: `http://localhost:5175`
