# Spotify Stats Widget

> **Original widget code & layout by [@Blankiiii](https://github.com/Blankiiii)** — from [Blankiiii/Discord-Widget-Collection](https://github.com/Blankiiii/Discord-Widget-Collection/tree/main/Spotify%20Stats%20Widget)
>
> This repository is maintained by vndadev-revamped. The original TypeScript source, widget layout design, and Spotify API logic are Blankiiii's work. The GitHub Actions port, zero-dependency rewrite, and `get-refresh-token.js` helper were added on top of her original project.

---

<h1 align="center">Spotify Stats Widget</h1>
<h3 align="center">Spotify stats synced to your Discord profile — via GitHub Actions</h3>

A GitHub Actions-based Spotify stats fetcher that automatically updates a Discord application profile widget. Runs daily or manually via workflow dispatch.

> Originally a local-only TypeScript app by **Blankiiii** (ran via `start.bat` on your PC with a live HTTP server for OAuth).  
> **This version ports the same logic to GitHub Actions** so it runs in the cloud — no PC needed after setup.

---

### Architecture Change (from original)

| | Original (Blankiiii) | This version |
|---|---|---|
| **Runtime** | Your PC (long-running process) | GitHub Actions (one-shot per run) |
| **Auth** | OAuth PKCE via browser | Refresh token stored in GitHub Secrets |
| **Persistence** | Local disk (`node-persist`) | None needed (stateless) |
| **Dependencies** | TypeScript + axios + dotenv + node-persist | Zero dependencies — vanilla JS, Node 22 `fetch` |
| **Schedule** | `setInterval` in a running process | GitHub Actions cron (`0 0 */1 * *`) |

---

## What You Need to Do

You'll do **three things**, one time each.

### 1 — Get a Spotify Refresh Token (one-time browser login)

This is the only step you can't skip. Spotify requires you to log in once to authorize the app to read your stats (`user-top-read`, `user-read-recently-played`, `playlist-read-private`, `user-library-read`).

Run the included helper script on your PC **once**:

```bash
cd spotify-widget-updater
node get-refresh-token.js
```

<details>
<summary>What the script does</summary>

1. Opens a URL in your browser → you log into Spotify → click "Agree"
2. Spotify redirects to `http://127.0.0.1:8888?code=***`
3. The script captures the code, exchanges it for tokens, and **prints your `refresh_token`**
4. Copy it. That's your golden key — it never expires (unless you revoke it manually)

</details>

**You'll need your `SPOTIFY_CLIENT_ID` ready** ([get it here → Spotify Developer Dashboard](https://developer.spotify.com/dashboard)):
- Click "Create App"
- Set **Redirect URI** to: `http://127.0.0.1:8888`
- Check "Web API" under APIs used

---

### 2 — Add GitHub Secrets

Go to your forked repo → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`.

Add these 5 secrets **without quotes**, raw values only:

| Secret | Description |
|---|---|
| `SPOTIFY_CLIENT_ID` | From your [Spotify Dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_REFRESH_TOKEN` | The value printed by `get-refresh-token.js` |
| `DISCORD_TOKEN` | Your Discord bot token |
| `DISCORD_APPLICATION_ID` | Your Discord application ID |
| `DISCORD_USER_ID` | Your Discord user ID |

> ⚠️ **Do not use quotes.** Paste raw values only.

---

### 3 — Import the Widget Layout

The widget layout file is included: [`widget-layout.json`](widget-layout.json)

1. Use the [Widget Creator extension](https://discord.com/channels/603970300668805120/1520805824040013976/threads/1521122189993050183/1521122189993050183) by TheCreativeGod
2. Choose **Create new widget**, paste the contents of `widget-layout.json`
3. Complete the creation flow (captcha/2FA if prompted)
4. Copy the new Application ID and Bot Token into your GitHub Secrets

> This file defines the layout and data bindings. It does NOT contain any credentials. The Node.js script provides the live data.

---

### 4 — Run the workflow

Go to `Actions` → `Update Spotify Widget` → `Run workflow`.

Check the logs for:
- ✅ Token exchange successful
- ✅ Spotify data fetched
- ✅ Stats calculated
- ✅ Discord widget updated

---

## Automatic Updates

Runs daily:

```yaml
0 0 */1 * *
```

---

## What It Shows

Each run fetches and displays:

- **Display name** + profile picture
- **Followers** & **Public Playlists**
- **Current Obsession** — your #1 short-term track
- **Heavy Rotation** — your #1 short-term artist
- **All-Time Favourite** — your #1 long-term artist
- **Soundtrack of My Life** — your #1 long-term track
- **Yesterday's Vibe** — minutes listened in the last 24h
- **Library Size** — total saved tracks

---

## Local Testing

Want to test locally before pushing?

```bash
# Set env vars in your terminal first, then:
node spotify-widget.js
```

---

## Disclaimer

- Discord widgets are **not real-time**. This updates every 24 hours.
- Your Spotify refresh token gives read-only access to your profile & listening history. It does not control playback.
- Never commit `.env` files or hardcode secrets.

---

## Credits

- **Original project:** [Blankiiii/Discord-Widget-Collection](https://github.com/Blankiiii/Discord-Widget-Collection/tree/main/Spotify%20Stats%20Widget) by [@Blankiiii](https://github.com/Blankiiii)
- **GitHub Actions port & zero-dependency rewrite:** vndadev-revamped
- **Widget Extension:** [TheCreativeGod/Discord-Widgets-Extension](https://github.com/TheCreativeGod/Discord-Widgets-Extension)
