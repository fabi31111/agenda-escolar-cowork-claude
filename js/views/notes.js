import { getState, addNote, updateNote, deleteNote, togglePinNote } from "../store.js";
import { openModal, closeModal, showToast, confirmAction } from "../ui.js";
import { escapeHtml, PALETTE, colorFor, toISODate } from "../utils.js";
import { AttachmentsField, attachmentBadge } from "../attachments.js";
import { createDatePicker } from "../pickers.js";

let search = "";
let dayFilter = "";

export function renderNotesView(container) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="filter-bar">
      <div class="search-box">
        <svg class="icon"><use href="#icon-search"/></svg>
        <input type="search" id="note-search" placeholder="Buscar notas..." value="${escapeHtml(search)}">
      </div>
      <div data-slot="day-filter" style="width:180px"></div>
    </div>
    <div class="notes-grid" id="notes-grid"></div>
  `;
  container.appendChild(wrap);
  wrap.querySelector("#note-search").addEventListener("input", (e) => {
    search = e.target.value;
    renderGrid(wrap.querySelector("#notes-grid"));
  });

  const dayPicker = createDatePicker({
    name: "noteDayFilter",
    value: dayFilter,
    placeholder: "Filtrar por día",
    onChange: (v) => {
      dayFilter = v;
      renderGrid(wrap.querySelector("#notes-grid"));
    },
  });
  wrap.querySelector('[data-slot="day-filter"]').replaceWith(dayPicker.el);

  renderGrid(wrap.querySelector("#notes-grid"));
}

function getNotes() {
  const state = getState();
  let list = [...state.notes];
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)));
  }
  if (dayFilter) {
    list = list.filter((n) => toISODate(new Date(n.updatedAt)) === dayFilter || toISODate(new Date(n.createdAt)) === dayFilter);
  }
  list.sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));
  return list;
}

function renderGrid(gridEl) {
  const state = getState();
  const notes = getNotes();
  if (!notes.length) {
    const msg = (search.trim() || dayFilter) ? "No hay notas que coincidan con el filtro." : `No hay notas. Crea una con "+ Nueva nota".`;
    gridEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${msg}</div>`;
    return;
  }
  gridEl.innerHTML = notes.map((n) => {
    const subject = state.subjects.find((s) => s.id === n.subjectId);
    return `
    <div class="note-card" style="--note-color:${colorFor(n.color)}" data-note="${n.id}">
      <div class="note-card-head">
        <h3>${escapeHtml(n.title)}</h3>
        <button class="icon-btn" data-pin="${n.id}" style="${n.pinned ? "color:var(--accent)" : ""}">
          <svg class="icon" style="width:16px;height:16px"><use href="#icon-pin"/></svg>
        </button>
      </div>
      <div class="note-preview">${escapeHtml(n.content)}</div>
      ${subject || n.tags.length || (n.attachments || []).length ? `<div class="note-tags">
        ${subject ? `<span class="badge"><span class="dot" style="background:${colorFor(subject.color)}"></span>${escapeHtml(subject.name)}</span>` : ""}
        ${n.tags.map((t) => `<span class="badge">#${escapeHtml(t)}</span>`).join("")}${attachmentBadge(n.attachments)}
      </div>` : ""}
      <div class="note-date">${new Date(n.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</div>
    </div>
  `;
  }).join("");

  gridEl.querySelectorAll("[data-note]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-pin]")) return;
      openNoteModal(notes.find((n) => n.id === card.dataset.note));
    });
  });
  gridEl.querySelectorAll("[data-pin]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePinNote(btn.dataset.pin);
      renderGrid(gridEl);
    });
  });
}

export function openNoteModal(existing) {
  const state = getState();
  const subjectOptions = state.subjects
    .filter((s) => !s.archived)
    .map((s) => `<option value="${s.id}" ${existing?.subjectId === s.id ? "selected" : ""}>${escapeHtml(s.name)}</option>`)
    .join("");

  const form = document.createElement("form");
  form.innerHTML = `
    <div class="field">
      <label>Título</label>
      <input type="text" name="title" value="${escapeHtml(existing?.title || "")}" placeholder="Título de la nota">
    </div>
    <div class="field">
      <label>Contenido</label>
      <textarea name="content" rows="7" placeholder="Escribe aquí...">${escapeHtml(existing?.content || "")}</textarea>
    </div>
    <div class="field">
      <label>Asignatura</label>
      <select name="subjectId">
        <option value="">Sin asignatura</option>
        ${subjectOptions}
      </select>
    </div>
    <div class="field">
      <label>Etiquetas (separadas por coma)</label>
      <input type="text" name="tags" value="${escapeHtml((existing?.tags || []).join(", "))}" placeholder="apuntes, repaso...">
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-picker" id="color-picker">
        ${PALETTE.map((c) => `<span class="color-swatch ${((existing?.color || "violet") === c.id) ? "selected" : ""}" data-color="${c.id}" style="background:${c.value}"></span>`).join("")}
      </div>
      <input type="hidden" name="color" value="${existing?.color || "violet"}">
    </div>
    <div class="modal-footer">
      ${existing ? `<button type="button" class="btn btn-danger" id="note-delete" style="margin-right:auto">Eliminar</button>` : ""}
      <button type="button" class="btn" id="note-cancel">Cancelar</button>
      <button type="submit" class="btn btn-primary">${existing ? "Guardar" : "Crear nota"}</button>
    </div>
  `;

  const attachField = new AttachmentsField({
    mode: existing ? "edit" : "create",
    attachments: existing?.attachments || [],
    kind: "note",
    entityId: existing?.id || null,
  });
  form.querySelector(".modal-footer").insertAdjacentElement("beforebegin", attachField.el);

  openModal(existing ? "Editar nota" : "Nueva nota", form);

  const colorInput = form.querySelector('input[name="color"]');
  form.querySelectorAll(".color-swatch").forEach((sw) => {
    sw.addEventListener("click", () => {
      form.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
      sw.classList.add("selected");
      colorInput.value = sw.dataset.color;
    });
  });

  form.querySelector("#note-cancel").addEventListener("click", closeModal);
  if (existing) {
    form.querySelector("#note-delete").addEventListener("click", () => {
      confirmAction("¿Eliminar esta nota?", () => {
        deleteNote(existing.id);
        closeModal();
        showToast("Nota eliminada");
        document.dispatchEvent(new CustomEvent("app:refresh"));
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const tags = String(fd.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean);
    const data = {
      title: fd.get("title") || "Sin título",
      content: fd.get("content") || "",
      tags,
      subjectId: fd.get("subjectId") || null,
      color: fd.get("color"),
    };
    if (existing) {
      updateNote(existing.id, data);
      showToast("Nota actualizada");
    } else {
      const created = addNote(data);
      await attachField.commitCreate("note", created.id);
      showToast("Nota creada");
    }
    closeModal();
    document.dispatchEvent(new CustomEvent("app:refresh"));
  });
}
