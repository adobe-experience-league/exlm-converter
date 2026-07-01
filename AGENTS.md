# EXLM Converter — Agent Guide

Adobe I/O Runtime (App Builder) project that implements **Bring Your Own Markup (BYOM)** for Adobe Experience League on Edge Delivery Services. When EDS preview/publish invokes the converter, it routes by URL path, fetches content from the EXL API or AEM, transforms it, and returns HTML.

For human-oriented onboarding, see [README.md](README.md).

## Architecture

```
src/
  converter/              # main/convert — BYOM entry point
    index.js              # Path-based render() dispatcher
    renderers/            # render-doc, render-aem, render-playlist, render-landing, ...
    modules/              # MD→HTML, blocks, schemas, API clients, utils
    static/fragments/     # i18n header/footer HTML (en, de, fr, ...)
  khoros/                 # Community/Gainsight proxy action
  tocs/                   # TOC HTML via EXL API
  files/                  # File upload/download (presigned URLs)
  coveo/                  # Coveo search token action
  publish/                # HLX preview-then-publish (non-web action)
build/
  build.js                # esbuild bundle → dist/
  serve.js                # Local dev: watch + nodemon
  express.js              # Express wrapper on port 3030
app.config.yaml           # Runtime manifest (6 actions, nodejs:18)
```

**Data flow:**

```
Browser → HLX/EDS → converter (this repo) → EXL API / AEM → HTML
```

**Converter routing** (`src/converter/index.js`): docs, playlists, TOCs, slides, landing, on-demand events → EXL API; fragments → static HTML; default → AEM (`render-aem.js`). Schema.org JSON-LD is injected in converter renderers (e.g. playlists).

## Commands

```bash
npm run build           # esbuild all actions to dist/
npm run serve           # Local dev at http://localhost:3030 (loads build/.local.env)
npm run deploy          # aio app deploy
npm run quality         # format:check + lint (CI gate)
npm run test            # instant-mocha (test/**/*.test.js)
npm run setup:skills    # Install/update App Builder agent skills
```

**Requirements:** Node **18** (see [.nvmrc](.nvmrc) and `app.config.yaml` runtime `nodejs:18`).

## Environment

Local dev uses `build/.local.env` (gitignored). Minimum for docs/playlists:

```
EXL_API_HOST=https://experienceleague.adobe.com
```

For AEM pages, add `AEM_AUTHOR_URL`, `OWNER`, `REPO`, `BRANCH`, `ACCESS_TOKEN`. See [README.md](README.md) for khoros, coveo-token, and full variable tables.

**Feature flags:** Set via GitHub environment → `FEATURE_FLAGS` input in `app.config.yaml` (comma-separated). Examples: `playlists-v2`, `schema-org-playlist`, `schema-org`.

## Scope

This repo owns **server-side** BYOM conversion only:

- HTML transformation and routing in Runtime actions
- Schema.org JSON-LD injection in converter renderers
- EXL API / AEM content fetch and feature-flag-driven behavior

Do **not** add browser-side block decoration, player UX, or client scripts here — that belongs outside this converter.

### Playlist pages and schema.org

- **Renderer:** `src/converter/renderers/render-playlist.js` — if `playlists-v2`, fetch v2 HTML; if `schema-org-playlist`, inject `buildPlaylistSchema` into `<head>` as `exl-schema-org-jsonld`
- **Schema builder:** `src/converter/modules/schemas/builders/playlist-schema.js`

Verify schema in **view-source `<head>`** (`id="exl-schema-org-jsonld"`) on converter output (`localhost:3030` or deployed `.../main/convert/en/playlists/{id}`), not `<code>` blocks in `<main>`.

## Pull requests

- Base branches: `main`, `develop`, `stage`
- Run `npm run quality` before opening a PR; CI runs the same via [.github/workflows/quality-action.yaml](.github/workflows/quality-action.yaml)
- Deployments: [.github/workflows/deploy-action.yaml](.github/workflows/deploy-action.yaml) (branch → environment)

## AI Skills Setup

This project ships with App Builder skills for AI coding agents (Claude Code, Cursor, Copilot, etc.) pinned in [skills-lock.json](skills-lock.json). Restore them after cloning:

```bash
npx skills experimental_install
```

To update skills to the latest versions run `npm run setup:skills`, which re-runs the install and updates `skills-lock.json`.

Agent skills install to `.agents/skills/` (universal format — works in Claude Code, Cursor, Codex, etc.):

| Skill                          | Purpose                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `appbuilder-project-init`      | Bootstrap App Builder projects and manifest conventions |
| `appbuilder-action-scaffolder` | Scaffold, implement, deploy, and debug Runtime actions  |
| `appbuilder-testing`           | Jest/mocha unit and integration tests for actions       |
| `appbuilder-cicd-pipeline`     | Configure CI/CD pipelines (GitHub Actions, etc.)        |

## Security

- Do not commit secrets (API keys, tokens, Vault credentials, `.env`, `build/.local.env`)
- Runtime actions may be publicly reachable — validate inputs and avoid leaking internal data in responses
