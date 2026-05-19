# Ryoko Production Setup

## 1. Supabase
1. Create a free project at Supabase.
2. Open SQL Editor and run `t working prop`.
3. Go to Project Settings -> API.
4. Copy:
   - Project URL -> `REACT_APP_SUPABASE_URL`
   - anon public key -> `REACT_APP_SUPABASE_ANON_KEY`
5. Keep the service role key private. Do not put it in frontend env.

## 2. Google Login Through Supabase
1. In Google Cloud, create or select a project.
2. Go to Google Auth Platform / OAuth clients.
3. Configure OAuth consent for app name `Ryoko`.
4. Create a Web application client.
5. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - your production PWA URL when ready
6. In Supabase Auth -> Providers -> Google, copy the Supabase callback URL.
7. Add that callback URL to Google authorized redirect URIs.
8. Paste Google Client ID and Client Secret into Supabase Google provider settings.
9. In Supabase Auth -> URL Configuration:
   - Site URL: your production PWA URL, for example `https://your-app.vercel.app`
   - Redirect URLs: add both `http://localhost:3000/auth/callback` and `https://your-app.vercel.app/auth/callback`

## 3. Frontend Env
Create `frontend/.env.local`:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_PUBLIC_URL=http://localhost:3000
REACT_APP_LOCAL_FIRST=true
```

`REACT_APP_LOCAL_FIRST=true` keeps the offline/local API shim active while Supabase Auth and sync are layered in.

For Vercel production, set:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_PUBLIC_URL=https://your-app.vercel.app
REACT_APP_LOCAL_FIRST=true
```

Do not deploy production with `REACT_APP_PUBLIC_URL=http://localhost:3000`; Google/Supabase OAuth will redirect mobile users back to localhost after sign-in.

## 4. Server-side Gmail import
Run the latest `supabase/schema.sql` in Supabase SQL Editor so `gmail_connections` and `gmail_import_jobs` exist.

Add these Vercel environment variables for production:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GMAIL_TOKEN_ENCRYPTION_KEY=generate-a-long-random-secret
```

The Google OAuth consent screen must include `https://www.googleapis.com/auth/gmail.readonly`. The app requests `access_type=offline` and `prompt=consent` so Supabase can return a Google refresh token for server-side Gmail scans.

## 4. Flight API
For the first free-tier provider, create an Aviationstack account and get an API key.

Add it only to backend env:

```env
AVIATIONSTACK_KEY=your-key
```

Never add this key to frontend env.

## 5. PDF Samples
Create a local folder outside the repo or a private shared folder with 20-50 redacted samples. Keep visible:

- airline
- flight number
- route
- date/time
- ticket layout
- barcode region if possible

Hide:

- passport numbers
- full ticket numbers if sensitive
- payment details
- loyalty IDs
- full address

PDF parsing will be improved against these samples. Ryoko cannot guarantee 100% extraction across all airlines without a review step.
