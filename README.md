# TypeScript CMS Workspace

This repository contains three packages:

- `packages/library`: plugin-only package that generates TypeScript files from CMS `*.config.json` specs
- `packages/admin`: Vue admin UI for GitHub auth, repo browsing, CMS editing, and preview session APIs
- `packages/example`: React example app that consumes generated CMS data and demonstrates preview injection

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Run admin UI:

```bash
npm run dev:admin
```

3. Run example app:

```bash
npm run dev:example
```

## Admin OAuth setup

Create a GitHub OAuth App with callback URL:

- `http://localhost:5174/auth/github/callback` when using `conductor:run`
- `http://localhost:8787/auth/github/callback` when using `npm run dev:admin`

Then copy `packages/admin/.env.example` to `packages/admin/.env` and set your credentials.

## Conductor setup

This repo includes `conductor.json` plus:

- `scripts/conductor-setup.zsh`
- `scripts/conductor-run.zsh`

Run locally with:

```bash
npm run conductor:setup
npm run conductor:run
```

With `CONDUCTOR_PORT` as base:

- admin UI: `${CONDUCTOR_PORT}/admin`
- admin API: `${CONDUCTOR_PORT + 1}`
- example app: `${CONDUCTOR_PORT + 2}`

Outside Conductor defaults:

- admin UI: `http://localhost:5500/admin`
- admin API: `http://localhost:5174`
- example app: `http://localhost:5173`

## Preview injection mode

`/admin` creates an ephemeral preview session and streams unsaved `.config.json` drafts to the preview API.
The example app loads drafts through `?previewSession=<sessionId>` and overlays draft `value` fields at runtime.
