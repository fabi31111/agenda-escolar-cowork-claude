import { getState, addTask, updateTask, deleteTask, toggleTask } from "../store.js";
import { openModal, closeModal, showToast, confirmAction } from "../ui.js";
import { escapeHtml, todayISO, relativeDayLabel, isPast, colorFor, TASK_TYPES, taskTypeLabel } from "../utils.js";
import { AttachmentsField, attachmentBadge } from "../attachments.js";
import { createDatePicker, createTimePicker } from "../pickers.js";

let filter = "pending"; // all | pending | today | overdue | done
let search = "";

export function renderTasksView(container) {
  const state = getState();
  const tasks = filteredTasks(state);

  container.innerHTML = "";
  const wrap = document.createElement("div");

  wrap.innerHTML = `
    <div class="filter-bar">
      ${chip("pending", "Pendientes")}
      ${chip("today", "Hoy")}
      ${chip("overdue", "Vencidas")}
      ${chip("done", "Completadas")}
      ${chip("all", "Todas")}
      <div class="search-box" style="margin-left:auto">
        <svg class="icon"><use href="#icon-search"/></svg>
        <input type="search" id="task-search" placeholder="Buscar tareas..." value="${escapeHtml(search)}">
      </div>
    </div>
    <div class="list" id="task-list"></div>
  `;
  container.appendChild(wrap);

  wrap.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      renderTasksView(container);
    });
  });
  const searchInput = wrap.querySelector("#task-search");
  searchInput.addEventListener("input", () => {
    search = searchInput.value;
    renderTaskList(wrap.querySelector("#task-list"));
  });

  renderTaskList(wrap.querySelector("#task-list"));
}

function chip(id, label) {
  return `<button class="chip ${filter === id ? "active" : ""}" data-filter="${id}">${label}</button>`;
}

function filteredTasks(state) {
  let list = [...state.tasks];
  const today = todayISO();
  if (filter === "pending") list = list.filter((t) => !t.done);
  else if (filter === "today") list = list.filter((t) => !t.done && t.dueDate === today);
  else if (filter === "overdue") list = list.filter((t) => !t.done && t.dueDate && isPast(t.dueDate));
  else if (filter === "done") list = list.filter((t) => t.done);

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ad = a.dueDate || "9999-99-99";
    const bd = b.dueDate || "9999-99-99";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
  return list;
}

function renderTaskList(listEl) {
  const state = getState();
  const tasks = filteredTasks(state);
  if (!tasks.length) {
    listEl.innerHTML = `<div class="empty-state">No hay tareas aquí. Crea una con el botón "+ Nueva tarea".</div>`;
    return;
  }
  listEl.innerHTML = tasks.map((t) => taskItemHtml(t, state)).join("");

  listEl.querySelectorAll("[data-check]").forEach((elm) => {
    elm.addEventListener("click", () => {
      toggleTask(elm.dataset.check);
      renderTaskList(listEl);
    });
  });
  listEl.querySelectorAll("[data-edit]").forEach((elm) => {
    elm.addEventListener("click", () => openTaskModal(state.tasks.find((t) => t.id === elm.dataset.edit)));
  });
  listEl.querySelectorAll("[data-del]").forEach((elm) => {
    elm.addEventListener("click", () => {
      confirmAction("¿Eliminar esta tarea?", () => {
        deleteTask(elm.dataset.del);
        renderTaskList(listEl);
        showToast("Tarea eliminada");
      });
    });
  });
}

function taskItemHtml(t, state) {
  const subject = state.subjects.find((s) => s.id === t.subjectId);
  const overdue = !t.done && t.dueDate && isPast(t.dueDate);
  const priorityBadge = t.priority === "high"
    ? `<span class="badge badge-danger">Alta</span>`
    : t.priority === "low"
      ? `<span class="badge">Baja</span>`
      : "";
  const typeBadge = t.type && t.type !== "tarea"
    ? `<span class="badge ${t.type === "examen" ? "badge-danger" : "badge-warning"}">${taskTypeLabel(t.type)}</span>`
    : "";
  return `
  <div class="task-item ${t.done ? "done" : ""}">
    <div class="task-check ${t.done ? "checked" : ""}" data-check="${t.id}">
      <svg class="icon"><use href="#icon-check"/></svg>
    </div>
    <div class="task-body">
      <div class="task-title">${escapeHtml(t.title)}</div>
      ${t.description ? `<div class="task-desc">${escapeHtml(t.description)}</div>` : ""}
      <div class="task-meta">
        ${t.dueDate ? `<span class="badge ${overdue ? "badge-danger" : "badge-accent"}">${relativeDayLabel(t.dueDate)}${t.dueTime ? " · " + t.dueTime : ""}</span>` : ""}
        ${typeBadge}
        ${priorityBadge}
        ${subject ? `<span class="badge"><span class="dot" style="background:${colorFor(subject.color)}"></span>${escapeHtml(subject.name)}</span>` : ""}
        ${attachmentBadge(t.attachments)}
      </div>
    </div>
    <div class="task-actions">
      <button class="icon-btn" data-edit="${t.id}"><svg class="icon"><use href="#icon-edit"/></svg></button>
      <button class="icon-btn danger" data-del="${t.id}"><svg class="icon"><use href="#icon-trash"/></svg></button>
    </div>
  </div>`;
}

export function openTaskModal(existing, prefillDate) {
  const state = getState();
  const subjectOptions = state.subjects
    .filter((s) => !s.archived)
    .map((s) => `<option value="${s.id}" ${existing?.subjectId === s.id ? "selected" : ""}>${escapeHtml(s.name)}</option>`)
    .join("");

  const form = document.createElement("form");
  form.innerHTML = `
    <div class="field">
      <label>Título</label>
      <input type="text" name="title" required value="${escapeHtml(existing?.title || "")}" placeholder="¿Qué hay que hacer?">
    </div>
    <div class="field">
      <label>Descripción</label>
      <textarea name="description" placeholder="Detalles (opcional)">${escapeHtml(existing?.description || "")}</textarea>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Fecha límite</label>
        <div data-slot="dueDate"></div>
      </div>
      <div class="field">
        <label>Hora</label>
        <div data-slot="dueTime"></div>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Tipo</label>
        <select name="type">
          ${TASK_TYPES.map((t) => `<option value="${t.id}" ${(existing?.type || "tarea") === t.id ? "selected" : ""}>${t.label}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Prioridad</label>
        <select name="priority">
          <option value="low" ${existing?.priority === "low" ? "selected" : ""}>Baja</option>
          <option value="normal" ${(!existing || existing.priority === "normal") ? "selected" : ""}>Normal</option>
          <option value="high" ${existing?.priority === "high" ? "selected" : ""}>Alta</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>Asignatura</label>
      <select name="subjectId">
        <option value="">Sin asignatura</option>
        ${subjectOptions}
      </select>
    </div>
    <div class="modal-footer">
      ${existing ? `<button type="button" class="btn btn-danger" id="task-delete" style="margin-right:auto">Eliminar</button>` : ""}
      <button type="button" class="btn" id="task-cancel">Cancelar</button>
      <button type="submit" class="btn btn-primary">${existing ? "Guardar" : "Crear tarea"}</button>
    </div>
  `;

  const dueDatePicker = createDatePicker({ name: "dueDate", value: existing?.dueDate || prefillDate || "" });
  form.querySelector('[data-slot="dueDate"]').replaceWith(dueDatePicker.el);
  const dueTimePicker = createTimePicker({ name: "dueTime", value: existing?.dueTime || "" });
  form.querySelector('[data-slot="dueTime"]').replaceWith(dueTimePicker.el);

  const attachField = new AttachmentsField({
    mode: existing ? "edit" : "create",
    attachments: existing?.attachments || [],
    kind: "task",
    entityId: existing?.id || null,
  });
  form.querySelector(".modal-footer").insertAdjacentElement("beforebegin", attachField.el);

  openModal(existing ? "Editar tarea" : "Nueva tarea", form);

  form.querySelector("#task-cancel").addEventListener("click", closeModal);
  if (existing) {
    form.querySelector("#task-delete").addEventListener("click", () => {
      confirmAction("¿Eliminar esta tarea?", () => {
        deleteTask(existing.id);
        closeModal();
        showToast("Tarea eliminada");
        document.dispatchEvent(new CustomEvent("app:refresh"));
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      title: fd.get("title"),
      description: fd.get("description"),
      dueDate: fd.get("dueDate") || null,
      dueTime: fd.get("dueTime") || null,
      type: fd.get("type"),
      priority: fd.get("priority"),
      subjectId: fd.get("subjectId") || null,
    };
    if (!data.title.trim()) return;
    if (existing) {
      updateTask(existing.id, data);
      showToast("Tarea actualizada");
    } else {
      const created = addTask(data);
      await attachField.commitCreate("task", created.id);
      showToast("Tarea creada");
    }
    closeModal();
    document.dispatchEvent(new CustomEvent("app:refresh"));
  });
}
