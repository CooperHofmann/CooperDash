const STORAGE_KEYS = {
  events: "cooperdash.events",
  tasks: "cooperdash.tasks",
  quickLog: "cooperdash.quickLog",
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

let events = loadState(STORAGE_KEYS.events, []);
let tasks = loadState(STORAGE_KEYS.tasks, []);
let editingEventId = null;

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

function renderEvents() {
  eventList.innerHTML = "";
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  if (!sorted.length) {
    const empty = document.createElement("li");
    empty.textContent = "No milestones yet.";
    eventList.appendChild(empty);
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

function tickClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString("en-GB", { hour12: false });
  dateMeta.textContent = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

quickLog.value = localStorage.getItem(STORAGE_KEYS.quickLog) || "";
quickLog.addEventListener("input", () => {
  localStorage.setItem(STORAGE_KEYS.quickLog, quickLog.value);
});

renderEvents();
renderTasks();
tickClock();
setInterval(tickClock, 1000);
