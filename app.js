const screens = {
  onboarding: document.getElementById("screen-onboarding"),
  dashboard: document.getElementById("screen-dashboard"),
  plan: document.getElementById("screen-plan")
};

const taskFormState = {
  importance: "medium",
  estimatedMinutes: ""
};

let loadingInterval = null;
let currentPlanState = null;

function navigate(screenName) {
  Object.values(screens).forEach(screen => {
    screen.style.display = "none";
  });
  screens[screenName].style.display = "flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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

function renderHeader() {
  const now = new Date();
  document.getElementById("greeting").textContent = `Good ${getTimeOfDay()},`;
  document.getElementById("today-label").textContent = `Today is ${now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric"
  })}`;
}

function wireDashboardEvents() {
  document.getElementById("open-task-form").addEventListener("click", () => {
    document.getElementById("task-form").classList.toggle("hidden");
  });

  document.getElementById("task-form").addEventListener("submit", handleTaskSubmit);
  document.getElementById("refresh-quote").addEventListener("click", () => refreshQuote(true));
  document.getElementById("generate-plan").addEventListener("click", handleGeneratePlan);
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
      if (input === "estimate") taskFormState.estimatedMinutes = value;
      group.querySelectorAll("button").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });
}

function renderTaskFormDefaults() {
  const date = document.getElementById("task-date");
  const time = document.getElementById("task-time");
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);

  date.value ||= now.toISOString().slice(0, 10);
  time.value ||= `${String(later.getHours()).padStart(2, "0")}:${String(later.getMinutes()).padStart(2, "0")}`;

  document.querySelector('[data-input="importance"] [data-value="medium"]').classList.add("selected");
  document.querySelector('[data-input="estimate"] [data-value=""]').classList.add("selected");
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  const error = document.getElementById("task-form-error");
  const name = document.getElementById("task-name").value.trim();
  const date = document.getElementById("task-date").value;
  const time = document.getElementById("task-time").value;

  if (!name || !date || !time) {
    error.textContent = "Add the task name and deadline first.";
    return;
  }

  error.textContent = "";
  const submit = event.target.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Adding...";

  const task = createTaskFromForm({
    name,
    date,
    time,
    importance: taskFormState.importance,
    estimatedMinutes: taskFormState.estimatedMinutes
  });
  addTask(task);
  renderTasks();

  const subtitle = await generateTaskSubtitle(task);
  updateTask(task.id, { aiSubtitle: subtitle });
  renderTasks();

  event.target.reset();
  renderTaskFormDefaults();
  submit.disabled = false;
  submit.textContent = "Add Task";
}

function renderTasks() {
  const list = document.getElementById("task-list");
  const doneList = document.getElementById("done-list");
  const doneSection = document.getElementById("done-section");
  const tasks = getTasks().sort(sortByDeadline);
  const active = tasks.filter(task => !task.completed);
  const done = getTodayCompletedTasks();

  list.innerHTML = active.length
    ? active.map(renderTaskCard).join("")
    : `<p class="empty-state">No tasks yet. Add the thing that keeps taking up space in your head.</p>`;

  doneList.innerHTML = done.map(renderTaskCard).join("");
  document.getElementById("done-count").textContent = done.length;
  doneSection.classList.toggle("hidden", done.length === 0);

  bindTaskCardEvents();
}

function renderTaskCard(task) {
  const deadlineValue = task.deadline ? task.deadline.slice(0, 16) : "";
  return `
    <article class="task-card ${task.completed ? "done" : ""}" data-task-id="${task.id}" data-importance="${task.importance}">
      <div class="task-card-header">
        <div>
          <h3>${escapeHTML(task.name)}</h3>
          <p class="task-subtitle">${escapeHTML(task.aiSubtitle || "AI note is warming up...")}</p>
        </div>
        <div class="task-actions">
          ${task.completed ? "" : `<button type="button" data-action="done" aria-label="Mark done">✓</button>`}
          <button type="button" data-action="delete" aria-label="Delete task">x</button>
        </div>
      </div>
      <p class="task-meta">
        <span>${escapeHTML(formatDeadline(task.deadline))}</span>
        <span class="pill">${escapeHTML(task.importance)}</span>
        <span>${task.estimatedMinutes ? `${task.estimatedMinutes} min` : "time unknown"}</span>
      </p>
      ${task.completed ? "" : `
        <div class="task-edit hidden">
          <input type="text" data-edit="name" value="${escapeAttribute(task.name)}" aria-label="Task name">
          <input type="datetime-local" data-edit="deadline" value="${escapeAttribute(deadlineValue)}" aria-label="Deadline">
          <select data-edit="importance" aria-label="Importance">
            ${["low", "medium", "high", "critical"].map(value => `<option value="${value}" ${task.importance === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
          <button class="ghost-button" type="button" data-action="save">Save changes</button>
        </div>
      `}
    </article>
  `;
}

function bindTaskCardEvents() {
  document.querySelectorAll(".task-card").forEach(card => {
    card.addEventListener("click", event => {
      const actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        handleTaskAction(card, actionButton.dataset.action);
        return;
      }

      const edit = card.querySelector(".task-edit");
      if (edit) edit.classList.toggle("hidden");
    });
  });
}

function handleTaskAction(card, action) {
  const id = card.dataset.taskId;
  if (action === "delete") {
    deleteTask(id);
    renderTasks();
    return;
  }

  if (action === "done") {
    markTaskDone(id);
    document.body.classList.add("celebrate");
    setTimeout(() => document.body.classList.remove("celebrate"), 720);
    renderTasks();
    return;
  }

  if (action === "save") {
    const name = card.querySelector('[data-edit="name"]').value.trim();
    const deadline = card.querySelector('[data-edit="deadline"]').value;
    const importance = card.querySelector('[data-edit="importance"]').value;
    if (name && deadline) {
      updateTask(id, { name, deadline, importance });
      renderTasks();
    }
  }
}

async function refreshQuote(forceRefresh) {
  const quote = document.getElementById("daily-quote");
  quote.textContent = "Finding the right words for today...";
  quote.textContent = await generateDailyQuote(forceRefresh);
}

async function handleGeneratePlan() {
  const session = getSession();
  const tasks = getTasks().filter(task => !task.completed);

  if (!session.moodCheckedIn) {
    document.getElementById("mood-panel").scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("mood-question").textContent = "Pick your mood first so the plan actually fits you.";
    return;
  }

  if (!tasks.length) {
    document.getElementById("task-list").innerHTML = `<p class="empty-state">Add one real task first. The plan needs something concrete to work with.</p>`;
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

  currentPlanState = {
    plan: result.data,
    checked: {}
  };
  renderPlan(currentPlanState.plan);
}

function showPlanLoading() {
  document.getElementById("plan-content").classList.add("hidden");
  document.getElementById("plan-loading").classList.remove("hidden");
  const messages = [
    "Reading your tasks...",
    "Checking your energy level...",
    "Building your plan...",
    "Almost ready..."
  ];
  let index = 0;
  document.getElementById("loading-message").textContent = messages[index];
  loadingInterval = setInterval(() => {
    index = (index + 1) % messages.length;
    document.getElementById("loading-message").textContent = messages[index];
  }, 1500);
}

function stopLoadingMessages() {
  if (loadingInterval) clearInterval(loadingInterval);
  loadingInterval = null;
  document.getElementById("plan-loading").classList.add("hidden");
}

function renderPlanError(message) {
  const content = document.getElementById("plan-content");
  content.classList.remove("hidden");
  content.innerHTML = `
    <div class="plan-card">
      <h2>That did not land.</h2>
      <p>${escapeHTML(message)}</p>
    </div>
    <button class="primary-button" type="button" id="retry-plan">Regenerate Plan</button>
  `;
  document.getElementById("retry-plan").addEventListener("click", handleGeneratePlan);
}

function renderPlan(plan) {
  const session = getSession();
  const content = document.getElementById("plan-content");
  content.classList.remove("hidden");
  const tasks = Array.isArray(plan.tasks) ? plan.tasks.slice(0, 3) : [];
  const totalSteps = tasks.reduce((sum, task) => sum + (task.steps?.length || 0), 0);

  content.innerHTML = `
    <div class="progress-shell">
      <div class="plan-topline">
        <div class="plan-title">
          <p class="eyebrow">Your Plan</p>
          <h1>${session.moodEmoji || "•"} ${escapeHTML(session.moodLabel || "Checked in")}</h1>
        </div>
        <p class="step-count" id="step-count">0 of ${totalSteps} steps done</p>
      </div>
      <div class="progress-bar" aria-hidden="true"><div class="progress-fill" id="progress-fill"></div></div>
    </div>

    <section class="plan-card">
      <p class="eyebrow">Situation</p>
      <p>${escapeHTML(plan.situation || "You have enough information to begin.")}</p>
    </section>

    <section class="start-card">
      <p class="eyebrow">Start Here →</p>
      <p>${escapeHTML(plan.startHere || "Open the most urgent task and do the first visible step.")}</p>
    </section>

    ${tasks.map((task, taskIndex) => renderPlanTask(task, taskIndex)).join("")}

    <section class="let-go-card">
      <p class="eyebrow">Let Go Of</p>
      <p>${escapeHTML(plan.letGoOf || "Anything that does not protect the next useful hour.")}</p>
    </section>

    <p class="closing-line">${escapeHTML(plan.closingLine || "Stay honest, start small, and keep moving.")}</p>
    <button class="primary-button" type="button" id="regenerate-plan">Regenerate Plan</button>
  `;

  document.querySelectorAll(".plan-step").forEach(step => {
    step.addEventListener("click", () => togglePlanStep(step));
  });
  document.getElementById("regenerate-plan").addEventListener("click", handleGeneratePlan);
  updatePlanProgress();
}

function renderPlanTask(task, taskIndex) {
  const steps = Array.isArray(task.steps) ? task.steps : [];
  return `
    <section class="plan-task">
      <div class="plan-task-header">
        <div>
          <p class="eyebrow">Task ${taskIndex + 1}</p>
          <h2>${escapeHTML(task.name || "Focused task")}</h2>
        </div>
        <div>
          <span class="pill">${escapeHTML(task.timeAllocation || "time boxed")}</span>
          <p class="countdown">${escapeHTML(getStartCountdown(task.startTime))}</p>
        </div>
      </div>
      <p class="task-meta">${escapeHTML(task.startTime || "Now")} → ${escapeHTML(task.endTime || "Soon")}</p>
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

function togglePlanStep(step) {
  const id = step.dataset.stepId;
  currentPlanState.checked[id] = !currentPlanState.checked[id];
  step.classList.toggle("checked", currentPlanState.checked[id]);
  updatePlanProgress();
}

function updatePlanProgress() {
  const steps = Array.from(document.querySelectorAll(".plan-step"));
  const done = steps.filter(step => step.classList.contains("checked")).length;
  const total = steps.length;
  document.getElementById("step-count").textContent = `${done} of ${total} steps done`;
  document.getElementById("progress-fill").style.width = total ? `${(done / total) * 100}%` : "0%";
}

function getStartCountdown(startTime) {
  if (!startTime) return "Starting now";
  const match = String(startTime).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return "Starting soon";
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const now = new Date();
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);
  const diff = start - now;
  if (diff <= 0) return "Starting now";
  const diffMinutes = Math.round(diff / 60000);
  if (diffMinutes < 60) return `Starts in ${diffMinutes} min`;
  return `Starts in ${Math.round(diffMinutes / 60)} hours`;
}

function startTaskDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById("task-form-error").textContent = "Voice input is not available in this browser.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onresult = event => {
    document.getElementById("task-name").value = event.results[0][0].transcript;
  };
  recognition.onerror = () => {
    document.getElementById("task-form-error").textContent = "Voice input did not catch that. Type it in instead.";
  };
  recognition.start();
}

document.addEventListener("DOMContentLoaded", init);
