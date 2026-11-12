# AgricDrone Hub admin website

The admin console as a website (React + Vite), for verifying pilots, handling reports
and sending broadcasts. It talks to the same live API as the mobile app; the server
checks the admin role on every request.

## Run locally

```bash
cd admin-web
npm install
npm run dev        # http://localhost:5173
```

The live API only answers browsers whose address is in its `CORS_ORIGINS` setting on
Render, so `http://localhost:5173` must be in that list for local sign-in to work.

## Checks

```bash
npm run build      # type-check + production build into dist/
```

## Deploy (Vercel)

- Vercel project → Root Directory `admin-web`, Framework preset **Vite**
  (build `npm run build`, output `dist`).
- Optional env var `VITE_API_URL` (defaults to the live API). It's public, so never put secrets in it.
- After the first deploy, add the site's address (e.g. `https://<name>.vercel.app`) to
  `CORS_ORIGINS` on Render, or sign-in will fail with "Can't reach AgricDrone Hub".

## Security notes

- Sessions are kept in `sessionStorage`: they end when the tab closes, and the server's
  token expires after 1 hour.
- Only accounts with the `admin` role can use the console; admins are still created
  only by the server script.
- `vercel.json` stops the site being framed and asks search engines not to index it.
