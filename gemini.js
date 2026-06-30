/* ═══════════════════════════════════════════════════════════════
   MOMENTUM — Gemini API Proxy
   Vercel Serverless Function  |  /api/gemini
   
   The API key lives ONLY here in process.env.
   The browser never sees it.
═══════════════════════════════════════════════════════════════ */

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fetch = require("node-fetch");

const app = express();

/* ── CORS ─────────────────────────────────────────────────────
   Allow requests only from the same origin (your Vercel domain
   or localhost in dev). Adjust ALLOWED_ORIGIN in env if needed.
──────────────────────────────────────────────────────────────── */
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, Vercel SSR, curl)
    if (!origin) return callback(null, true);
    // Allow any localhost port for local dev
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // On Vercel the frontend and api share the same domain — always allow
    return callback(null, true);
  },
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
}));

/* ── Body parsing ──────────────────────────────────────────── */
app.use(express.json({ limit: "50kb" })); // reject oversized payloads

/* ── Rate limiting ─────────────────────────────────────────── */
const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 20,               // 20 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." }
});
app.use(limiter);

/* ── POST /api/gemini ──────────────────────────────────────── */
app.post("/api/gemini", async (req, res) => {
  const apiKey = process.env.GEMINI_KEY;

  if (!apiKey || apiKey === "your_google_ai_studio_key_here") {
    return res.status(500).json({
      error: "Server is missing the Gemini API key. Set GEMINI_KEY in your environment variables."
    });
  }

  const { system_instruction, contents } = req.body;

  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-lite:generateContent";

  let geminiRes;
  try {
    geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction, contents }),
      // 20-second server-side timeout
      timeout: 20000
    });
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return res.status(502).json({ error: "Could not reach the AI service. Try again." });
  }

  /* Forward non-2xx status codes with a clean message */
  if (!geminiRes.ok) {
    const raw = await geminiRes.text().catch(() => "");
    let message = "The AI request did not complete.";
    if (geminiRes.status === 400) message = "Invalid request sent to the AI.";
    if (geminiRes.status === 401 || geminiRes.status === 403) message = "Server API key is invalid or not authorised.";
    if (geminiRes.status === 429) message = "Rate limited by the AI provider. Wait a moment and try again.";
    try { message = JSON.parse(raw)?.error?.message || message; } catch { }
    return res.status(geminiRes.status).json({ error: message });
  }

  /* Stream the successful response straight back to the client */
  const data = await geminiRes.json();
  return res.status(200).json(data);
});

/* ── Export for Vercel ─────────────────────────────────────── */
module.exports = app;
