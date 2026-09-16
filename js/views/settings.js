import { getState, setTheme, setAccentColor } from "../store.js";
import { openModal, closeModal } from "../ui.js";
import { PALETTE } from "../utils.js";

const THEME_OPTIONS = [
  { id: "light", label: "Claro", icon: "icon-sun" },
  { id: "dark", label: "Oscuro", icon: "icon-moon" },
  { id: "auto", label: "Sistema", icon: "icon-monitor" },
];

export function openSettingsModal() {
  const wrap = document.createElement("div");
  render();
  openModal("Ajustes", wrap);

  function render() {
    const state = getState();
    wrap.innerHTML = `
      <div class="field">
        <label>Tema</label>
        <div class="theme-options">
          ${THEME_OPTIONS.map((t) => `
            <button type="button" class="theme-option ${state.theme === t.id ? "selected" : ""}" data-theme="${t.id}">
              <svg class="icon"><use href="#${t.icon}"/></svg>
              <span>${t.label}</span>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="field">
        <label>Color de acento</label>
        <div class="color-picker">
          ${PALETTE.map((c) => `<span class="color-swatch ${state.accentColor === c.id ? "selected" : ""}" data-color="${c.id}" style="background:${c.value}"></span>`).join("")}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" id="settings-done">Listo</button>
      </div>
    `;

    wrap.querySelectorAll("[data-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setTheme(btn.dataset.theme);
        render();
      });
    });
    wrap.querySelectorAll(".color-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        setAccentColor(sw.dataset.color);
        render();
      });
    });
    wrap.querySelector("#settings-done").addEventListener("click", closeModal);
  }
}
