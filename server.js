/* ═══════════════════════════════════════════════════════════════
   MOMENTUM — Local Development Server
   
   Run with:  npm start
   Opens at:  http://localhost:3000
   
   Serves the frontend from /lifesaver and proxies /api/* to
   the same Express handler used by Vercel in production.
═══════════════════════════════════════════════════════════════ */

require("dotenv").config(); // loads .env into process.env

const express = require("express");
const path    = require("path");
const geminiHandler = require("./api/gemini");

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Serve /api/gemini via the same handler as Vercel ──────── */
app.use("/", geminiHandler);

/* ── Serve frontend static files ───────────────────────────── */
const frontendDir = path.join(__dirname, "lifesaver");
app.use(express.static(frontendDir));

/* ── SPA fallback — send index.html for all other routes ───── */
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🚀 MOMENTUM running at http://localhost:${PORT}`);
  console.log(`   API key loaded: ${process.env.GEMINI_KEY ? "✅ YES" : "❌ NO — add GEMINI_KEY to your .env file"}`);
  console.log(`   Press Ctrl+C to stop.\n`);
});
