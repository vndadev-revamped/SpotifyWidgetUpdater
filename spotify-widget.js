// Spotify → Discord Widget Updater
// Runs in GitHub Actions — one-shot script, no local persistence
//
// Prerequisites (one-time manual setup):
//   1. Get SPOTIFY_REFRESH_TOKEN (see README for instructions)
//   2. Add it + DISCORD secrets to GitHub Secrets
//
// This script:
//   1. Exchanges SPOTIFY_REFRESH_TOKEN for an access token
//   2. Fetches your Spotify profile + stats from 8 endpoints
//   3. Builds the Discord widget payload
//   4. PATCHes your Discord application profile widget

// ── Environment Variables ──────────────────────────────────────────

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_REFRESH_TOKEN,
  DISCORD_TOKEN,
  DISCORD_APPLICATION_ID,
  DISCORD_USER_ID,
} = process.env;

// ── Validation ─────────────────────────────────────────────────────

const requiredSecrets = [
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_REFRESH_TOKEN",
  "DISCORD_TOKEN",
  "DISCORD_APPLICATION_ID",
  "DISCORD_USER_ID",
];

for (const secret of requiredSecrets) {
  if (!process.env[secret]) {
    throw new Error(`Missing secret: ${secret}`);
  }
}

// ── Logging ────────────────────────────────────────────────────────

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// ── Spotify Access Token ───────────────────────────────────────────

async function getSpotifyAccessToken() {
  log("Exchanging refresh token for access token...");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN,
      client_id: SPOTIFY_CLIENT_ID,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Spotify token exchange failed (${res.status}): ${text}`
    );
  }

  const data = await res.json();
  return data.access_token;
}

// ── Fetch helper ───────────────────────────────────────────────────

async function spotifyFetch(token, path) {
  const res = await fetch(`https://api.spotify.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Spotify API ${path} failed (${res.status}): ${text.slice(0, 200)}`
    );
  }

  return res.json();
}

// ── Discord widget update ──────────────────────────────────────────

async function updateDiscordWidget(payload) {
  log("Updating Discord widget...");

  const res = await fetch(
    `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/users/${DISCORD_USER_ID}/identities/0/profile`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent":
          "DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${res.status}: ${text}`);
  }

  log("Discord widget updated.");
}

// ── MAIN ───────────────────────────────────────────────────────────

async function main() {
  // 1. Get access token
  const token = await getSpotifyAccessToken();
  log("Access token obtained.");

  // 2. Fetch all data in parallel from Spotify
  log("Fetching Spotify profile data...");

  const [
    user,
    playlists,
    topArtistsShort,
    topTracksShort,
    topArtistsLong,
    topTracksLong,
    recent,
    library,
  ] = await Promise.all([
    spotifyFetch(token, "me"),
    spotifyFetch(token, "me/playlists?limit=50"),
    spotifyFetch(token, "me/top/artists?limit=5&time_range=short_term"),
    spotifyFetch(token, "me/top/tracks?limit=5&time_range=short_term"),
    spotifyFetch(token, "me/top/artists?limit=1&time_range=long_term"),
    spotifyFetch(token, "me/top/tracks?limit=1&time_range=long_term"),
    spotifyFetch(token, "me/player/recently-played?limit=50"),
    spotifyFetch(token, "me/tracks?limit=1"),
  ]);

  // 3. Calculate stats
  log("Calculating statistics...");

  const userName = user.display_name ?? "Unknown";
  const imgUrl = user.images?.[0]?.url ?? "";
  const followerCount = user.followers?.total ?? 0;

  const myUserId = user.id;
  const publicPlaylistCount =
    playlists.items?.filter(
      (p) => p.public && p.owner?.id === myUserId
    ).length ?? 0;

  const obsessionTrack = topTracksShort.items?.[0];
  const currentObsession = obsessionTrack
    ? `${obsessionTrack.name} — ${obsessionTrack.artists?.[0]?.name ?? "Unknown"}`
    : "None";

  const heavyRotation = topArtistsShort.items?.[0]?.name ?? "None";
  const allTimeFavourite = topArtistsLong.items?.[0]?.name ?? "None";

  const lifeTrack = topTracksLong.items?.[0];
  const soundtrackOfMyLife = lifeTrack
    ? `${lifeTrack.name} — ${lifeTrack.artists?.[0]?.name ?? "Unknown"}`
    : "None";

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentPlaytimeMs = (recent.items ?? [])
    .filter((item) => item && new Date(item.played_at).getTime() > oneDayAgo)
    .reduce((sum, item) => sum + (item.track?.duration_ms ?? 0), 0);

  const minutesListened = Math.round(recentPlaytimeMs / 60000);
  const yesterdaysVibe = `${minutesListened} Minutes`;

  const librarySize =
    typeof library.total === "number"
      ? `${library.total.toLocaleString()} Songs`
      : "0 Songs";

  // 4. Console summary
  log("─────────────────────────────");
  log(`User: ${userName}`);
  log(`Followers: ${followerCount}`);
  log(`Public Playlists: ${publicPlaylistCount}`);
  log(`Current Obsession: ${currentObsession}`);
  log(`Heavy Rotation: ${heavyRotation}`);
  log(`All-Time Favourite: ${allTimeFavourite}`);
  log(`Soundtrack of My Life: ${soundtrackOfMyLife}`);
  log(`Yesterday's Vibe: ${yesterdaysVibe}`);
  log(`Library: ${librarySize}`);
  log("─────────────────────────────");

  // 5. Build widget payload
  log("Building widget payload...");

  const widget = {
    username: userName,
    data: {
      dynamic: [
        { type: 3, name: "ImgUrl", value: { url: imgUrl } },
        { type: 1, name: "userName", value: userName },
        { type: 2, name: "followerCount", value: followerCount },
        { type: 2, name: "publicPlaylistCount", value: publicPlaylistCount },
        { type: 1, name: "currentObsession", value: currentObsession },
        { type: 1, name: "heavyRotation", value: heavyRotation },
        { type: 1, name: "allTimeFavourite", value: allTimeFavourite },
        { type: 1, name: "soundtrackOfMyLife", value: soundtrackOfMyLife },
        { type: 1, name: "yesterdaysVibe", value: yesterdaysVibe },
        { type: 1, name: "librarySize", value: librarySize },
      ],
    },
  };

  log("Widget payload:");
  console.log(JSON.stringify(widget, null, 2));

  // 6. Push to Discord
  await updateDiscordWidget(widget);

  log("Spotify widget update completed successfully.");
}

main()
  .then(() => log("Finished successfully."))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
