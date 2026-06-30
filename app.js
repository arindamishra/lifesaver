const screens = {
  onboarding: document.getElementById("screen-onboarding"),
  dashboard:  document.getElementById("screen-dashboard"),
  plan:       document.getElementById("screen-plan")
};

const taskFormState = {
  importance: "medium",
  estimatedMinutes: ""
};

let loadingInterval = null;
let currentPlanState = null;

/* ── Screen Router ── */
function navigate(screenName) {
  Object.values(screens).forEach(screen => {
    screen.style.display = "none";
  });
  screens[screenName].style.display = "flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ── App Init ── */
function init() {
  wireDashboardEvents();
  const profile = getUserProfile();

  if (!profile.onboardingComplete) {
    navigate("onboarding");
    renderOnboarding();
    return;
  }

  navigate("dashboard");
  hydrateDashboard();
}

async function hydrateDashboard() {
  renderHeader();
  renderTaskFormDefaults();
  renderTasks();
  await renderMoodCheckIn();
  refreshQuote(false);
}

/* ── Header ── */
function renderHeader() {
  const now = new Date();
  document.getElementById("greeting").textContent = `Good ${getTimeOfDay()},`;
  document.getElementById("today-label").textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

/* ── Wire Dashboard Events ── */
function wireDashboardEvents() {
  const openFormBtn = document.getElementById("open-task-form");
  const taskForm    = document.getElementById("task-form");

  openFormBtn.addEventListener("click", () => {
    const isHidden = taskForm.classList.contains("hidden");
    taskForm.classList.toggle("hidden");
    openFormBtn.setAttribute("aria-expanded", String(!isHidden));
    // Rotate + icon to x when open
    openFormBtn.style.transform = isHidden ? "rotate(45deg)" : "";
    if (!isHidden) {
      openFormBtn.style.transform = "";
    }
  });

  taskForm.addEventListener("submit", handleTaskSubmit);
  document.getElementById("refresh-quote").addEventListener("click", () => handleRefreshQuote());
  document.getElementById("generate-plan").addEventListener("click", handleGeneratePlan);
  document.getElementById("open-settings").addEventListener("click", () => resetOnboarding());
  document.getElementById("back-dashboard").addEventListener("click", () => {
    stopLoadingMessages();
    navigate("dashboard");
    hydrateDashboard();
  });
  document.getElementById("voice-task").addEventListener("click", startTaskDictation);

  document.querySelectorAll(".segmented-control").forEach(group => {
    group.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      const input = group.dataset.input;
      const value = button.dataset.value;
      if (input === "importance") taskFormState.importance = value;
      if (input === "estimate")   taskFormState.estimatedMinutes = value;
      group.querySelectorAll("button").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });
}

/* ── Task Form Defaults ── */
function renderTaskFormDefaults() {
  const dateInput = document.getElementById("task-date");
  const timeInput = document.getElementById("task-time");
  const now   = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);

  dateInput.value ||= now.toISOString().slice(0, 10);
  timeInput.value ||= `${String(later.getHours()).padStart(2, "0")}:${String(later.getMinutes()).padStart(2, "0")}`;

  const importanceEl = document.querySelector('[data-input="importance"] [data-value="medium"]');
  const estimateEl   = document.querySelector('[data-input="estimate"] [data-value=""]');
  if (importanceEl) importanceEl.classList.add("selected");
  if (estimateEl)   estimateEl.classList.add("selected");
}

/* ── Task Submit ── */
async function handleTaskSubmit(event) {
  event.preventDefault();
  const errorEl = document.getElementById("task-form-error");
  const name    = document.getElementById("task-name").value.trim();
  const date    = document.getElementById("task-date").value;
  const time    = document.getElementById("task-time").value;

  if (!name || !date || !time) {
    errorEl.textContent = "Add the task name and deadline first.";
    return;
  }

  errorEl.textContent = "";
  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Adding...`;

  const task = createTaskFromForm({ name, date, time, importance: taskFormState.importance, estimatedMinutes: taskFormState.estimatedMinutes });
  addTask(task);
  renderTasks();

  // Close form smoothly
  document.getElementById("task-form").classList.add("hidden");
  document.getElementById("open-task-form").style.transform = "";
  document.getElementById("open-task-form").setAttribute("aria-expanded", "false");

  const subtitle = await generateTaskSubtitle(task);
  updateTask(task.id, { aiSubtitle: subtitle });
  renderTasks();

  event.target.reset();
  renderTaskFormDefaults();
  submitBtn.disabled = false;
  submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Task`;
}

/* ── Render Tasks ── */
function renderTasks() {
  const list        = document.getElementById("task-list");
  const doneList    = document.getElementById("done-list");
  const doneSection = document.getElementById("done-section");
  const tasks       = getTasks().sort(sortByDeadline);
  const active      = tasks.filter(task => !task.completed);
  const done        = getTodayCompletedTasks();

  list.innerHTML = active.length
    ? active.map(renderTaskCard).join("")
    : `<p class="empty-state">No tasks yet.<br>Add the thing that keeps taking up space in your head.</p>`;

  doneList.innerHTML = done.map(renderTaskCard).join("");
  document.getElementById("done-count").textContent = done.length;
  doneSection.classList.toggle("hidden", done.length === 0);

  bindTaskCardEvents();
}

/* ── Task Card HTML ── */
function renderTaskCard(task) {
  const deadlineValue = task.deadline ? task.deadline.slice(0, 16) : "";
  const isUrgent      = isDeadlineUrgent(task.deadline);

  return `
    <article
      class="task-card ${task.completed ? "done" : ""}"
      data-task-id="${task.id}"
      data-importance="${task.importance}"
      role="listitem"
    >
      <div class="task-card-header">
        <div>
          <h3>${escapeHTML(task.name)}</h3>
          <p class="task-subtitle">${escapeHTML(task.aiSubtitle || "AI insight loading...")}</p>
        </div>
        <div class="task-actions">
          ${task.completed ? "" : `
            <button type="button" data-action="done" aria-label="Mark done" title="Mark as done">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          `}
          <button type="button" data-action="delete" aria-label="Delete task" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <p class="task-meta">
        <span${isUrgent ? ' style="color:#f97316"' : ""}>${escapeHTML(formatDeadline(task.deadline))}</span>
        <span class="pill">${escapeHTML(task.importance)}</span>
        <span>${task.estimatedMinutes ? `${task.estimatedMinutes} min` : "time unknown"}</span>
      </p>

      ${task.completed ? "" : `
        <div class="task-edit hidden">
          <input type="text" data-edit="name" value="${escapeAttribute(task.name)}" aria-label="Task name" placeholder="Task name">
          <input type="datetime-local" data-edit="deadline" value="${escapeAttribute(deadlineValue)}" aria-label="Deadline">
          <select data-edit="importance" aria-label="Importance">
            ${["low", "medium", "high", "critical"]
              .map(v => `<option value="${v}" ${task.importance === v ? "selected" : ""}>${v}</option>`)
              .join("")}
          </select>
          <button class="ghost-button" type="button" data-action="save" style="font-size:0.85rem">Save changes</button>
        </div>
      `}
    </article>
  `;
}

function isDeadlineUrgent(deadline) {
  if (!deadline) return false;
  const diff = new Date(deadline) - new Date();
  return diff > 0 && diff < 1000 * 60 * 60 * 12; // within 12 hours
}

/* ── Task Card Events ── */
function bindTaskCardEvents() {
  document.querySelectorAll(".task-card").forEach(card => {
    card.addEventListener("click", event => {
      const actionBtn = event.target.closest("[data-action]");
      if (actionBtn) {
        event.stopPropagation();
        handleTaskAction(card, actionBtn.dataset.action);
        return;
      }
      // Toggle inline edit
      const edit = card.querySelector(".task-edit");
      if (edit) edit.classList.toggle("hidden");
    });
  });
}

function handleTaskAction(card, action) {
  const id = card.dataset.taskId;

  if (action === "delete") {
    card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    card.style.opacity = "0";
    card.style.transform = "translateX(-12px)";
    setTimeout(() => { deleteTask(id); renderTasks(); }, 260);
    return;
  }

  if (action === "done") {
    markTaskDone(id);
    triggerCelebration();
    renderTasks();
    return;
  }

  if (action === "save") {
    const name       = card.querySelector('[data-edit="name"]').value.trim();
    const deadline   = card.querySelector('[data-edit="deadline"]').value;
    const importance = card.querySelector('[data-edit="importance"]').value;
    if (name && deadline) {
      updateTask(id, { name, deadline, importance });
      renderTasks();
    }
  }
}

/* ── Quote ── */
async function handleRefreshQuote() {
  const btn = document.getElementById("refresh-quote");
  btn.classList.add("spinning");
  await refreshQuote(true);
  btn.classList.remove("spinning");
}

async function refreshQuote(forceRefresh) {
  const quoteEl = document.getElementById("daily-quote");
  quoteEl.style.opacity = "0.4";
  const text = await generateDailyQuote(forceRefresh);
  quoteEl.style.opacity = "1";
  quoteEl.textContent = text;
}

/* ── Generate Plan ── */
async function handleGeneratePlan() {
  const session = getSession();
  const tasks   = getTasks().filter(task => !task.completed);

  if (!session.moodCheckedIn) {
    const moodPanel = document.getElementById("mood-panel");
    moodPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    moodPanel.style.boxShadow = `0 0 0 2px var(--accent)`;
    setTimeout(() => { moodPanel.style.boxShadow = ""; }, 2000);
    document.getElementById("mood-question").textContent = "Pick your mood first so the plan actually fits you.";
    return;
  }

  if (!tasks.length) {
    document.getElementById("task-list").innerHTML =
      `<p class="empty-state">Add one real task first. The plan needs something concrete to work with.</p>`;
    return;
  }

  navigate("plan");
  showPlanLoading();
  const result = await generatePlan();
  stopLoadingMessages();

  if (!result.success) {
    renderPlanError(result.error);
    return;
  }

  currentPlanState = { plan: result.data, checked: {} };
  renderPlan(currentPlanState.plan);
}

/* ── Plan Loading ── */
function showPlanLoading() {
  document.getElementById("plan-content").classList.add("hidden");
  const loadingEl = document.getElementById("plan-loading");
  loadingEl.classList.remove("hidden");

  const messages = [
    "Reading your tasks...",
    "Checking your energy level...",
    "Understanding your mood...",
    "Building your plan...",
    "Personalising for you...",
    "Almost ready..."
  ];

  let index = 0;
  document.getElementById("loading-message").textContent = messages[index];
  loadingInterval = setInterval(() => {
    index = (index + 1) % messages.length;
    document.getElementById("loading-message").textContent = messages[index];
  }, 1800);
}

function stopLoadingMessages() {
  if (loadingInterval) clearInterval(loadingInterval);
  loadingInterval = null;
  document.getElementById("plan-loading").classList.add("hidden");
}

/* ── Plan Error ── */
function renderPlanError(message) {
  const content = document.getElementById("plan-content");
  content.classList.remove("hidden");
  content.innerHTML = `
    <div class="plan-card">
      <p class="eyebrow">Something went wrong</p>
      <h2 style="margin-top:6px">That didn't land.</h2>
      <p>${escapeHTML(message)}</p>
    </div>
    <button class="primary-button" type="button" id="retry-plan">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Try Again
    </button>
  `;
  document.getElementById("retry-plan").addEventListener("click", handleGeneratePlan);
}

/* ── Render Plan ── */
function renderPlan(plan) {
  const session    = getSession();
  const content    = document.getElementById("plan-content");
  content.classList.remove("hidden");
  const tasks      = Array.isArray(plan.tasks) ? plan.tasks.slice(0, 3) : [];
  const totalSteps = tasks.reduce((sum, t) => sum + (t.steps?.length || 0), 0);

  content.innerHTML = `
    <div class="progress-shell">
      <div class="plan-topline">
        <div class="plan-title">
          <p class="eyebrow">Your Plan</p>
          <h1>${escapeHTML(session.moodEmoji || "•")} ${escapeHTML(session.moodLabel || "Checked in")}</h1>
        </div>
        <p class="step-count" id="step-count">0 of ${totalSteps} steps done</p>
      </div>
      <div class="progress-bar" aria-label="Plan progress" role="progressbar" aria-valuemin="0" aria-valuemax="${totalSteps}" aria-valuenow="0">
        <div class="progress-fill" id="progress-fill"></div>
      </div>
    </div>

    <section class="plan-card" aria-label="Situation">
      <p class="eyebrow">Situation</p>
      <p>${escapeHTML(plan.situation || "You have enough information to begin.")}</p>
    </section>

    <section class="start-card" aria-label="Start here">
      <p class="eyebrow">Start Here →</p>
      <p>${escapeHTML(plan.startHere || "Open the most urgent task and do the first visible step.")}</p>
    </section>

    ${tasks.map((task, i) => renderPlanTask(task, i)).join("")}

    <section class="let-go-card" aria-label="Let go of">
      <p class="eyebrow">Let Go Of</p>
      <p>${escapeHTML(plan.letGoOf || "Anything that doesn't protect the next useful hour.")}</p>
    </section>

    <p class="closing-line">${escapeHTML(plan.closingLine || "Stay honest, start small, and keep moving.")}</p>

    <button class="primary-button" type="button" id="regenerate-plan" style="margin-top:8px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Regenerate Plan
    </button>
  `;

  document.querySelectorAll(".plan-step").forEach(step => {
    step.addEventListener("click", () => togglePlanStep(step));
  });
  document.getElementById("regenerate-plan").addEventListener("click", handleGeneratePlan);
  updatePlanProgress();
}

/* ── Render Single Plan Task ── */
function renderPlanTask(task, taskIndex) {
  const steps = Array.isArray(task.steps) ? task.steps : [];
  return `
    <section class="plan-task" aria-label="Task: ${escapeAttribute(task.name || "Focused task")}">
      <div class="plan-task-header">
        <div>
          <p class="eyebrow">Task ${taskIndex + 1}</p>
          <h2>${escapeHTML(task.name || "Focused task")}</h2>
        </div>
        <div class="plan-task-meta">
          <span class="pill">${escapeHTML(task.timeAllocation || "time boxed")}</span>
          <p class="countdown">${escapeHTML(getStartCountdown(task.startTime))}</p>
        </div>
      </div>

      <p class="plan-timeline">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${escapeHTML(task.startTime || "Now")} → ${escapeHTML(task.endTime || "Soon")}
      </p>

      <ol>
        ${steps.map((step, stepIndex) => `
          <li>
            <button class="plan-step" type="button" data-step-id="${taskIndex}-${stepIndex}">
              <span class="step-circle" aria-hidden="true"></span>
              <span class="step-text">${escapeHTML(step)}</span>
            </button>
          </li>
        `).join("")}
      </ol>

      <p class="plan-note">${escapeHTML(task.moodNote || "Keep this concrete and close enough to start.")}</p>
    </section>
  `;
}

/* ── Step Toggle ── */
function togglePlanStep(step) {
  const id = step.dataset.stepId;
  const wasChecked = step.classList.contains("checked");
  currentPlanState.checked[id] = !wasChecked;
  step.classList.toggle("checked", !wasChecked);
  updatePlanProgress();
}

/* ── Progress ── */
function updatePlanProgress() {
  const steps = Array.from(document.querySelectorAll(".plan-step"));
  const done  = steps.filter(s => s.classList.contains("checked")).length;
  const total = steps.length;
  const pct   = total ? (done / total) * 100 : 0;

  document.getElementById("step-count").textContent = `${done} of ${total} steps done`;

  const fill = document.getElementById("progress-fill");
  fill.style.width = `${pct}%`;

  const bar = fill.closest(".progress-bar");
  if (bar) bar.setAttribute("aria-valuenow", String(done));

  // Celebrate full completion
  if (done === total && total > 0) {
    triggerCelebration();
  }
}

/* ── Countdown ── */
function getStartCountdown(startTime) {
  if (!startTime) return "Starting now";
  const match = String(startTime).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return "Starting soon";
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period  = match[3]?.toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const now   = new Date();
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);
  const diff = start - now;

  if (diff <= 0) return "Starting now";
  const diffMins = Math.round(diff / 60000);
  if (diffMins < 60) return `Starts in ${diffMins} min`;
  return `Starts in ${Math.round(diffMins / 60)}h`;
}

/* ── Voice Dictation ── */
function startTaskDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceBtn = document.getElementById("voice-task");
  const errorEl  = document.getElementById("task-form-error");

  if (!SpeechRecognition) {
    errorEl.textContent = "Voice input is not available in this browser.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onstart = () => {
    voiceBtn.classList.add("recording");
    errorEl.textContent = "";
  };

  recognition.onresult = event => {
    document.getElementById("task-name").value = event.results[0][0].transcript;
    voiceBtn.classList.remove("recording");
  };

  recognition.onerror = () => {
    voiceBtn.classList.remove("recording");
    errorEl.textContent = "Voice didn't catch that. Type it in instead.";
  };

  recognition.onend = () => {
    voiceBtn.classList.remove("recording");
  };

  recognition.start();
}

/* ── Celebration ── */
function triggerCelebration() {
  const overlay = document.getElementById("celebrate-overlay");
  overlay.innerHTML = "";

  const colours = [
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7C6FCD",
    "#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6"
  ];

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      top: -12px;
      background: ${colours[Math.floor(Math.random() * colours.length)]};
      width: ${5 + Math.random() * 8}px;
      height: ${5 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
      animation-duration: ${1.4 + Math.random() * 1.2}s;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    overlay.appendChild(piece);
  }

  setTimeout(() => { overlay.innerHTML = ""; }, 3000);
}

/* ── DOMContentLoaded ── */
document.addEventListener("DOMContentLoaded", init);
