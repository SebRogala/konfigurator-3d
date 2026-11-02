# Deploy

Production runs on Coolify v4. Coolify builds `frontend/Dockerfile` directly; the compose files in the repo root are for local dev only.

## Frontend (Coolify application)

| Setting | Value | Where in the UI |
|---------|-------|-----------------|
| Build pack | Dockerfile | creation screen |
| Base directory | `/frontend` | creation screen |
| Dockerfile location | `/Dockerfile` (relative to the base directory) | Build pipeline |
| Docker Build Stage Target | `prod` | Build pipeline |
| Watch Paths | `frontend/**` | not yet verified |
| Ports Exposes | `8080` | Access → Edit Networking |
| Disable Build Cache | unchecked | Advanced |
| Domain | `https://…`; Coolify issues the TLS certificate via Let's Encrypt | Access → Manage Domains |

UI locations were observed on Coolify 4.3; check them on newer versions. Watch Paths keeps pushes that touch only other directories from redeploying the frontend.

Build cache: a deploy triggered through the Coolify API must send `force` as a JSON boolean in the POST body (`{"uuid": "…", "force": false}`) or leave it out. A `force=false` query string turned every build into a `--no-cache` build up to Coolify 4.1.x.

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
