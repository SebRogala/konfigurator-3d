# Deploy

Production runs on Coolify v4 at `https://konfigurator-3d.sebrogala.dev`. Coolify builds `frontend/Dockerfile` from `main` and redeploys on every push to `main` that touches `frontend/`; there is no GitHub Actions workflow. The compose files in the repo root are for local dev only.

## Frontend (Coolify application)

Resource `konfigurator-3d-frontend`, created as **Private Repository (with GitHub App)**, branch `main`.

| Setting | Value | Where in the UI |
|---------|-------|-----------------|
| Build strategy | Dockerfile | General → Build & deploy |
| Base directory | `/frontend` | General → Build & deploy |
| Dockerfile location | `/Dockerfile`, relative to the base directory (UI shows "Resolved file: `/frontend/Dockerfile`") | General → Build & deploy |
| Watch paths | `frontend/**` | General → Build & deploy |
| Docker build stage target | `prod` | General → Build & deploy |
| Exposed ports | `8080` | General → Access → Edit Networking |
| Domain | `https://konfigurator-3d.sebrogala.dev`; Let's Encrypt certificate issued by Coolify | Domains |
| Redirect HTTP to HTTPS | Enabled | Domains → Redirects |
| Auto deploy | Deploy on push (webhooks) | Advanced → Build & deploy → Deployment |
| Build cache | Use Docker build cache | Advanced → Build & deploy |
| Gzip compression | Enabled | Advanced → Proxy |

UI locations observed on Coolify 4.5.3. Check that the "Resolved file" line reads `/frontend/Dockerfile` before the first deploy: the first deploy here failed with `failed to read dockerfile: open Dockerfile: no such file or directory` until the base directory was entered again. Coolify adds the generated sslip.io domain and a `www.` domain on creation; remove both. Watch paths keeps pushes that touch only other directories (docs, this file) from redeploying the frontend.

Build cache, for a later API-triggered deploy: the call must send `force` as a JSON boolean in the POST body (`{"uuid": "…", "force": false}`) or leave it out. A `force=false` query string turned every build into a `--no-cache` build up to Coolify 4.1.x.

The `prod` target builds the Vite app and serves `dist/` with unprivileged nginx on port 8080: gzip, SPA fallback to `index.html`, `index.html` sent with `no-cache`, hashed files under `/assets/` cached for a year as immutable. The image's `HEALTHCHECK` requests `/`, and Coolify waits for it.

Local check of the production image:

```bash
docker build --target prod -t konfigurator-frontend:prod frontend
docker run --rm -p 8088:8080 konfigurator-frontend:prod
```

## Local dev

With the shared infra stack (Traefik on the external `infra` network), from the repo root:

```bash
docker compose up -d --build   # https://konfigurator.dev.localhost
```

Without it, a standalone stack publishes the Vite dev server on localhost only:

```bash
docker compose -f docker-compose.standalone.yml up -d --build   # http://localhost:5173
```

`node_modules` lives in an anonymous volume, so after a `package.json` or `package-lock.json` change, recreate it: add `-V` (`docker compose up -d --build -V`, with `-f docker-compose.standalone.yml` for the standalone stack).
