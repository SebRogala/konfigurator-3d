FROM node:24.22.2-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Local dev: source is bind-mounted over /app; node_modules stays in the image
# (anonymous volume in docker-compose.yml).
FROM deps AS dev
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY . .
RUN npm run build

# Runs as the unprivileged nginx user (UID 101), so it listens on 8080.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24 AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
