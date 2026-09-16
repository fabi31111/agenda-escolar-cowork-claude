import { getState, addTask, toggleTask } from "../store.js";
import { showToast } from "../ui.js";
import {
  escapeHtml, todayISO, formatLongDate, isoWeekday, isPast,
  colorFor, minutesToTime, DOW_LABELS_FULL,
} from "../utils.js";
import { openTaskModal } from "./tasks.js";
import { openEventModal } from "./events.js";
import { openBlockModal } from "./schedule.js";
import { openNoteModal } from "./notes.js";

export function renderTodayView(container) {
  const state = getState();
  const today = todayISO();
  const now = new Date();
  const weekday = isoWeekday(now);

  const todayTasks = state.tasks.filter((t) => !t.done && t.dueDate === today);
  const overdueTasks = state.tasks.filter((t) => !t.done && t.dueDate && isPast(t.dueDate));
  const todayEvents = state.events.filter((e) => e.date === today)
    .sort((a, b) => (a.startTime || "") < (b.startTime || "") ? -1 : 1);
  const todayBlocks = state.scheduleBlocks.filter((b) => b.day === weekday)
    .sort((a, b) => a.startMin - b.startMin);
  const pinnedNotes = state.notes.filter((n) => n.pinned).slice(0, 4);
  const pendingCount = state.tasks.filter((t) => !t.done).length;

  container.innerHTML = `
    <div class="today-hero">
      <div>
        <div class="today-date">${formatLongDate(now)}</div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card"><div class="stat-num">${todayTasks.length}</div><div class="stat-label">Tareas para hoy</div></div>
      <div class="stat-card"><div class="stat-num">${overdueTasks.length}</div><div class="stat-label">Vencidas</div></div>
      <div class="stat-card"><div class="stat-num">${todayEvents.length}</div><div class="stat-label">Eventos hoy</div></div>
      <div class="stat-card"><div class="stat-num">${pendingCount}</div><div class="stat-label">Pendientes totales</div></div>
    </div>

    <div class="quick-add">
      <input type="text" id="quick-add-input" placeholder="Añadir una tarea para hoy y presiona Enter...">
      <button class="btn btn-primary" id="quick-add-btn"><svg class="icon"><use href="#icon-plus"/></svg></button>
    </div>

    <div class="today-grid">
      <div>
        <div class="section">
          <div class="section-head"><h2>Tareas de hoy${overdueTasks.length ? " y vencidas" : ""}</h2></div>
          <div class="list" id="today-tasks"></div>
        </div>
        <div class="section">
          <div class="section-head"><h2>Horario de hoy · ${DOW_LABELS_FULL[weekday]}</h2></div>
          <div class="list" id="today-schedule"></div>
        </div>
      </div>
      <div>
        <div class="section">
          <div class="section-head"><h2>Eventos de hoy</h2></div>
          <div class="list" id="today-events"></div>
        </div>
        <div class="section">
          <div class="section-head"><h2>Notas fijadas</h2></div>
          <div class="notes-grid" id="today-notes"></div>
        </div>
      </div>
    </div>
  `;

  // Tareas
  const combinedTasks = [...overdueTasks.filter((t) => t.dueDate !== today), ...todayTasks];
  const tasksEl = container.querySelector("#today-tasks");
  tasksEl.innerHTML = combinedTasks.length
    ? combinedTasks.map((t) => `
      <div class="task-item">
        <div class="task-check" data-check="${t.id}"><svg class="icon"><use href="#icon-check"/></svg></div>
        <div class="task-body">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="task-meta">
            ${t.dueDate !== today ? `<span class="badge badge-danger">Vencida</span>` : ""}
            ${t.type === "examen" ? `<span class="badge badge-danger">Examen</span>` : ""}
            ${t.dueTime ? `<span class="badge">${t.dueTime}</span>` : ""}
          </div>
        </div>
      </div>
    `).join("")
    : `<div class="empty-state">Sin tareas pendientes para hoy. 🎉</div>`;
  tasksEl.querySelectorAll("[data-check]").forEach((elm) => {
    elm.addEventListener("click", () => {
      toggleTask(elm.dataset.check);
      renderTodayView(container);
      showToast("Tarea completada");
    });
  });
  tasksEl.querySelectorAll(".task-item").forEach((row, i) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("[data-check]")) return;
      openTaskModal(combinedTasks[i]);
    });
    row.style.cursor = "pointer";
  });

  // Eventos
  const eventsEl = container.querySelector("#today-events");
  eventsEl.innerHTML = todayEvents.length
    ? todayEvents.map((e) => `
      <div class="task-item" data-event="${e.id}" style="cursor:pointer">
        <div class="dot" style="background:${colorFor(e.color)};margin-top:6px"></div>
        <div class="task-body">
          <div class="task-title">${escapeHtml(e.title)}</div>
          <div class="task-meta">
            ${e.startTime ? `<span class="badge badge-accent">${e.startTime}${e.endTime ? "–" + e.endTime : ""}</span>` : ""}
            ${e.location ? `<span class="badge">${escapeHtml(e.location)}</span>` : ""}
          </div>
        </div>
      </div>
    `).join("")
    : `<div class="empty-state">No hay eventos hoy.</div>`;
  eventsEl.querySelectorAll("[data-event]").forEach((elm) => {
    elm.addEventListener("click", () => openEventModal(todayEvents.find((e) => e.id === elm.dataset.event)));
  });

  // Horario
  const scheduleEl = container.querySelector("#today-schedule");
  scheduleEl.innerHTML = todayBlocks.length
    ? todayBlocks.map((b) => `
      <div class="task-item" data-block="${b.id}" style="cursor:pointer">
        <div class="dot" style="background:${colorFor(b.color)};margin-top:6px"></div>
        <div class="task-body">
          <div class="task-title">${escapeHtml(b.title)}</div>
          <div class="task-meta">
            <span class="badge badge-accent">${minutesToTime(b.startMin)}–${minutesToTime(b.endMin)}</span>
            ${b.room ? `<span class="badge">${escapeHtml(b.room)}</span>` : ""}
          </div>
        </div>
      </div>
    `).join("")
    : `<div class="empty-state">Sin clases programadas hoy.</div>`;
  scheduleEl.querySelectorAll("[data-block]").forEach((elm) => {
    elm.addEventListener("click", () => openBlockModal(todayBlocks.find((b) => b.id === elm.dataset.block)));
  });

  // Notas fijadas
  const notesEl = container.querySelector("#today-notes");
  notesEl.innerHTML = pinnedNotes.length
    ? pinnedNotes.map((n) => `
      <div class="note-card" style="--note-color:${colorFor(n.color)}" data-note="${n.id}">
        <div class="note-card-head"><h3>${escapeHtml(n.title)}</h3></div>
        <div class="note-preview">${escapeHtml(n.content)}</div>
      </div>
    `).join("")
    : `<div class="empty-state" style="grid-column:1/-1">No tienes notas fijadas.</div>`;
  notesEl.querySelectorAll("[data-note]").forEach((elm) => {
    elm.addEventListener("click", () => openNoteModal(pinnedNotes.find((n) => n.id === elm.dataset.note)));
  });

  // Quick add
  const quickInput = container.querySelector("#quick-add-input");
  const addQuick = () => {
    const title = quickInput.value.trim();
    if (!title) return;
    addTask({ title, dueDate: today });
    quickInput.value = "";
    renderTodayView(container);
    showToast("Tarea creada");
  };
  container.querySelector("#quick-add-btn").addEventListener("click", addQuick);
  quickInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); addQuick(); }
  });
}
