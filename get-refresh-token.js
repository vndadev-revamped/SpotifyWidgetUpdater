// ──────────────────────────────────────────────────────────────────
// get-refresh-token.js
//
// Run ONCE to obtain your Spotify refresh token.
// This token goes into GitHub Secrets and never expires
// (unless you revoke access from your Spotify account).
//
// Usage:
//   node get-refresh-token.js
//
// Prerequisites:
//   1. Create a Spotify app at https://developer.spotify.com/dashboard
//   2. Add redirect URI: http://127.0.0.1:8080
//   3. Set SPOTIFY_CLIENT_ID in your terminal or .env file
//
// What happens:
//   1. Opens your browser to Spotify login
//   2. You authorize the app
//   3. Spotify redirects to localhost with a code
//   4. This script captures it, exchanges for tokens
//   5. Prints your SPOTIFY_REFRESH_TOKEN → COPY IT
// ──────────────────────────────────────────────────────────────────

const http = require("http");
const { randomBytes, createHash } = require("crypto");

// ── Config ────────────────────────────────────────────────────────

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;

if (!CLIENT_ID) {
  console.error(
    "ERROR: SPOTIFY_CLIENT_ID is not set.\n" +
      "Set it in your terminal first:\n" +
      '  set SPOTIFY_CLIENT_ID=your_client_id_here    (Windows cmd)\n' +
      '  $env:SPOTIFY_CLIENT_ID="your_client_id_here" (PowerShell)\n' +
      "Then run this script again."
  );
  process.exit(1);
}

const REDIRECT_URI = "http://127.0.0.1:8888";
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-read-recently-played",
  "user-library-read",
  "playlist-read-private",
].join(" ");

// ── PKCE helpers ──────────────────────────────────────────────────

function generateCodeVerifier() {
  return randomBytes(64)
    .toString("base64url")
    .slice(0, 128);
}

function generateCodeChallenge(verifier) {
  return createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

// ── Main flow ─────────────────────────────────────────────────────

async function main() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Build authorization URL
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: REDIRECT_URI,
  }).toString();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║        Spotify Refresh Token Helper                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("👉 Open this URL in your browser:");
  console.log("");
  console.log(authUrl.toString());
  console.log("");

  // Start a local server to receive the callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

      // Serve favicon silently
      if (url.pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }

      const authCode = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          `<h1>Error</h1><p>Spotify returned: ${error}</p><p>Close this tab and try again.</p>`
        );
        server.close();
        reject(new Error(`Spotify auth error: ${error}`));
        return;
      }

      if (authCode) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
          <body style="font-family:system-ui,sans-serif;text-align:center;margin-top:80px;background:#191414;color:#fff">
            <h1 style="color:#1DB954">✓ Authorized!</h1>
            <p>You can close this tab now.</p>
            <p>Check your terminal for the refresh token.</p>
          </body>
          </html>
        `);
        server.close();
        resolve(authCode);
        return;
      }

      res.writeHead(404);
      res.end("No code found in URL.");
    });

    server.listen(8888, "127.0.0.1", () => {
      console.log("⏳ Waiting for Spotify callback...");
      console.log("   (If the browser doesn't open automatically, copy the URL above)");
      console.log("");
    });
  });

  // Exchange code for tokens
  console.log("🔑 Exchanging authorization code for tokens...");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error(`Token exchange failed: ${tokenRes.status}`);
    console.error(errText);
    process.exit(1);
  }

  const data = await tokenRes.json();

  if (!data.refresh_token) {
    console.error("ERROR: Spotify did not return a refresh token.");
    console.error("Response:", JSON.stringify(data, null, 2));
    console.error(
      "This can happen if you've already authorized this app before.\n" +
        "Try revoking access at https://www.spotify.com/account/apps/ and run this script again."
    );
    process.exit(1);
  }

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ SUCCESS! Here is your refresh token:                    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────────────┐");
  console.log(`  │ ${data.refresh_token} │`);
  console.log("  └─────────────────────────────────────────────────────────┘");
  console.log("");
  console.log("📋 COPY the token above and add it as a GitHub Secret:");
  console.log("   Name:  SPOTIFY_REFRESH_TOKEN");
  console.log("");
  console.log("   Go to: Settings → Secrets and variables → Actions → New repository secret");
  console.log("");
  console.log("⚠️  Keep this token secret! It gives read access to your Spotify data.");
  console.log("   It does NOT expire (unless you revoke it manually).");
  console.log("");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
