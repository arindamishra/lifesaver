/* ═══════════════════════════════════════════════════════════════
   MOMENTUM — Local Development Server

   Run with:  npm start
   Opens at:  http://localhost:3000

   Serves the frontend from /lifesaver and proxies /api/gemini
   to the same handler used by Vercel in production.
═══════════════════════════════════════════════════════════════ */

require("dotenv").config(); // loads .env into process.env

const express = require("express");
const path    = require("path");
const geminiHandler = require("./api/gemini");

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Parse JSON bodies before the handler sees them ────────── */
app.use(express.json({ limit: "50kb" }));

/* ── Proxy /api/gemini to the serverless handler ───────────── */
app.post("/api/gemini", (req, res) => geminiHandler(req, res));
app.options("/api/gemini", (req, res) => geminiHandler(req, res));

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
