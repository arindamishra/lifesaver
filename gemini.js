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
app.set("trust proxy", 1);

/* ── CORS ──────────────────────────────────────────────────── */
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(null, true);
  },
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
}));

/* ── Body parsing ──────────────────────────────────────────── */
app.use(express.json({ limit: "50kb" }));

/* ── Rate limiting ─────────────────────────────────────────── */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." }
});
app.use(limiter);

/* ── Retry helper with exponential backoff ─────────────────── */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry(url, options, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw Object.assign(new Error("Request timed out after 25 s"), { isTimeout: true });
    }
    throw err;
  }
  clearTimeout(timer);

  if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
    const retryAfter = parseInt(response.headers.get("retry-after") || "0", 10);
    const delay = retryAfter > 0
      ? retryAfter * 1000
      : BASE_DELAY_MS * Math.pow(2, attempt - 1);
    console.warn(`Gemini returned ${response.status}. Retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})…`);
    await new Promise(r => setTimeout(r, delay));
    return fetchWithRetry(url, options, attempt + 1);
  }

  return response;
}

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
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

  let geminiRes;
  try {
    geminiRes = await fetchWithRetry(
      `${GEMINI_URL}?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_instruction, contents })
      }
    );
  } catch (err) {
    console.error("Gemini fetch error:", err);
    if (err.isTimeout) {
      return res.status(504).json({ error: "The AI is taking too long to respond. Please try again." });
    }
    return res.status(502).json({ error: "Could not reach the AI service. Check your connection and try again." });
  }

  if (!geminiRes.ok) {
    const raw = await geminiRes.text().catch(() => "");
    let message = "The AI request did not complete. Please try again in a few seconds.";
    if (geminiRes.status === 400) message = "Invalid request sent to the AI.";
    if (geminiRes.status === 401 || geminiRes.status === 403) message = "Server API key is invalid or not authorised.";
    if (geminiRes.status === 429) message = "AI service is busy. Please wait 30 seconds and try again.";
    if (geminiRes.status === 500) message = "The AI service encountered an internal error. Please try again.";
    if (geminiRes.status === 503) message = "The AI service is temporarily unavailable. Please try again shortly.";
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch { /* ignore */ }
    console.error(`Gemini error ${geminiRes.status}:`, raw.slice(0, 300));
    return res.status(geminiRes.status).json({ error: message });
  }

  const data = await geminiRes.json();
  return res.status(200).json(data);
});

/* ── Export for Vercel ─────────────────────────────────────── */
module.exports = app;
