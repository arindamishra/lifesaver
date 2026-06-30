/* ═══════════════════════════════════════════════════════════════
   MOMENTUM — Tasks Module
   CRUD operations for tasks, deadline formatting
═══════════════════════════════════════════════════════════════ */

const TASKS_KEY = "tasks";

/* ── Storage ── */
function getTasks() {
  return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

/* ── CRUD ── */
function addTask(task) {
  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);
}

function updateTask(taskId, updates) {
  const tasks = getTasks().map(t => t.id === taskId ? { ...t, ...updates } : t);
  saveTasks(tasks);
}

function deleteTask(taskId) {
  saveTasks(getTasks().filter(t => t.id !== taskId));
}

function markTaskDone(taskId) {
  updateTask(taskId, {
    completed:   true,
    completedAt: new Date().toISOString()
  });
}

/* ── Sorting ── */
function sortByDeadline(a, b) {
  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
}

/* ── Deadline Formatting ── */
function formatDeadline(value) {
  if (!value) return "No deadline";
  const date     = new Date(value);
  const now      = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const time      = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const sameDay   = date.toDateString() === now.toDateString();
  const nextDay   = date.toDateString() === tomorrow.toDateString();
  const diffMs    = date - startOfDay(now);
  const diffDays  = Math.ceil(diffMs / 86400000);
  const isPast    = date < now;

  if (isPast)    return `Overdue — ${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
  if (sameDay)   return `Tonight ${time}`;
  if (nextDay)   return `Tomorrow ${time}`;
  if (diffDays <= 7) return `In ${diffDays} days`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/* ── Build Task from Form State ── */
function createTaskFromForm(formState) {
  return {
    id:               Date.now().toString(),
    name:             formState.name.trim(),
    deadline:         `${formState.date}T${formState.time}`,
    importance:       formState.importance || "medium",
    estimatedMinutes: formState.estimatedMinutes ? Number(formState.estimatedMinutes) : null,
    aiSubtitle:       "",
    completed:        false,
    addedAt:          new Date().toISOString()
  };
}

/* ── Today's Completed Tasks ── */
function getTodayCompletedTasks() {
  const today = getTodayKey();
  return getTasks().filter(t => t.completed && t.completedAt?.slice(0, 10) === today);
}
