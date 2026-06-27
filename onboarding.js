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
      "Haven't started, but I work fast, it's fine",
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

let onboardingIndex = 0;
let onboardingAnswers = {};

function getUserProfile() {
  return JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || "{}");
}

function saveUserProfile(profile) {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

function renderOnboarding() {
  const existing = getUserProfile();
  onboardingAnswers = { ...existing };
  onboardingIndex = 0;
  renderOnboardingDots();
  renderOnboardingStep();
}

function renderOnboardingDots() {
  const dots = document.getElementById("onboarding-dots");
  dots.innerHTML = "";
  const total = onboardingSteps.length + 1;
  for (let index = 0; index < total; index += 1) {
    const dot = document.createElement("span");
    dot.classList.toggle("active", index === onboardingIndex);
    dots.append(dot);
  }
}

function renderOnboardingStep() {
  const track = document.getElementById("onboarding-track");
  renderOnboardingDots();

  if (onboardingIndex >= onboardingSteps.length) {
    track.innerHTML = `
      <div class="onboarding-step">
        <div class="ready-icon">⚡</div>
        <h1 class="onboarding-question">Your coach knows you now.</h1>
        <ul class="ready-list">
          <li>• What makes you freeze</li>
          <li>• When your energy peaks and crashes</li>
          <li>• What finally gets you moving</li>
        </ul>
        <button class="primary-button" id="finish-onboarding" type="button">Let's Get To Work →</button>
      </div>
    `;
    document.getElementById("finish-onboarding").addEventListener("click", finishOnboarding);
    return;
  }

  const step = onboardingSteps[onboardingIndex];
  const answer = onboardingAnswers[step.key];
  track.innerHTML = `
    <div class="onboarding-step">
      <h1 class="onboarding-question">${escapeHTML(step.headline).replaceAll("\n", "<br>")}</h1>
      <div class="option-grid">
        ${step.options.map(option => `
          <button class="option-card ${answer === option ? "selected" : ""}" type="button" data-option="${escapeAttribute(option)}">
            ${escapeHTML(option)}
          </button>
        `).join("")}
      </div>
      <button class="primary-button ${answer ? "" : "hidden"}" id="onboarding-next" type="button">Next</button>
    </div>
  `;

  track.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", () => {
      onboardingAnswers[step.key] = card.dataset.option;
      track.querySelectorAll(".option-card").forEach(item => item.classList.remove("selected"));
      card.classList.add("selected");
      document.getElementById("onboarding-next").classList.remove("hidden");
    });
  });

  document.getElementById("onboarding-next").addEventListener("click", () => {
    onboardingIndex += 1;
    renderOnboardingStep();
  });
}

function finishOnboarding() {
  saveUserProfile({
    ...onboardingAnswers,
    onboardingComplete: true
  });
  navigate("dashboard");
  hydrateDashboard();
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value).replaceAll("`", "&#096;");
}
