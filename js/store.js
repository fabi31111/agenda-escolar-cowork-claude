// Store central con persistencia en localStorage.

import { uid, todayISO, addDays, toISODate } from "./utils.js";
import { deleteFile } from "./files.js";

const STORAGE_KEY = "agenda-escolar-v1";

const DEFAULT_STATE = {
  version: 1,
  theme: "auto", // "light" | "dark" | "auto"
  accentColor: "violet",
  subjects: [],
  tasks: [],
  events: [],
  notes: [],
  scheduleBlocks: [],
  seeded: false,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch (e) {
    console.error("No se pudo leer el almacenamiento local", e);
    return structuredClone(DEFAULT_STATE);
  }
}

let state = load();
const listeners = new Set();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function notify() {
  persist();
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

export function setTheme(theme) {
  state.theme = theme;
  notify();
}

export function setAccentColor(colorId) {
  state.accentColor = colorId;
  notify();
}

/* ---------------------------- Asignaturas ---------------------------- */

export function addSubject(data) {
  const subject = {
    id: uid(),
    name: data.name.trim(),
    teacher: data.teacher?.trim() || "",
    room: data.room?.trim() || "",
    description: data.description?.trim() || "",
    color: data.color || "violet",
    archived: false,
    attachments: [],
    createdAt: Date.now(),
  };
  state.subjects.push(subject);
  notify();
  return subject;
}

export function updateSubject(id, patch) {
  const s = state.subjects.find((x) => x.id === id);
  if (!s) return;
  Object.assign(s, patch);
  notify();
}

export function deleteSubject(id) {
  const s = state.subjects.find((x) => x.id === id);
  (s?.attachments || []).forEach((a) => deleteFile(a.id));
  state.subjects = state.subjects.filter((s) => s.id !== id);
  state.tasks.forEach((t) => { if (t.subjectId === id) t.subjectId = null; });
  state.notes.forEach((n) => { if (n.subjectId === id) n.subjectId = null; });
  notify();
}

/* ---------------------------- Tareas ---------------------------- */

export function addTask(data) {
  const task = {
    id: uid(),
    title: data.title.trim(),
    description: data.description?.trim() || "",
    done: false,
    dueDate: data.dueDate || null,
    dueTime: data.dueTime || null,
    priority: data.priority || "normal", // low | normal | high
    type: data.type || "tarea", // tarea | examen | trabajo | lectura
    subjectId: data.subjectId || null,
    attachments: [],
    createdAt: Date.now(),
  };
  state.tasks.push(task);
  notify();
  return task;
}

export function updateTask(id, patch) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  Object.assign(t, patch);
  notify();
}

export function toggleTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  t.completedAt = t.done ? Date.now() : null;
  notify();
}

export function deleteTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  (t?.attachments || []).forEach((a) => deleteFile(a.id));
  state.tasks = state.tasks.filter((t) => t.id !== id);
  notify();
}

/* ---------------------------- Eventos ---------------------------- */

export function addEvent(data) {
  const event = {
    id: uid(),
    title: data.title.trim(),
    description: data.description?.trim() || "",
    date: data.date,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    location: data.location?.trim() || "",
    type: data.type || "otro", // examen | entrega | excursion | reunion | otro
    color: data.color || "violet",
    attachments: [],
    createdAt: Date.now(),
  };
  state.events.push(event);
  notify();
  return event;
}

export function updateEvent(id, patch) {
  const e = state.events.find((x) => x.id === id);
  if (!e) return;
  Object.assign(e, patch);
  notify();
}

export function deleteEvent(id) {
  const e = state.events.find((x) => x.id === id);
  (e?.attachments || []).forEach((a) => deleteFile(a.id));
  state.events = state.events.filter((e) => e.id !== id);
  notify();
}

/* ---------------------------- Notas ---------------------------- */

export function addNote(data) {
  const note = {
    id: uid(),
    title: data.title.trim() || "Sin título",
    content: data.content || "",
    tags: data.tags || [],
    subjectId: data.subjectId || null,
    color: data.color || "violet",
    pinned: false,
    attachments: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.notes.push(note);
  notify();
  return note;
}

export function updateNote(id, patch) {
  const n = state.notes.find((x) => x.id === id);
  if (!n) return;
  Object.assign(n, patch, { updatedAt: Date.now() });
  notify();
}

export function togglePinNote(id) {
  const n = state.notes.find((x) => x.id === id);
  if (!n) return;
  n.pinned = !n.pinned;
  notify();
}

export function deleteNote(id) {
  const n = state.notes.find((x) => x.id === id);
  (n?.attachments || []).forEach((a) => deleteFile(a.id));
  state.notes = state.notes.filter((n) => n.id !== id);
  notify();
}

/* ---------------------------- Horario ---------------------------- */

export function addScheduleBlock(data) {
  const block = {
    id: uid(),
    day: data.day, // 0-6, lunes=0
    startMin: data.startMin,
    endMin: data.endMin,
    title: data.title.trim(),
    room: data.room?.trim() || "",
    color: data.color || "violet",
  };
  state.scheduleBlocks.push(block);
  notify();
  return block;
}

export function updateScheduleBlock(id, patch) {
  const b = state.scheduleBlocks.find((x) => x.id === id);
  if (!b) return;
  Object.assign(b, patch);
  notify();
}

export function deleteScheduleBlock(id) {
  state.scheduleBlocks = state.scheduleBlocks.filter((b) => b.id !== id);
  notify();
}

/* ---------------------------- Adjuntos ---------------------------- */

const COLLECTIONS = {
  task: () => state.tasks,
  subject: () => state.subjects,
  event: () => state.events,
  note: () => state.notes,
};

export function addAttachmentMeta(kind, entityId, meta) {
  const entity = COLLECTIONS[kind]().find((x) => x.id === entityId);
  if (!entity) return;
  if (!entity.attachments) entity.attachments = [];
  entity.attachments.push(meta);
  notify();
}

export function removeAttachmentMeta(kind, entityId, attachmentId) {
  const entity = COLLECTIONS[kind]().find((x) => x.id === entityId);
  if (!entity) return;
  entity.attachments = (entity.attachments || []).filter((a) => a.id !== attachmentId);
  deleteFile(attachmentId);
  notify();
}

/* ---------------------------- Seed inicial ---------------------------- */

export function seedIfEmpty() {
  if (state.seeded) return;
  state.seeded = true;

  const subject = {
    id: uid(),
    name: "Matemáticas",
    teacher: "Sra. López",
    room: "Aula 12",
    description: "Una asignatura de ejemplo. Puedes editarla o borrarla.",
    color: "violet",
    archived: false,
    attachments: [],
    createdAt: Date.now(),
  };
  state.subjects.push(subject);

  state.tasks.push({
    id: uid(),
    title: "Ejercicios página 42",
    description: "Revisa las pestañas: Tareas, Asignaturas, Eventos, Notas, Calendario y Horario.",
    done: false,
    dueDate: todayISO(),
    dueTime: null,
    priority: "normal",
    type: "tarea",
    subjectId: subject.id,
    attachments: [],
    createdAt: Date.now(),
  });

  state.tasks.push({
    id: uid(),
    title: "Estudiar para el examen de Historia",
    description: "",
    done: false,
    dueDate: toISODate(addDays(new Date(), 3)),
    dueTime: null,
    priority: "high",
    type: "examen",
    subjectId: null,
    attachments: [],
    createdAt: Date.now(),
  });

  state.scheduleBlocks.push({
    id: uid(),
    day: 0,
    startMin: 8 * 60,
    endMin: 9 * 60,
    title: "Matemáticas",
    room: "Aula 12",
    color: "violet",
  });

  state.notes.push({
    id: uid(),
    title: "Bienvenida a tu agenda escolar",
    content: "Esta es tu agenda escolar.\n\n- Hoy: resumen del día.\n- Tareas: deberes y exámenes con fecha y prioridad.\n- Asignaturas: profesor, aula y tareas de cada asignatura.\n- Eventos: exámenes, entregas, excursiones y reuniones.\n- Notas: apuntes de clase.\n- Calendario: vista mensual de tareas y eventos.\n- Horario: tu horario de clases semanal.",
    tags: ["bienvenida"],
    subjectId: null,
    color: "amber",
    pinned: true,
    attachments: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  notify();
}
