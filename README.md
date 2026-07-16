# Spotify Stats Widget

> **Original widget code & layout by [@Blankiiii](https://github.com/Blankiiii)** — from [Blankiiii/Discord-Widget-Collection](https://github.com/Blankiiii/Discord-Widget-Collection/tree/main/Spotify%20Stats%20Widget)
>
> This repo is maintained by **vndadev-revamped**. The original TypeScript source, widget layout design, and Spotify API logic are Blankiiii's work. The GitHub Actions port, zero-dependency rewrite, and `get-refresh-token.js` helper were added on top of her project.

---

<h1 align="center">Spotify Stats Widget</h1>
<h3 align="center">Your Spotify stats on your Discord profile — updated daily via GitHub Actions</h3>

A GitHub Actions-based script that fetches your Spotify profile stats and pushes them to your Discord application profile widget. Runs automatically every 24 hours or manually whenever you want.

> The original project by **Blankiiii** required the script to run continuously on your PC with a local HTTP server for OAuth login.  
> **This version runs entirely on GitHub's cloud** — no PC, no process, no dependencies. Set it up once and forget about it.

---

## How it works (in plain terms)

```
Every 24 hours:
  GitHub wakes up → runs the script → gets your Spotify stats → updates your Discord profile → goes back to sleep
```

You don't need to keep anything running. It's just a file on GitHub that executes on schedule.

---

## Architecture change (from original)

| | Original (Blankiiii) | This version |
|---|---|---|
| **Runtime** | Your PC (process runs forever) | GitHub Actions (single run, then exits) |
| **Authentication** | OAuth PKCE via browser every time | Refresh token stored once in GitHub Secrets |
| **Storage** | Local disk (`node-persist`) | None (stateless) |
| **Dependencies** | TypeScript + axios + dotenv + node-persist | Zero — vanilla JS, Node 22 `fetch` |
| **Schedule** | `setInterval` in a running process | GitHub Actions cron (`0 0 */1 * *`) |

---

## Setup Guide (4 steps, one-time only)

### Step 1 — Fork this repository

Click the **Fork** button on GitHub (top-right corner of this page).

Clone it to your PC if you want (step 2 needs it locally for a moment):

```bash
git clone https://github.com/YOUR_USERNAME/SpotifyWidgetUpdater.git
cd SpotifyWidgetUpdater
```

### Step 2 — Get your Spotify refresh token

This is the only step you need your PC for, and only once. Spotify requires you to log in through a browser to authorize the app to read your listening stats.

**Prerequisite:** Create a Spotify app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard):
1. Click **Create App**
2. Set **Redirect URI** to: `http://127.0.0.1:8888`
3. Check **Web API** under APIs used
4. Copy your **Client ID** — you'll need it next

Now run the helper script:

```bash
set SPOTIFY_CLIENT_ID=your_client_id_here   (Windows CMD)
# or: $env:SPOTIFY_CLIENT_ID="your_client_id_here"   (PowerShell)

node get-refresh-token.js
```

<details>
<summary>What happens when you run it</summary>

1. It prints a URL — open it in your browser
2. Log into Spotify and click **Agree**
3. Spotify redirects to a locally hosted page that confirms success
4. The terminal prints your **refresh token** — copy it carefully

</details>

> Your refresh token **never expires** (unless you revoke it manually from your Spotify account). You only need to do this once.

### Step 3 — Add GitHub Secrets

Go to your forked repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add these 5 secrets **exactly as they are, without any quotes**:

| Secret name | What to put |
|---|---|
| `SPOTIFY_CLIENT_ID` | Your Client ID from the Spotify Dashboard |
| `SPOTIFY_REFRESH_TOKEN` | The token printed by `get-refresh-token.js` |
| `DISCORD_TOKEN` | Your Discord bot token |
| `DISCORD_APPLICATION_ID` | Your Discord application ID |
| `DISCORD_USER_ID` | Your Discord user ID |

> Do NOT wrap values in quotes. Do NOT use `{}` placeholders. Paste the raw string.

### Step 4 — Create the widget in Discord

> This step is important: the widget identity must be initialized through Discord's widget system before the bot token can update it. Doing it manually or only importing the layout JSON won't work.

Use the [Widget Creator extension](https://github.com/TheCreativeGod/Discord-Widgets-Extension) by TheCreativeGod:

1. Install the extension and go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click the **Widget Creator** button (bottom-right corner)
3. Paste the **entire contents** of [`widget-layout.json`](widget-layout.json) into the JSON box
4. Select **+ Create new widget** from the dropdown
5. Click **Start** and complete any captcha or 2FA prompts
6. Once it finishes, go to the newly created app → **Bot** → **Reset Token**
7. Copy the new **Application ID** and **Bot Token**
8. Update `DISCORD_APPLICATION_ID` and `DISCORD_TOKEN` in your GitHub Secrets with these new values

> The `widget-layout.json` file only defines how the widget looks. It contains no credentials. The script provides the live data.

---

## First run

Go to your repo → **Actions** → **Update Spotify Widget** → **Run workflow**.

Check the logs — you should see:

- Token exchange successful
- Spotify data fetched
- Stats calculated
- Discord widget updated
- Finished successfully

---

## Automatic updates

The workflow runs every day at midnight UTC:

```yaml
schedule:
  - cron: "0 0 */1 * *"
```

You can also trigger it manually anytime with the **Run workflow** button.

---

## What the widget shows

| Field | Source |
|---|---|
| Display name + profile picture | Your Spotify profile |
| Followers | Your Spotify follower count |
| Public Playlists | Number of public playlists you own |
| Current Obsession | Your #1 track (short term) |
| Heavy Rotation | Your #1 artist (short term) |
| All-Time Favourite | Your #1 artist (long term) |
| Soundtrack of My Life | Your #1 track (long term) |
| Yesterday's Vibe | Minutes you listened in the last 24 hours |
| Library Size | Total saved tracks |

---

## How this works — the pattern

This approach works for any service that gives you an API with a long-lived token or key:

```
[Your data source] → [Script on GitHub] → [GitHub Actions cron] → [Your Discord widget]
```

| Ingredient | What it is |
|---|---|
| A script | Single `.js` file that fetches data, builds a payload, PATCHes Discord |
| A workflow file | `.github/workflows/update-widget.yml` — tells GitHub when and how to run |
| GitHub Secrets | Your private tokens, never exposed in the code |
| A schedule | The `cron` line that triggers automatic runs |

You can apply this pattern to any data source as long as it supports API key or refresh token auth. Weather, YouTube stats, crypto prices, etc.

---

## Local testing

```bash
# Set all 5 env vars in your terminal, then:
node spotify-widget.js
```

---

## License & sharing

You're free to use, modify, and share this project as long as you give credit:

- **Original project:** [Blankiiii](https://github.com/Blankiiii) for the widget code, layout, and Spotify API logic
- **GitHub Actions adaptation:** [vndadev-revamped](https://github.com/vndadev-revamped) for the cloud port, zero-dependency rewrite, and helper script

---

## Credits

- **Original project:** [Blankiiii/Discord-Widget-Collection](https://github.com/Blankiiii/Discord-Widget-Collection/tree/main/Spotify%20Stats%20Widget) by [@Blankiiii](https://github.com/Blankiiii)
- **GitHub Actions port:** [vndadev-revamped](https://github.com/vndadev-revamped)
- **Widget Extension:** [TheCreativeGod/Discord-Widgets-Extension](https://github.com/TheCreativeGod/Discord-Widgets-Extension)

---

## Disclaimer

- Discord widgets are **not real-time**. Updates happen every 24 hours.
- Your Spotify refresh token is **read-only**. It cannot control playback or modify your account.
- Never commit `.env` files or hardcode secrets in source code.
