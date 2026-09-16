// Utilidades compartidas: fechas, formato, helpers de DOM.

export const DOW_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DOW_LABELS_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const PALETTE = [
  { id: "violet", value: "#5b5bd6" },
  { id: "red", value: "#e5484d" },
  { id: "orange", value: "#e5723a" },
  { id: "amber", value: "#c9760a" },
  { id: "green", value: "#2f9e5b" },
  { id: "teal", value: "#0d9488" },
  { id: "blue", value: "#2563eb" },
  { id: "pink", value: "#d6409f" },
];

// Tipos de tarea/deber escolar.
export const TASK_TYPES = [
  { id: "tarea", label: "Tarea" },
  { id: "examen", label: "Examen" },
  { id: "trabajo", label: "Trabajo" },
  { id: "lectura", label: "Lectura" },
];

// Tipos de evento del calendario escolar.
export const EVENT_TYPES = [
  { id: "examen", label: "Examen" },
  { id: "entrega", label: "Entrega" },
  { id: "excursion", label: "Excursión" },
  { id: "reunion", label: "Reunión" },
  { id: "otro", label: "Otro" },
];

export function taskTypeLabel(id) {
  return TASK_TYPES.find((t) => t.id === id)?.label || "";
}

export function eventTypeLabel(id) {
  return EVENT_TYPES.find((t) => t.id === id)?.label || "";
}

export function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

export function todayISO() {
  return toISODate(new Date());
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(iso, date) {
  return iso === toISODate(date);
}

export function isPast(iso) {
  return iso < todayISO();
}

// Lunes = índice 0
export function isoWeekday(date) {
  const day = date.getDay(); // 0 = domingo
  return (day + 6) % 7;
}

export function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - isoWeekday(d));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function formatLongDate(date) {
  return `${DOW_LABELS_FULL[isoWeekday(date)]}, ${date.getDate()} de ${MONTH_LABELS[date.getMonth()].toLowerCase()} de ${date.getFullYear()}`;
}

export function formatShortDate(iso) {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()].slice(0, 3).toLowerCase()}`;
}

export function formatTime(hhmm) {
  if (!hhmm) return "";
  return hhmm;
}

export function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}
export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function colorFor(id) {
  return PALETTE.find((c) => c.id === id)?.value || PALETTE[0].value;
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function relativeDayLabel(iso) {
  const diff = Math.round((parseISODate(iso) - parseISODate(todayISO())) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return formatShortDate(iso);
}
