import { getState, addEvent, updateEvent, deleteEvent } from "../store.js";
import { openModal, closeModal, showToast, confirmAction } from "../ui.js";
import { escapeHtml, PALETTE, colorFor, relativeDayLabel, todayISO, EVENT_TYPES, eventTypeLabel } from "../utils.js";
import { AttachmentsField, attachmentBadge } from "../attachments.js";
import { createDatePicker, createTimePicker } from "../pickers.js";

let filter = "upcoming"; // upcoming | past | all

export function renderEventsView(container) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="filter-bar">
      ${chip("upcoming", "Próximos")}
      ${chip("past", "Pasados")}
      ${chip("all", "Todos")}
    </div>
    <div class="list" id="event-list"></div>
  `;
  container.appendChild(wrap);
  wrap.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => { filter = btn.dataset.filter; renderEventsView(container); });
  });
  renderList(wrap.querySelector("#event-list"));
}

function chip(id, label) {
  return `<button class="chip ${filter === id ? "active" : ""}" data-filter="${id}">${label}</button>`;
}

function getEvents() {
  const state = getState();
  const today = todayISO();
  let list = [...state.events];
  if (filter === "upcoming") list = list.filter((e) => e.date >= today);
  else if (filter === "past") list = list.filter((e) => e.date < today);
  list.sort((a, b) => {
    const ak = a.date + (a.startTime || "00:00");
    const bk = b.date + (b.startTime || "00:00");
    return filter === "past" ? (bk < ak ? -1 : 1) : (ak < bk ? -1 : 1);
  });
  return list;
}

function renderList(listEl) {
  const events = getEvents();
  if (!events.length) {
    listEl.innerHTML = `<div class="empty-state">No hay eventos aquí. Crea uno con "+ Nuevo evento".</div>`;
    return;
  }
  listEl.innerHTML = events.map((e) => `
    <div class="task-item">
      <div class="dot" style="background:${colorFor(e.color)};margin-top:6px"></div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(e.title)}</div>
        ${e.description ? `<div class="task-desc">${escapeHtml(e.description)}</div>` : ""}
        <div class="task-meta">
          <span class="badge badge-accent">${relativeDayLabel(e.date)}${e.startTime ? " · " + e.startTime + (e.endTime ? "–" + e.endTime : "") : ""}</span>
          ${e.type && e.type !== "otro" ? `<span class="badge ${e.type === "examen" ? "badge-danger" : "badge-warning"}">${eventTypeLabel(e.type)}</span>` : ""}
          ${e.location ? `<span class="badge"><svg class="icon" style="width:12px;height:12px"><use href="#icon-location"/></svg> ${escapeHtml(e.location)}</span>` : ""}
          ${attachmentBadge(e.attachments)}
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" data-edit="${e.id}"><svg class="icon"><use href="#icon-edit"/></svg></button>
        <button class="icon-btn danger" data-del="${e.id}"><svg class="icon"><use href="#icon-trash"/></svg></button>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll("[data-edit]").forEach((elm) => {
    elm.addEventListener("click", () => openEventModal(getState().events.find((e) => e.id === elm.dataset.edit)));
  });
  listEl.querySelectorAll("[data-del]").forEach((elm) => {
    elm.addEventListener("click", () => {
      confirmAction("¿Eliminar este evento?", () => {
        deleteEvent(elm.dataset.del);
        renderList(listEl);
        showToast("Evento eliminado");
      });
    });
  });
}

export function openEventModal(existing, prefillDate) {
  const form = document.createElement("form");
  form.innerHTML = `
    <div class="field">
      <label>Título</label>
      <input type="text" name="title" required value="${escapeHtml(existing?.title || "")}" placeholder="Nombre del evento">
    </div>
    <div class="field-row">
      <div class="field">
        <label>Fecha</label>
        <div data-slot="date"></div>
      </div>
      <div class="field">
        <label>Tipo</label>
        <select name="type">
          ${EVENT_TYPES.map((t) => `<option value="${t.id}" ${(existing?.type || "otro") === t.id ? "selected" : ""}>${t.label}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Hora inicio</label>
        <div data-slot="startTime"></div>
      </div>
      <div class="field">
        <label>Hora fin</label>
        <div data-slot="endTime"></div>
      </div>
    </div>
    <div class="field">
      <label>Lugar</label>
      <input type="text" name="location" value="${escapeHtml(existing?.location || "")}" placeholder="Opcional">
    </div>
    <div class="field">
      <label>Notas</label>
      <textarea name="description" placeholder="Opcional">${escapeHtml(existing?.description || "")}</textarea>
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-picker" id="color-picker">
        ${PALETTE.map((c) => `<span class="color-swatch ${((existing?.color || "violet") === c.id) ? "selected" : ""}" data-color="${c.id}" style="background:${c.value}"></span>`).join("")}
      </div>
      <input type="hidden" name="color" value="${existing?.color || "violet"}">
    </div>
    <div class="modal-footer">
      ${existing ? `<button type="button" class="btn btn-danger" id="event-delete" style="margin-right:auto">Eliminar</button>` : ""}
      <button type="button" class="btn" id="event-cancel">Cancelar</button>
      <button type="submit" class="btn btn-primary">${existing ? "Guardar" : "Crear evento"}</button>
    </div>
  `;

  const datePicker = createDatePicker({ name: "date", value: existing?.date || prefillDate || todayISO(), allowClear: false });
  form.querySelector('[data-slot="date"]').replaceWith(datePicker.el);
  const startTimePicker = createTimePicker({ name: "startTime", value: existing?.startTime || "" });
  form.querySelector('[data-slot="startTime"]').replaceWith(startTimePicker.el);
  const endTimePicker = createTimePicker({ name: "endTime", value: existing?.endTime || "" });
  form.querySelector('[data-slot="endTime"]').replaceWith(endTimePicker.el);

  const attachField = new AttachmentsField({
    mode: existing ? "edit" : "create",
    attachments: existing?.attachments || [],
    kind: "event",
    entityId: existing?.id || null,
  });
  form.querySelector(".modal-footer").insertAdjacentElement("beforebegin", attachField.el);

  openModal(existing ? "Editar evento" : "Nuevo evento", form);

  const colorInput = form.querySelector('input[name="color"]');
  form.querySelectorAll(".color-swatch").forEach((sw) => {
    sw.addEventListener("click", () => {
      form.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
      sw.classList.add("selected");
      colorInput.value = sw.dataset.color;
    });
  });

  form.querySelector("#event-cancel").addEventListener("click", closeModal);
  if (existing) {
    form.querySelector("#event-delete").addEventListener("click", () => {
      confirmAction("¿Eliminar este evento?", () => {
        deleteEvent(existing.id);
        closeModal();
        showToast("Evento eliminado");
        document.dispatchEvent(new CustomEvent("app:refresh"));
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      title: fd.get("title"),
      date: fd.get("date"),
      startTime: fd.get("startTime") || null,
      endTime: fd.get("endTime") || null,
      location: fd.get("location"),
      description: fd.get("description"),
      type: fd.get("type"),
      color: fd.get("color"),
    };
    if (!data.title.trim() || !data.date) return;
    if (existing) {
      updateEvent(existing.id, data);
      showToast("Evento actualizado");
    } else {
      const created = addEvent(data);
      await attachField.commitCreate("event", created.id);
      showToast("Evento creado");
    }
    closeModal();
    document.dispatchEvent(new CustomEvent("app:refresh"));
  });
}
