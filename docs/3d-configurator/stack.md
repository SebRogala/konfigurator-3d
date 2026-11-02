# Stack

## Frontend

- React
- three.js through React Three Fiber
- drei for helpers (controls, environment, texture loading)
- Vite as the build tool
- TypeScript as the programming language

Decided for stages 0–1; stage 0 already runs on this stack in `frontend/`.
The exact versions are in `frontend/package.json`.

## Frontend/backend split

The configurator and storefront are a frontend application, separate from the backend.
The backend is Medusa.js, used headless; stage 2 in [scope.md](scope.md) says when it arrives.
