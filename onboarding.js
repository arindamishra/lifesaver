/* ═══════════════════════════════════════════════════════════════
   MOMENTUM — Onboarding Module
   Collects the 4-question psychological profile
═══════════════════════════════════════════════════════════════ */

const USER_PROFILE_KEY = "userProfile";

const onboardingSteps = [
  {
    key: "procrastinationType",
    headline: "You sit down to work.\n20 minutes later,\nyou've done nothing.\nWhat actually happened?",
    options: [
      "I kept switching between tasks and finished none",
      "I spent the whole time deciding what to start with",
      "My phone happened",
      "The task felt too big so I avoided it",
      "I genuinely didn't know where to begin"
    ]
  },
  {
    key: "deadlineBehaviour",
    headline: "A deadline is\n3 days away.\nWhere are you\nwith it honestly?",
    options: [
      "Haven't started — but I work fast, it's fine",
      "Panicking quietly but doing nothing about it",
      "Already halfway done, I hate last minute stress",
      "Completely forgot about it until right now"
    ]
  },
  {
    key: "energyCliff",
    headline: "By what time of day\ndoes your brain\nusually give up?",
    options: [
      "Before noon honestly",
      "Around 3pm is where I crash",
      "After dinner I'm completely done",
      "I get a second wind late at night"
    ]
  },
  {
    key: "motivationTrigger",
    headline: "You finally did that\nthing you'd been\navoiding for days.\nWhat made you start?",
    options: [
      "The deadline got close enough to scare me",
      "Someone else was counting on me",
      "I broke it into steps small enough to start",
      "I had a random burst of energy or motivation"
    ]
  }
];

let onboardingIndex   = 0;
let onboardingAnswers = {};

/* ── Profile Storage ── */
function getUserProfile() {
  return JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || "{}");
}

function saveUserProfile(profile) {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

/* ── Render Onboarding ── */
function renderOnboarding() {
  const existing    = getUserProfile();
  onboardingAnswers = { ...existing };
  onboardingIndex   = 0;
  renderOnboardingDots();
  renderOnboardingStep();
}

/* ── Dots ── */
function renderOnboardingDots() {
  const dots  = document.getElementById("onboarding-dots");
  const total = onboardingSteps.length + 1;
  dots.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const dot = document.createElement("span");
    dot.classList.toggle("active", i === onboardingIndex);
    dots.append(dot);
  }
}

/* ── Render Step ── */
function renderOnboardingStep() {
  const track = document.getElementById("onboarding-track");
  renderOnboardingDots();

  // Final ready screen
  if (onboardingIndex >= onboardingSteps.length) {
    track.innerHTML = `
      <div class="onboarding-step" style="text-align:center; gap:24px;">
        <div class="ready-icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent)">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <h1 class="onboarding-question" style="font-size:clamp(1.8rem,7vw,3.2rem)">Your coach<br>knows you now.</h1>
        <ul class="ready-list" aria-label="What was learned">
          <li>What makes you freeze</li>
          <li>When your energy peaks and crashes</li>
          <li>What finally gets you moving</li>
        </ul>
        <button class="primary-button" id="finish-onboarding" type="button" style="max-width:340px;margin:0 auto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Let's Get To Work
        </button>
      </div>
    `;
    document.getElementById("finish-onboarding").addEventListener("click", finishOnboarding);
    return;
  }

  const step   = onboardingSteps[onboardingIndex];
  const answer = onboardingAnswers[step.key];

  track.innerHTML = `
    <div class="onboarding-step">
      <h1 class="onboarding-question">${escapeHTML(step.headline).replaceAll("\n", "<br>")}</h1>
      <div class="option-grid" role="group" aria-label="Options">
        ${step.options.map(option => `
          <button
            class="option-card ${answer === option ? "selected" : ""}"
            type="button"
            data-option="${escapeAttribute(option)}"
          >${escapeHTML(option)}</button>
        `).join("")}
      </div>
      <button
        class="primary-button ${answer ? "" : "hidden"}"
        id="onboarding-next"
        type="button"
        style="max-width:340px; margin:0 auto"
      >Continue →</button>
    </div>
  `;

  // Option selection
  track.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", () => {
      onboardingAnswers[step.key] = card.dataset.option;
      track.querySelectorAll(".option-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      document.getElementById("onboarding-next").classList.remove("hidden");
    });
  });

  // Next button
  const nextBtn = document.getElementById("onboarding-next");
  nextBtn.addEventListener("click", () => {
    if (!onboardingAnswers[step.key]) return;
    onboardingIndex += 1;
    renderOnboardingStep();
  });
}

/* ── Finish Onboarding ── */
function finishOnboarding() {
  saveUserProfile({ ...onboardingAnswers, onboardingComplete: true });
  navigate("dashboard");
  hydrateDashboard();
}

/* ── Utility: HTML Escaping ── */
function escapeHTML(value) {
  return String(value)
    .replaceAll("&",  "&amp;")
    .replaceAll("<",  "&lt;")
    .replaceAll(">",  "&gt;")
    .replaceAll('"',  "&quot;")
    .replaceAll("'",  "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value).replaceAll("`", "&#096;");
}
