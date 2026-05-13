# Setup guide

10 minutes, one-time. Walkthrough for wiring PokéGym to your Google account.

## What you're setting up

PokéGym is a static site. It needs permission to read/write your own Google Sheets. Google's way to grant that permission without a server is an **OAuth Client ID** that you create and paste into the app. It's a public value (safe to store in the browser) — only the user who signs in can access their own data.

No API keys, no secrets, no server.

---

## 1. Google Cloud project

1. Open https://console.cloud.google.com/
2. Top bar → project dropdown → **New project**. Name it anything (e.g., `pokegym`). Click Create.
3. Wait ~10 seconds for it to provision, then make sure the new project is selected.

> If you already have a project from [pokecity](https://github.com/Mihirokte/pokecity) or similar, you can reuse it — skip this step.

## 2. Enable the APIs

1. Left nav → **APIs & Services → Library**
2. Search for **Google Sheets API** → click it → **Enable**
3. Go back, search for **Google Drive API** → **Enable**

You need both: Sheets to read/write rows, Drive to find-or-create your "PokeGym Data" spreadsheet.

## 3. Configure the OAuth consent screen

1. Left nav → **APIs & Services → OAuth consent screen**
2. **User type**: choose **External** (unless you're on a Google Workspace domain — then Internal works). Click Create.
3. Fill in:
   - **App name**: `PokeGym` (or whatever)
   - **User support email**: your email
   - **Developer contact email**: your email
4. Save & Continue through Scopes (leave defaults) and Test users.
5. **Test users** section — click **+ Add users** and add your own Google address. Until you publish the app, only these addresses can sign in.
6. Save.

> You don't need to publish the app unless you're sharing PokéGym with other people. As a test user, you'll see a "This app isn't verified" warning on first sign-in — that's expected. Click **Advanced → Go to PokeGym (unsafe)**.

## 4. Create the OAuth Client ID

1. Left nav → **APIs & Services → Credentials**
2. **+ Create credentials → OAuth client ID**
3. **Application type**: **Web application**
4. **Name**: anything (e.g., `pokegym-web`)
5. **Authorized JavaScript origins** — click **+ Add URI** for each:
   - `http://localhost:8080` (local dev)
   - `https://<your-github-username>.github.io` (GitHub Pages host — no trailing slash, no path)
6. **Authorized redirect URIs** — click **+ Add URI** for each:
   - `http://localhost:8080/pokegym/` (trailing slash!)
   - `https://<your-github-username>.github.io/pokegym/`
   > If you serve locally without a subfolder (e.g., `python -m http.server 8080 --directory pokegym`), use `http://localhost:8080/` instead.
7. **Create**. Copy the **Client ID** from the modal — it looks like `1234567890-abcdef.apps.googleusercontent.com`.

## 5. Paste it into PokéGym

1. Open your deployed site (e.g., `https://<user>.github.io/pokegym/`) or run locally (`npx serve pokegym -p 8080`).
2. On the Setup screen, paste the Client ID into the input.
3. Click **Save & Sign In**. You'll be redirected to Google.
4. Pick your account → accept the scopes (Sheets + Drive file).
5. You'll land back on PokéGym. The app creates a spreadsheet called **"PokeGym Data"** in your Drive and you're in.

## 6. Find your spreadsheet

- https://drive.google.com → search **PokeGym Data**. It's yours — rename, move, or share as you like.
- The app uses the `drive.file` scope, meaning it can only see spreadsheets it created. It **cannot** see the rest of your Drive.

---

## Troubleshooting

**"Error 400: redirect_uri_mismatch"**
The URI in your OAuth client doesn't match the URL PokéGym is running from. Look at the address bar at the moment of sign-in — that exact URL (protocol + host + path, with trailing slash) must be in Authorized redirect URIs. Edit the client, add it, wait ~30 seconds, retry.

**"Error 401: unauthorized_client"**
Check that the Client ID you pasted matches the one in Google Cloud. Also verify JavaScript origins includes your current host.

**"This app isn't verified"**
Expected — click Advanced → Go to PokeGym (unsafe). If you want to remove this warning, submit the OAuth consent screen for verification (overkill for a solo tracker).

**"Access blocked: PokeGym has not completed the Google verification process"**
Make sure you added your email as a **test user** in step 3.5. Otherwise the External app refuses non-test users.

**Spreadsheet isn't created**
Pull the DevTools console while signed in. If you see a 403 on `drive.googleapis.com`, the Drive API isn't enabled — revisit step 2. If you see a 401, re-sign-in to refresh the token.

**Sync dot is yellow (queued)**
There are writes waiting for the next online/token-valid moment. The app retries automatically every minute. Hit ↻ in the top bar to force a flush.

**I want to reset everything**
DevTools → Application → Local Storage → `https://<your-host>` → clear all keys beginning with `pokegym.`. You'll get the Setup screen again. Data in the Sheet is untouched — next sign-in it reconnects to the same spreadsheet.

---

## Privacy

- All OAuth tokens + mirrored data stay in your browser's localStorage.
- PokéGym **only** talks to `accounts.google.com`, `www.googleapis.com`, and the static site's own origin. No third-party analytics, no telemetry, no tracking.
- You can revoke access at any time: https://myaccount.google.com/permissions → PokeGym → Remove access.
