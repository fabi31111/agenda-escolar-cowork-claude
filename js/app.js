import { getState, subscribe, seedIfEmpty } from "./store.js";
import { qs, qsa, todayISO, isoWeekday, colorFor } from "./utils.js";
import { renderTodayView } from "./views/today.js";
import { renderTasksView, openTaskModal } from "./views/tasks.js";
import { renderSubjectsView, openSubjectModal } from "./views/subjects.js";
import { renderEventsView, openEventModal } from "./views/events.js";
import { renderNotesView, openNoteModal } from "./views/notes.js";
import { renderCalendarView } from "./views/calendar.js";
import { renderScheduleView, openBlockModal } from "./views/schedule.js";
import { openSettingsModal } from "./views/settings.js";

seedIfEmpty();

const viewContainer = qs("#view-container");
const viewTitle = qs("#view-title");
const topbarActions = qs("#topbar-actions");

const VIEWS = {
  today: {
    title: "Hoy",
    render: renderTodayView,
  },
  tasks: {
    title: "Tareas",
    render: renderTasksView,
    action: { label: "Nueva tarea", onClick: () => openTaskModal(null) },
  },
  subjects: {
    title: "Asignaturas",
    render: renderSubjectsView,
    action: { label: "Nueva asignatura", onClick: () => openSubjectModal(null) },
  },
  events: {
    title: "Eventos",
    render: renderEventsView,
    action: { label: "Nuevo evento", onClick: () => openEventModal(null) },
  },
  notes: {
    title: "Notas",
    render: renderNotesView,
    action: { label: "Nueva nota", onClick: () => openNoteModal(null) },
  },
  calendar: {
    title: "Calendario",
    render: renderCalendarView,
    action: { label: "Nuevo evento", onClick: () => openEventModal(null, todayISO()) },
  },
  schedule: {
    title: "Horario",
    render: renderScheduleView,
    action: {
      label: "Clase",
      onClick: () => openBlockModal(null, { day: isoWeekday(new Date()), startMin: 8 * 60, endMin: 9 * 60 }),
    },
  },
};

let currentView = "today";

function renderCurrentView() {
  const view = VIEWS[currentView];
  viewTitle.textContent = view.title;
  topbarActions.innerHTML = view.action
    ? `<button class="btn btn-primary" id="topbar-action-btn"><svg class="icon"><use href="#icon-plus"/></svg><span>${view.action.label}</span></button>`
    : "";
  if (view.action) {
    qs("#topbar-action-btn").addEventListener("click", view.action.onClick);
  }
  view.render(viewContainer);

  qsa(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === currentView);
  });
}

function switchView(id) {
  if (!VIEWS[id]) return;
  currentView = id;
  renderCurrentView();
  window.scrollTo(0, 0);
}

qsa(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});
qs("#settings-btn").addEventListener("click", openSettingsModal);

subscribe(() => renderCurrentView());
document.addEventListener("app:refresh", () => renderCurrentView());
document.addEventListener("app:refresh-silent", () => {});

renderCurrentView();

/* ---------------------------------- Apariencia ---------------------------------- */

function applyTheme() {
  const theme = getState().theme;
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function applyAccentColor() {
  const hex = colorFor(getState().accentColor);
  document.documentElement.style.setProperty("--accent", hex);
  qs('meta[name="theme-color"]')?.setAttribute("content", hex);
}

subscribe(applyTheme);
subscribe(applyAccentColor);
applyTheme();
applyAccentColor();

/* ---------------------------------- Service worker ---------------------------------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("No se pudo registrar el service worker", err);
    });
  });
}
