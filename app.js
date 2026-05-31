const STORAGE_KEYS = {
  events: "cooperdash.events",
  tasks: "cooperdash.tasks",
  quickLog: "cooperdash.quickLog",
  links: "cooperdash.links",
  theme: "cooperdash.theme",
  focus: "cooperdash.focus",
};

const eventForm = document.getElementById("eventForm");
const eventDateInput = document.getElementById("eventDate");
const eventTitleInput = document.getElementById("eventTitle");
const eventSubmit = document.getElementById("eventSubmit");
const eventList = document.getElementById("eventList");

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");

const quickLog = document.getElementById("quickLog");
const clock = document.getElementById("clock");
const dateMeta = document.getElementById("dateMeta");
const greeting = document.getElementById("greeting");

const themeToggle = document.getElementById("themeToggle");

const focusDisplay = document.getElementById("focusDisplay");
const focusProgress = document.getElementById("focusProgress");
const focusDurationInput = document.getElementById("focusDuration");
const focusDurationLabel = document.getElementById("focusDurationLabel");
const focusStart = document.getElementById("focusStart");
const focusPause = document.getElementById("focusPause");
const focusReset = document.getElementById("focusReset");

const statTasks = document.getElementById("statTasks");
const statCompleted = document.getElementById("statCompleted");
const statNextEvent = document.getElementById("statNextEvent");

const linkForm = document.getElementById("linkForm");
const linkTitleInput = document.getElementById("linkTitle");
const linkUrlInput = document.getElementById("linkUrl");
const linkList = document.getElementById("linkList");

const DEFAULT_FOCUS_MINUTES = 25;

let events = loadState(STORAGE_KEYS.events, []);
let tasks = loadState(STORAGE_KEYS.tasks, []);
let links = loadState(STORAGE_KEYS.links, []);
let editingEventId = null;
let focusState = normalizeFocusState(loadState(STORAGE_KEYS.focus, null));
let focusInterval = null;

function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : parsed;
  } catch {
    return fallback;
  }
}

function saveState(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

function updateGreeting() {
  if (!greeting) return;
  const hour = new Date().getHours();
  let message = "Welcome back";
  if (hour < 12) message = "Good morning";
  else if (hour < 18) message = "Good afternoon";
  else message = "Good evening";
  greeting.textContent = `${message}.`;
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  if (themeToggle) {
    themeToggle.textContent = `Theme: ${theme === "dark" ? "Dark" : "Light"}`;
  }
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  applyTheme(saved || "dark");
}

function normalizeFocusState(raw) {
  const base = {
    duration: DEFAULT_FOCUS_MINUTES,
    remaining: DEFAULT_FOCUS_MINUTES * 60,
    endTime: null,
    isRunning: false,
  };

  if (!raw || typeof raw !== "object") return base;

  const duration = Number(raw.duration);
  const remaining = Number(raw.remaining);
  const endTime = typeof raw.endTime === "number" ? raw.endTime : null;
  const isRunning = Boolean(raw.isRunning);

  return {
    duration: Number.isFinite(duration) && duration > 0 ? duration : base.duration,
    remaining: Number.isFinite(remaining) && remaining >= 0 ? remaining : base.remaining,
    endTime,
    isRunning,
  };
}

function saveFocusState() {
  saveState(STORAGE_KEYS.focus, focusState);
}

function updateFocusDisplay() {
  if (!focusDisplay) return;
  const total = focusState.duration * 60;
  const remaining = Math.max(0, focusState.remaining);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  focusDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (focusProgress) {
    const percent = total > 0 ? ((total - remaining) / total) * 100 : 0;
    focusProgress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }

  if (focusDurationLabel) {
    focusDurationLabel.textContent = `${focusState.duration} min`;
  }

  if (focusDurationInput) {
    focusDurationInput.value = focusState.duration;
    focusDurationInput.disabled = focusState.isRunning;
  }

  if (focusStart && focusPause) {
    focusStart.disabled = focusState.isRunning;
    focusPause.disabled = !focusState.isRunning;
  }
}

function beginFocusInterval() {
  if (focusInterval) return;
  focusInterval = setInterval(tickFocus, 1000);
}

function stopFocusInterval() {
  if (!focusInterval) return;
  clearInterval(focusInterval);
  focusInterval = null;
}

function tickFocus() {
  if (!focusState.isRunning || !focusState.endTime) return;
  const remaining = Math.max(0, Math.ceil((focusState.endTime - Date.now()) / 1000));
  focusState.remaining = remaining;

  if (remaining <= 0) {
    focusState.isRunning = false;
    focusState.endTime = null;
    stopFocusInterval();
  }

  saveFocusState();
  updateFocusDisplay();
}

function startFocusTimer() {
  if (focusState.isRunning) return;
  if (focusState.remaining <= 0) {
    focusState.remaining = focusState.duration * 60;
  }
  focusState.isRunning = true;
  focusState.endTime = Date.now() + focusState.remaining * 1000;
  saveFocusState();
  beginFocusInterval();
  updateFocusDisplay();
}

function pauseFocusTimer() {
  if (!focusState.isRunning) return;
  focusState.remaining = Math.max(0, Math.ceil((focusState.endTime - Date.now()) / 1000));
  focusState.isRunning = false;
  focusState.endTime = null;
  saveFocusState();
  stopFocusInterval();
  updateFocusDisplay();
}

function resetFocusTimer() {
  focusState.isRunning = false;
  focusState.endTime = null;
  focusState.remaining = focusState.duration * 60;
  saveFocusState();
  stopFocusInterval();
  updateFocusDisplay();
}

function initializeFocusTimer() {
  if (focusState.isRunning && focusState.endTime) {
    focusState.remaining = Math.max(0, Math.ceil((focusState.endTime - Date.now()) / 1000));
    if (focusState.remaining <= 0) {
      focusState.isRunning = false;
      focusState.endTime = null;
    }
  }

  if (focusState.isRunning) {
    beginFocusInterval();
  }

  updateFocusDisplay();
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isSafeUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function getLinkDomain(value) {
  try {
    const { hostname } = new URL(value);
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function renderLinks() {
  if (!linkList) return;
  linkList.innerHTML = "";

  if (!links.length) {
    const empty = document.createElement("li");
    empty.textContent = "No links yet.";
    linkList.appendChild(empty);
    return;
  }

  links.forEach((link) => {
    const item = document.createElement("li");
    item.dataset.id = link.id;

    const main = document.createElement("div");
    main.className = "item-main";

    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = link.title;

    const domain = document.createElement("span");
    domain.className = "link-domain";
    domain.textContent = getLinkDomain(link.url);

    const textWrap = document.createElement("div");
    textWrap.className = "link-text";
    textWrap.append(anchor, domain);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Remove";
    deleteBtn.addEventListener("click", () => {
      links = links.filter((entry) => entry.id !== link.id);
      saveState(STORAGE_KEYS.links, links);
      renderLinks();
    });

    actions.append(deleteBtn);
    main.append(textWrap);
    item.append(main, actions);
    linkList.appendChild(item);
  });
}

function renderEvents() {
  eventList.innerHTML = "";
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  if (!sorted.length) {
    const empty = document.createElement("li");
    empty.textContent = "No milestones yet.";
    eventList.appendChild(empty);
    updateStats();
    return;
  }

  sorted.forEach((event) => {
    const item = document.createElement("li");
    item.dataset.id = event.id;

    const main = document.createElement("div");
    main.className = "item-main";

    const date = document.createElement("span");
    date.className = "item-date";
    date.textContent = formatDate(event.date);

    const title = document.createElement("span");
    title.className = "item-title";
    title.textContent = event.title;

    main.append(date, title);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      editingEventId = event.id;
      eventDateInput.value = event.date;
      eventTitleInput.value = event.title;
      eventSubmit.textContent = "Update";
      eventTitleInput.focus();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      events = events.filter((entry) => entry.id !== event.id);
      saveState(STORAGE_KEYS.events, events);
      if (editingEventId === event.id) {
        resetEventForm();
      }
      renderEvents();
    });

    actions.append(editBtn, deleteBtn);
    item.append(main, actions);
    eventList.appendChild(item);
  });

  updateStats();
}

function resetEventForm() {
  editingEventId = null;
  eventForm.reset();
  eventSubmit.textContent = "Add";
}

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const date = eventDateInput.value;
  const title = eventTitleInput.value.trim();
  if (!date || !title) return;

  if (editingEventId) {
    events = events.map((entry) => (entry.id === editingEventId ? { ...entry, date, title } : entry));
  } else {
    events.push({ id: uniqueId(), date, title });
  }

  saveState(STORAGE_KEYS.events, events);
  renderEvents();
  resetEventForm();
});

function renderTasks() {
  taskList.innerHTML = "";

  if (!tasks.length) {
    const empty = document.createElement("li");
    empty.textContent = "Queue is clear.";
    taskList.appendChild(empty);
    updateStats();
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.dataset.id = task.id;
    if (task.completed) item.classList.add("task-complete");

    const main = document.createElement("div");
    main.className = "item-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Complete task: ${task.title}`);
    checkbox.addEventListener("change", () => {
      tasks = tasks.map((entry) => (entry.id === task.id ? { ...entry, completed: checkbox.checked } : entry));
      saveState(STORAGE_KEYS.tasks, tasks);
      renderTasks();
    });

    const title = document.createElement("span");
    title.className = "item-title";
    title.textContent = task.title;

    main.append(checkbox, title);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      tasks = tasks.filter((entry) => entry.id !== task.id);
      saveState(STORAGE_KEYS.tasks, tasks);
      renderTasks();
    });
    actions.append(deleteBtn);

    item.append(main, actions);
    taskList.appendChild(item);
  });

  updateStats();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  tasks.push({ id: uniqueId(), title, completed: false });
  saveState(STORAGE_KEYS.tasks, tasks);
  taskForm.reset();
  renderTasks();
});

function getNextEvent() {
  if (!events.length) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  return (
    sorted.find((event) => {
      const date = new Date(`${event.date}T00:00:00`);
      return date >= today;
    }) || sorted[0]
  );
}

function updateStats() {
  if (!statTasks || !statCompleted || !statNextEvent) return;
  const remaining = tasks.filter((task) => !task.completed).length;
  const completed = tasks.filter((task) => task.completed).length;
  statTasks.textContent = remaining.toString();
  statCompleted.textContent = completed.toString();

  const next = getNextEvent();
  statNextEvent.textContent = next ? `${formatDate(next.date)} · ${next.title}` : "No upcoming milestones";
}

function tickClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString("en-GB", { hour12: false });
  dateMeta.textContent = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  updateGreeting();
}

if (quickLog) {
  quickLog.value = localStorage.getItem(STORAGE_KEYS.quickLog) || "";
  quickLog.addEventListener("input", () => {
    localStorage.setItem(STORAGE_KEYS.quickLog, quickLog.value);
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}

if (focusStart) focusStart.addEventListener("click", startFocusTimer);
if (focusPause) focusPause.addEventListener("click", pauseFocusTimer);
if (focusReset) focusReset.addEventListener("click", resetFocusTimer);

if (focusDurationInput) {
  focusDurationInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value <= 0) return;
    focusState.duration = value;
    if (!focusState.isRunning) {
      focusState.remaining = value * 60;
    }
    saveFocusState();
    updateFocusDisplay();
  });
}

if (linkForm) {
  linkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = linkTitleInput.value.trim();
    const urlInput = linkUrlInput.value.trim();
    if (!title || !urlInput) return;

    const normalizedUrl = normalizeUrl(urlInput);
    if (!isSafeUrl(normalizedUrl)) {
      linkUrlInput.focus();
      return;
    }

    links.push({ id: uniqueId(), title, url: normalizedUrl });
    saveState(STORAGE_KEYS.links, links);
    linkForm.reset();
    renderLinks();
  });
}

function startAnimations() {
  const panels = document.querySelectorAll("[data-animate]");
  requestAnimationFrame(() => {
    panels.forEach((panel, index) => {
      if (!panel.style.getPropertyValue("--delay")) {
        panel.style.setProperty("--delay", `${index * 80}ms`);
      }
      panel.classList.add("animate-in");
    });
  });
}

initTheme();
renderEvents();
renderTasks();
renderLinks();
updateStats();
initializeFocusTimer();
startAnimations();
tickClock();
setInterval(tickClock, 1000);
