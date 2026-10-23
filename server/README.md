# AgriDrone API

Express and TypeScript REST API foundation. The API is versioned under
`/api/v1`. Database, authentication and marketplace routes are not part of
this foundation stage.

## Requirements

- Node.js 22.13 or newer
- npm 11

## Setup and commands

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

`GET /api/v1/health` reports process liveness. `GET /api/v1/ready` returns
HTTP 503 until approved database readiness checks are implemented.

Set `CORS_ORIGINS` to a comma-separated list of trusted browser origins.
Native mobile requests do not require a browser CORS origin.
