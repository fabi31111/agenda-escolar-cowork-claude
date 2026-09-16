// Widget reutilizable para adjuntar archivos a tareas, asignaturas, eventos y notas.

import { putFile, getFile } from "./files.js";
import { addAttachmentMeta, removeAttachmentMeta } from "./store.js";
import { uid, escapeHtml } from "./utils.js";
import { showToast } from "./ui.js";

const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 MB por archivo

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function openBlobInNewTab(blob, name) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Gestiona la lista de adjuntos de un formulario.
 * mode "create": los archivos se guardan en memoria y se escriben en IndexedDB
 *   recién cuando se llama a commitCreate(kind, entityId), tras crear la entidad.
 * mode "edit": los archivos se escriben/borran de inmediato (kind + entityId ya existen).
 */
export class AttachmentsField {
  constructor({ mode, attachments = [], kind = null, entityId = null }) {
    this.mode = mode;
    this.kind = kind;
    this.entityId = entityId;
    this.items = attachments.map((a) => ({ ...a }));
    this.el = document.createElement("div");
    this.el.className = "field attach-field";
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <label>Adjuntos</label>
      <div class="attach-list"></div>
      <label class="attach-upload btn btn-sm">
        <svg class="icon" style="width:15px;height:15px"><use href="#icon-attach"/></svg>
        <span>Adjuntar archivo</span>
        <input type="file" multiple class="attach-input" style="display:none">
      </label>
    `;
    const list = this.el.querySelector(".attach-list");
    if (!this.items.length) {
      list.innerHTML = `<div class="attach-empty">Sin archivos adjuntos.</div>`;
    } else {
      list.innerHTML = this.items.map((it) => `
        <div class="attach-chip" data-id="${it.id}">
          <svg class="icon" style="width:16px;height:16px"><use href="#icon-file"/></svg>
          <span class="attach-name" title="${escapeHtml(it.name)}">${escapeHtml(it.name)}</span>
          <span class="attach-size">${formatFileSize(it.size)}</span>
          <button type="button" class="icon-btn attach-open" data-open="${it.id}" title="Abrir">
            <svg class="icon" style="width:15px;height:15px"><use href="#icon-download"/></svg>
          </button>
          <button type="button" class="icon-btn danger attach-remove" data-remove="${it.id}" title="Quitar">
            <svg class="icon" style="width:15px;height:15px"><use href="#icon-close"/></svg>
          </button>
        </div>
      `).join("");
    }

    this.el.querySelector(".attach-input").addEventListener("change", (e) => {
      this.handleFiles(e.target.files);
      e.target.value = "";
    });
    list.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => this.openItem(btn.dataset.open));
    });
    list.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => this.removeItem(btn.dataset.remove));
    });
  }

  async handleFiles(fileList) {
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_BYTES) {
        showToast(`"${file.name}" supera ${formatFileSize(MAX_FILE_BYTES)} y no se adjuntó`);
        continue;
      }
      const id = uid();
      if (this.mode === "edit") {
        await putFile(id, file);
        const meta = { id, name: file.name, type: file.type, size: file.size, addedAt: Date.now() };
        addAttachmentMeta(this.kind, this.entityId, meta);
        this.items.push(meta);
      } else {
        this.items.push({ id, name: file.name, type: file.type, size: file.size, file });
      }
    }
    this.render();
  }

  removeItem(id) {
    if (this.mode === "edit") {
      removeAttachmentMeta(this.kind, this.entityId, id);
    }
    this.items = this.items.filter((it) => it.id !== id);
    this.render();
  }

  async openItem(id) {
    const item = this.items.find((it) => it.id === id);
    if (!item) return;
    const blob = item.file || (await getFile(id));
    if (!blob) return;
    if (blob.type && blob.type.startsWith("image/")) {
      openBlobInNewTab(blob, item.name);
    } else {
      downloadBlob(blob, item.name);
    }
  }

  // Vuelca los adjuntos pendientes (mode "create") a IndexedDB + store, una vez creada la entidad.
  async commitCreate(kind, entityId) {
    if (this.mode !== "create") return;
    for (const it of this.items) {
      await putFile(it.id, it.file);
      addAttachmentMeta(kind, entityId, { id: it.id, name: it.name, type: it.type, size: it.size, addedAt: Date.now() });
    }
  }
}

export function attachmentBadge(attachments) {
  const count = (attachments || []).length;
  if (!count) return "";
  return `<span class="badge"><svg class="icon" style="width:12px;height:12px"><use href="#icon-attach"/></svg>${count}</span>`;
}
