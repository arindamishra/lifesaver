const SESSION_KEY = "session";

const moodThemes = {
  drained: {
    "--accent": "#7B8FA6",
    "--accent-soft": "#1a1f26",
    "--quote-color": "#8899aa"
  },
  okay: {
    "--accent": "#7C6FCD",
    "--accent-soft": "#16141f",
    "--quote-color": "#9988cc"
  },
  decent: {
    "--accent": "#B8975A",
    "--accent-soft": "#1c1810",
    "--quote-color": "#aa8844"
  },
  energised: {
    "--accent": "#4A9EFF",
    "--accent-soft": "#0f1620",
    "--quote-color": "#5588ff"
  },
  onfire: {
    "--accent": "#8B5CF6",
    "--accent-soft": "#120d1f",
    "--quote-color": "#9966ff"
  }
};

const moods = [
  { mood: "drained", emoji: "😴", label: "Drained" },
  { mood: "okay", emoji: "😐", label: "Okay" },
  { mood: "decent", emoji: "🙂", label: "Decent" },
  { mood: "energised", emoji: "⚡", label: "Energised" },
  { mood: "onfire", emoji: "🔥", label: "On fire" }
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getSession() {
  const today = getTodayKey();
  const fallback = {
    date: today,
    mood: "",
    moodEmoji: "",
    moodLabel: "",
    moodCheckedIn: false,
    dailyQuote: "",
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

function applyMoodTheme(mood) {
  const theme = moodThemes[mood] || moodThemes.okay;
  Object.entries(theme).forEach(([prop, value]) => {
    document.documentElement.style.setProperty(prop, value);
  });
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

async function renderMoodCheckIn() {
  const panel = document.getElementById("mood-panel");
  const question = document.getElementById("mood-question");
  const selector = document.getElementById("mood-selector");
  const session = getSession();

  selector.innerHTML = "";
  moods.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mood-option";
    button.dataset.mood = item.mood;
    button.innerHTML = `<span class="emoji">${item.emoji}</span><span>${item.label}</span>`;
    button.addEventListener("click", () => selectMood(item));
    selector.append(button);
  });

  if (session.moodCheckedIn) {
    panel.classList.add("compact");
    question.textContent = `${session.moodEmoji} ${session.moodLabel}. Got it.`;
    markSelectedMood(session.mood);
    applyMoodTheme(session.mood);
    return;
  }

  question.textContent = await generateMoodQuestion();
}

function selectMood(item) {
  const session = getSession();
  saveSession({
    ...session,
    date: getTodayKey(),
    mood: item.mood,
    moodEmoji: item.emoji,
    moodLabel: item.label,
    moodCheckedIn: true
  });
  markSelectedMood(item.mood);
  applyMoodTheme(item.mood);
  refreshQuote(false);
}

function markSelectedMood(mood) {
  document.querySelectorAll(".mood-option").forEach(button => {
    button.classList.toggle("selected", button.dataset.mood === mood);
  });
}
