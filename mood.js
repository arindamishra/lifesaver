/* ═══════════════════════════════════════════════════════════════
   MOMENTUM — Mood Module
   Session management, mood check-in, and theme application
═══════════════════════════════════════════════════════════════ */

const SESSION_KEY = "session";

/* ── Mood Themes (CSS variable shifts) ── */
const moodThemes = {
  drained: {
    "--accent":       "#7B8FA6",
    "--accent-soft":  "#1a1f26",
    "--accent-dim":   "rgba(123, 143, 166, 0.14)",
    "--accent-glow":  "rgba(123, 143, 166, 0.28)",
    "--accent-rgb":   "123, 143, 166",
    "--quote-color":  "#8899aa"
  },
  okay: {
    "--accent":       "#7C6FCD",
    "--accent-soft":  "#16141f",
    "--accent-dim":   "rgba(124, 111, 205, 0.14)",
    "--accent-glow":  "rgba(124, 111, 205, 0.28)",
    "--accent-rgb":   "124, 111, 205",
    "--quote-color":  "#9988cc"
  },
  decent: {
    "--accent":       "#B8975A",
    "--accent-soft":  "#1c1810",
    "--accent-dim":   "rgba(184, 151, 90, 0.14)",
    "--accent-glow":  "rgba(184, 151, 90, 0.28)",
    "--accent-rgb":   "184, 151, 90",
    "--quote-color":  "#aa8844"
  },
  energised: {
    "--accent":       "#4A9EFF",
    "--accent-soft":  "#0f1620",
    "--accent-dim":   "rgba(74, 158, 255, 0.14)",
    "--accent-glow":  "rgba(74, 158, 255, 0.28)",
    "--accent-rgb":   "74, 158, 255",
    "--quote-color":  "#5588ff"
  },
  onfire: {
    "--accent":       "#8B5CF6",
    "--accent-soft":  "#120d1f",
    "--accent-dim":   "rgba(139, 92, 246, 0.14)",
    "--accent-glow":  "rgba(139, 92, 246, 0.28)",
    "--accent-rgb":   "139, 92, 246",
    "--quote-color":  "#9966ff"
  }
};

/* ── Mood Options ── */
const moods = [
  { mood: "drained",   emoji: "😴", label: "Drained"   },
  { mood: "okay",      emoji: "😐", label: "Okay"      },
  { mood: "decent",    emoji: "🙂", label: "Decent"    },
  { mood: "energised", emoji: "⚡", label: "Energised" },
  { mood: "onfire",    emoji: "🔥", label: "On fire"   }
];

/* ── Session Helpers ── */
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getSession() {
  const today    = getTodayKey();
  const fallback = {
    date:               today,
    mood:               "",
    moodEmoji:          "",
    moodLabel:          "",
    moodCheckedIn:      false,
    dailyQuote:         "",
    quoteGeneratedDate: ""
  };
  const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (!stored || stored.date !== today) {
    saveSession(fallback);
    return fallback;
  }
  return { ...fallback, ...stored };
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/* ── Apply Mood Theme ── */
function applyMoodTheme(mood) {
  const theme = moodThemes[mood] || moodThemes.okay;
  const root  = document.documentElement;
  Object.entries(theme).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
}

/* ── Time of Day ── */
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

/* ── Render Mood Check-In ── */
async function renderMoodCheckIn() {
  const panel    = document.getElementById("mood-panel");
  const question = document.getElementById("mood-question");
  const selector = document.getElementById("mood-selector");
  const session  = getSession();

  // Build mood buttons
  selector.innerHTML = "";
  moods.forEach(item => {
    const btn          = document.createElement("button");
    btn.type           = "button";
    btn.className      = "mood-option";
    btn.dataset.mood   = item.mood;
    btn.setAttribute("aria-label", item.label);
    btn.innerHTML      = `<span class="emoji" aria-hidden="true">${item.emoji}</span><span>${item.label}</span>`;
    btn.addEventListener("click", () => selectMood(item));
    selector.append(btn);
  });

  if (session.moodCheckedIn) {
    // Already checked in — show compact state
    question.innerHTML = `${session.moodEmoji} <strong>${session.moodLabel}</strong> — noted.`;
    markSelectedMood(session.mood);
    applyMoodTheme(session.mood);
    return;
  }

  // Show typing bubble, then load question
  question.innerHTML = `<span class="bubble-typing"><span></span><span></span><span></span></span>`;
  const text = await generateMoodQuestion();
  question.innerHTML = "";
  question.textContent = text;
}

/* ── Select Mood ── */
function selectMood(item) {
  const session = getSession();
  saveSession({
    ...session,
    date:          getTodayKey(),
    mood:          item.mood,
    moodEmoji:     item.emoji,
    moodLabel:     item.label,
    moodCheckedIn: true
  });
  markSelectedMood(item.mood);
  applyMoodTheme(item.mood);
  refreshQuote(false);
}

/* ── Mark Selected Mood Button ── */
function markSelectedMood(mood) {
  document.querySelectorAll(".mood-option").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.mood === mood);
  });
}
