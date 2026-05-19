# Ryoko Free-First PWA Notes

Ryoko now runs as a local-first public beta by default.

## Runtime Model

- No backend is required for the PWA beta.
- Flights, parsed ticket artifacts, profile settings, analytics snapshots, and imports are stored in IndexedDB.
- Analytics are cached and recomputed after ledger mutations or from Settings.
- Google OAuth and paid flight enrichment are disabled in the default PWA path.

## Free Services

- Host the `build/` folder on Cloudflare Pages free tier.
- Use bundled airport data from `src/data/airports.js`.
- Use browser-side ZXing, BCBP parsing, PDF.js, and Tesseract.js for ingestion.

## Production Environment

No secrets are required for the local-first beta.

Optional environment variables:

```bash
REACT_APP_LOCAL_FIRST=true
REACT_APP_BACKEND_URL=http://localhost:8001
```

Set `REACT_APP_LOCAL_FIRST=false` only when intentionally restoring backend API mode.

## Deployment

```bash
npm install --legacy-peer-deps
npm run build
```

Deploy `frontend/build` to Cloudflare Pages. The `_headers`, `manifest.json`, and `sw.js` files are copied into the build by CRA.

## Before Public Beta

- Replace `support@example.com` in `public/privacy.html` and `public/support.html`.
- Test install/offline behavior on iPhone Safari and Android Chrome.
- Collect real redacted ticket samples to improve parser coverage.
