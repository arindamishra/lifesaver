/* ═══════════════════════════════════════════════════════════════
   MOMENTUM — Gemini API Proxy
   Vercel Serverless Function  |  /api/gemini

   Exported as a plain async handler (not Express) so Vercel can
   correctly detect it, apply maxDuration, and route to it.
   The API key lives ONLY here in process.env — never in the browser.
═══════════════════════════════════════════════════════════════ */

const fetch = require("node-fetch");

/* ── Retry helper with exponential backoff ─────────────────────
   Retries up to MAX_RETRIES times on transient errors.
──────────────────────────────────────────────────────────────── */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000; // 1 s → 2 s

async function fetchWithRetry(url, options, attempt = 1) {
  // AbortController covers the full response, not just the TCP connection
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000); // 25 s per attempt

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

  // Retry on transient errors
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

/* ── Vercel Serverless Handler ─────────────────────────────────
   Exported as a plain async function — Vercel detects this
   correctly and applies the maxDuration from vercel.json.
──────────────────────────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_KEY;
  if (!apiKey || apiKey === "your_google_ai_studio_key_here") {
    return res.status(500).json({
      error: "Server is missing the Gemini API key. Set GEMINI_KEY in your environment variables."
    });
  }

  const { system_instruction, contents } = req.body || {};
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
      return res.status(504).json({
        error: "The AI is taking too long to respond. Please try again."
      });
    }
    return res.status(502).json({
      error: "Could not reach the AI service. Check your connection and try again."
    });
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
    } catch { /* ignore parse errors */ }
    console.error(`Gemini error ${geminiRes.status}:`, raw.slice(0, 300));
    return res.status(geminiRes.status).json({ error: message });
  }

  const data = await geminiRes.json();
  return res.status(200).json(data);
};
