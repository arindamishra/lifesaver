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

let onboardingIndex   = -1;   // -1 = welcome / landing screen
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
  onboardingIndex   = -1;   // always start at the landing screen
  renderOnboardingDots();
  renderOnboardingStep();
}

/* ── Reset and re-enter onboarding from dashboard ── */
function resetOnboarding() {
  onboardingAnswers = { ...getUserProfile() };
  onboardingIndex   = -1;
  navigate("onboarding");
  renderOnboardingDots();
  renderOnboardingStep();
}

/* ── Dots ── */
// Total visual steps = 1 landing + 4 questions + 1 ready = 6
// We map index -1 → dot 0, 0-3 → dots 1-4, 4 (ready) → dot 5
function renderOnboardingDots() {
  const dots     = document.getElementById("onboarding-dots");
  const total    = onboardingSteps.length + 2; // landing + questions + ready
  const dotIndex = onboardingIndex + 1;        // shift -1 → 0
  dots.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const dot = document.createElement("span");
    dot.classList.toggle("active", i === dotIndex);
    dots.append(dot);
  }
}

/* ── Back Navigation Helper ── */
function goBackOnboarding() {
  onboardingIndex -= 1;
  renderOnboardingStep();
}

/* ── Back Button HTML ── */
function backButtonHTML(label = "Back") {
  return `
    <button class="onboarding-back-btn" id="onboarding-back" type="button" aria-label="Go back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
      ${escapeHTML(label)}
    </button>
  `;
}

/* ── Render Step ── */
function renderOnboardingStep() {
  const track = document.getElementById("onboarding-track");
  renderOnboardingDots();

  /* ── Landing / Welcome screen (index -1) ── */
  if (onboardingIndex < 0) {
    track.innerHTML = `
      <div class="onboarding-step onboarding-landing" style="text-align:center; gap:32px;">
        <div class="landing-icon" aria-hidden="true">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent)">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div>
          <p class="eyebrow" style="margin-bottom:12px;">AI Productivity Coach</p>
          <h1 class="onboarding-question" style="font-size:clamp(2rem,9vw,4.4rem); margin-bottom:16px;">Meet<br>MOMENTUM</h1>
          <p style="color:var(--text-secondary); font-size:1rem; line-height:1.6; max-width:400px; margin:0 auto;">
            Answer 4 quick questions so your coach understands how you actually work — not how you wish you did.
          </p>
        </div>
        <ul class="ready-list" aria-label="What you'll set up" style="margin:0 auto;">
          <li>How you procrastinate</li>
          <li>When your energy peaks &amp; crashes</li>
          <li>What finally gets you moving</li>
        </ul>
        <button class="primary-button" id="onboarding-start" type="button" style="max-width:340px; margin:0 auto;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Let's Begin
        </button>
      </div>
    `;
    document.getElementById("onboarding-start").addEventListener("click", () => {
      onboardingIndex = 0;
      renderOnboardingStep();
    });
    return;
  }

  /* ── Final ready screen ── */
  if (onboardingIndex >= onboardingSteps.length) {
    track.innerHTML = `
      <div class="onboarding-step" style="text-align:center; gap:24px;">
        ${backButtonHTML()}
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
    document.getElementById("onboarding-back").addEventListener("click", goBackOnboarding);
    return;
  }

  /* ── Regular question step ── */
  const step   = onboardingSteps[onboardingIndex];
  const answer = onboardingAnswers[step.key];

  track.innerHTML = `
    <div class="onboarding-step">
      ${backButtonHTML()}
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

  // Back button
  document.getElementById("onboarding-back").addEventListener("click", goBackOnboarding);

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
