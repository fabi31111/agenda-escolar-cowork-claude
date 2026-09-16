// Helpers de interfaz compartidos: modal, toast, confirmación.

import { qs } from "./utils.js";

const overlay = qs("#modal-overlay");
const modalTitle = qs("#modal-title");
const modalBody = qs("#modal-body");
const modalCloseBtn = qs("#modal-close");
const toastEl = qs("#toast");

let closeHandler = null;

export function openModal(title, bodyEl, { onClose } = {}) {
  modalTitle.textContent = title;
  modalBody.innerHTML = "";
  if (typeof bodyEl === "string") {
    modalBody.innerHTML = bodyEl;
  } else {
    modalBody.appendChild(bodyEl);
  }
  overlay.classList.add("open");
  closeHandler = onClose || null;
  const firstInput = modalBody.querySelector("input, textarea, select");
  if (firstInput) setTimeout(() => firstInput.focus(), 30);
}

export function closeModal() {
  overlay.classList.remove("open");
  modalBody.innerHTML = "";
  if (closeHandler) closeHandler();
  closeHandler = null;
}

modalCloseBtn.addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
});

let toastTimer = null;
export function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

export function confirmAction(message, onConfirm) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <p style="font-size:14px;color:var(--text-dim);margin-bottom:18px;">${message}</p>
    <div class="modal-footer">
      <button class="btn" id="confirm-cancel">Cancelar</button>
      <button class="btn btn-danger" id="confirm-ok">Eliminar</button>
    </div>
  `;
  openModal("Confirmar", wrap);
  wrap.querySelector("#confirm-cancel").addEventListener("click", closeModal);
  wrap.querySelector("#confirm-ok").addEventListener("click", () => {
    onConfirm();
    closeModal();
  });
}
