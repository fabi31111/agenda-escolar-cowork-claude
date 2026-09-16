import { getState, addSubject, updateSubject, deleteSubject, addTask, toggleTask, deleteTask } from "../store.js";
import { openModal, closeModal, showToast, confirmAction } from "../ui.js";
import { escapeHtml, PALETTE, colorFor, relativeDayLabel } from "../utils.js";
import { AttachmentsField, attachmentBadge } from "../attachments.js";

export function renderSubjectsView(container) {
  const state = getState();
  const subjects = [...state.subjects].sort((a, b) => a.archived - b.archived || b.createdAt - a.createdAt);

  container.innerHTML = "";
  if (!subjects.length) {
    container.innerHTML = `<div class="empty-state">Aún no tienes asignaturas. Crea una con "+ Nueva asignatura".</div>`;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "project-grid";
  grid.innerHTML = subjects.map((s) => subjectCardHtml(s, state)).join("");
  container.appendChild(grid);

  grid.querySelectorAll("[data-subject]").forEach((card) => {
    card.addEventListener("click", () => openSubjectDetail(card.dataset.subject));
  });
}

function subjectCardHtml(s, state) {
  const tasks = state.tasks.filter((t) => t.subjectId === s.id);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return `
  <div class="project-card" style="--project-color:${colorFor(s.color)}" data-subject="${s.id}">
    <div class="project-card-head">
      <h3>${escapeHtml(s.name)}</h3>
      ${s.archived ? `<span class="badge">Archivada</span>` : ""}
      ${attachmentBadge(s.attachments)}
    </div>
    <p>${escapeHtml(s.description || "Sin descripción")}</p>
    ${s.teacher || s.room ? `
    <div class="subject-meta">
      ${s.teacher ? `<span>${escapeHtml(s.teacher)}</span>` : ""}
      ${s.room ? `<span>${escapeHtml(s.room)}</span>` : ""}
    </div>` : ""}
    <div class="project-progress"><div class="project-progress-bar" style="width:${pct}%"></div></div>
    <div class="project-stats"><span>${done}/${tasks.length} tareas</span><span>${pct}%</span></div>
  </div>`;
}

export function openSubjectModal(existing) {
  const form = document.createElement("form");
  form.innerHTML = `
    <div class="field">
      <label>Nombre</label>
      <input type="text" name="name" required value="${escapeHtml(existing?.name || "")}" placeholder="Nombre de la asignatura">
    </div>
    <div class="field-row">
      <div class="field">
        <label>Profesor/a</label>
        <input type="text" name="teacher" value="${escapeHtml(existing?.teacher || "")}" placeholder="Opcional">
      </div>
      <div class="field">
        <label>Aula</label>
        <input type="text" name="room" value="${escapeHtml(existing?.room || "")}" placeholder="Opcional">
      </div>
    </div>
    <div class="field">
      <label>Descripción</label>
      <textarea name="description" placeholder="Notas sobre la asignatura (opcional)">${escapeHtml(existing?.description || "")}</textarea>
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-picker" id="color-picker">
        ${PALETTE.map((c) => `<span class="color-swatch ${((existing?.color || "violet") === c.id) ? "selected" : ""}" data-color="${c.id}" style="background:${c.value}"></span>`).join("")}
      </div>
      <input type="hidden" name="color" value="${existing?.color || "violet"}">
    </div>
    ${existing ? `
    <div class="field checkbox-row">
      <input type="checkbox" id="archived-check" name="archived" ${existing.archived ? "checked" : ""}>
      <label for="archived-check" style="margin:0">Archivar asignatura</label>
    </div>` : ""}
    <div class="modal-footer">
      ${existing ? `<button type="button" class="btn btn-danger" id="subject-delete" style="margin-right:auto">Eliminar</button>` : ""}
      <button type="button" class="btn" id="subject-cancel">Cancelar</button>
      <button type="submit" class="btn btn-primary">${existing ? "Guardar" : "Crear asignatura"}</button>
    </div>
  `;

  const attachField = new AttachmentsField({
    mode: existing ? "edit" : "create",
    attachments: existing?.attachments || [],
    kind: "subject",
    entityId: existing?.id || null,
  });
  form.querySelector(".modal-footer").insertAdjacentElement("beforebegin", attachField.el);

  openModal(existing ? "Editar asignatura" : "Nueva asignatura", form);

  const colorInput = form.querySelector('input[name="color"]');
  form.querySelectorAll(".color-swatch").forEach((sw) => {
    sw.addEventListener("click", () => {
      form.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
      sw.classList.add("selected");
      colorInput.value = sw.dataset.color;
    });
  });

  form.querySelector("#subject-cancel").addEventListener("click", closeModal);
  if (existing) {
    form.querySelector("#subject-delete").addEventListener("click", () => {
      confirmAction("¿Eliminar esta asignatura? Las tareas asociadas quedarán sin asignatura.", () => {
        deleteSubject(existing.id);
        closeModal();
        showToast("Asignatura eliminada");
        document.dispatchEvent(new CustomEvent("app:refresh"));
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      name: fd.get("name"),
      teacher: fd.get("teacher"),
      room: fd.get("room"),
      description: fd.get("description"),
      color: fd.get("color"),
      archived: fd.get("archived") === "on",
    };
    if (!data.name.trim()) return;
    if (existing) {
      updateSubject(existing.id, data);
      showToast("Asignatura actualizada");
    } else {
      const created = addSubject(data);
      await attachField.commitCreate("subject", created.id);
      showToast("Asignatura creada");
    }
    closeModal();
    document.dispatchEvent(new CustomEvent("app:refresh"));
  });
}

function openSubjectDetail(subjectId) {
  const state = getState();
  const subject = state.subjects.find((s) => s.id === subjectId);
  if (!subject) return;
  const tasks = state.tasks.filter((t) => t.subjectId === subjectId)
    .sort((a, b) => a.done - b.done || (a.dueDate || "9999") < (b.dueDate || "9999") ? -1 : 1);

  const wrap = document.createElement("div");
  render();
  openModal(subject.name, wrap, {});

  function render() {
    wrap.innerHTML = `
      <p style="font-size:13.5px;color:var(--text-dim);margin-bottom:14px;">${escapeHtml(subject.description || "Sin descripción")}</p>
      ${subject.teacher || subject.room ? `
      <p style="font-size:12px;color:var(--text-faint);margin-bottom:14px;">
        ${subject.teacher ? escapeHtml(subject.teacher) : ""}${subject.teacher && subject.room ? " · " : ""}${subject.room ? escapeHtml(subject.room) : ""}
      </p>` : ""}
      <div class="quick-add">
        <input type="text" id="quick-task-title" placeholder="Añadir tarea a esta asignatura...">
        <button class="btn btn-primary btn-sm" id="quick-task-add"><svg class="icon"><use href="#icon-plus"/></svg></button>
      </div>
      <div class="list" id="subject-task-list"></div>
      <div class="modal-footer-split">
        <button class="btn btn-sm" id="subject-edit-btn"><svg class="icon"><use href="#icon-edit"/></svg> Editar asignatura</button>
      </div>
    `;
    const listEl = wrap.querySelector("#subject-task-list");
    if (!tasks.length) {
      listEl.innerHTML = `<div class="empty-state">Sin tareas todavía.</div>`;
    } else {
      listEl.innerHTML = tasks.map((t) => `
        <div class="task-item ${t.done ? "done" : ""}">
          <div class="task-check ${t.done ? "checked" : ""}" data-check="${t.id}"><svg class="icon"><use href="#icon-check"/></svg></div>
          <div class="task-body">
            <div class="task-title">${escapeHtml(t.title)}</div>
            ${t.dueDate ? `<div class="task-meta"><span class="badge badge-accent">${relativeDayLabel(t.dueDate)}</span></div>` : ""}
          </div>
          <div class="task-actions">
            <button class="icon-btn danger" data-del="${t.id}"><svg class="icon"><use href="#icon-trash"/></svg></button>
          </div>
        </div>`).join("");
      listEl.querySelectorAll("[data-check]").forEach((elm) => {
        elm.addEventListener("click", () => {
          toggleTask(elm.dataset.check);
          const t = tasks.find((x) => x.id === elm.dataset.check);
          t.done = !t.done;
          render();
          document.dispatchEvent(new CustomEvent("app:refresh-silent"));
        });
      });
      listEl.querySelectorAll("[data-del]").forEach((elm) => {
        elm.addEventListener("click", () => {
          confirmAction("¿Eliminar esta tarea?", () => {
            deleteTask(elm.dataset.del);
            const idx = tasks.findIndex((x) => x.id === elm.dataset.del);
            if (idx > -1) tasks.splice(idx, 1);
            render();
            document.dispatchEvent(new CustomEvent("app:refresh-silent"));
          });
        });
      });
    }

    wrap.querySelector("#quick-task-add").addEventListener("click", addQuick);
    wrap.querySelector("#quick-task-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addQuick(); }
    });
    wrap.querySelector("#subject-edit-btn").addEventListener("click", () => openSubjectModal(subject));
  }

  function addQuick() {
    const input = wrap.querySelector("#quick-task-title");
    const title = input.value.trim();
    if (!title) return;
    const t = addTask({ title, subjectId });
    tasks.unshift(t);
    input.value = "";
    render();
    document.dispatchEvent(new CustomEvent("app:refresh-silent"));
  }
}
