// Selectores de fecha y hora propios de la app (mismo aspecto en cualquier
// dispositivo/SO, en vez de depender del picker nativo de Android/Windows/etc).

import {
  DOW_LABELS, MONTH_LABELS, toISODate, parseISODate, isoWeekday, todayISO,
} from "./utils.js";

let activePopover = null;

function closeActivePopover() {
  if (activePopover) {
    const p = activePopover;
    activePopover = null;
    p.close();
  }
}

function openPopover(anchor, contentEl) {
  closeActivePopover();

  const pop = document.createElement("div");
  pop.className = "dt-popover";
  pop.appendChild(contentEl);
  document.body.appendChild(pop);

  function position() {
    const r = anchor.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let top = r.bottom + 6;
    let left = r.left;
    if (left + pr.width > window.innerWidth - 10) left = Math.max(10, window.innerWidth - pr.width - 10);
    if (top + pr.height > window.innerHeight - 10) top = Math.max(10, r.top - pr.height - 6);
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
  }

  function onDocMouseDown(e) {
    if (!pop.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) close();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  function onScrollOrResize() {
    position();
  }
  function close() {
    document.removeEventListener("mousedown", onDocMouseDown, true);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("scroll", onScrollOrResize, true);
    window.removeEventListener("resize", onScrollOrResize);
    pop.remove();
    if (activePopover?.pop === pop) activePopover = null;
  }

  position();
  setTimeout(() => document.addEventListener("mousedown", onDocMouseDown, true), 0);
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize);

  activePopover = { pop, close };
  return { close, reposition: position };
}

function formatDatePretty(iso) {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()].slice(0, 3).toLowerCase()} ${d.getFullYear()}`;
}

/**
 * Selector de fecha propio, con un mini-calendario desplegable.
 * Devuelve { el, setValue, getValue }. `el` incluye un input oculto con
 * `name`, así que funciona dentro de un <form> normal con FormData.
 */
export function createDatePicker({ name, value = "", placeholder = "Seleccionar fecha", allowClear = true, onChange } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "dt-field";
  wrap.innerHTML = `
    <input type="hidden" name="${name}" value="${value || ""}">
    <button type="button" class="dt-input">
      <svg class="icon" style="width:16px;height:16px"><use href="#icon-calendar"/></svg>
      <span class="dt-input-text"></span>
    </button>
  `;
  const hidden = wrap.querySelector("input[type=hidden]");
  const textEl = wrap.querySelector(".dt-input-text");
  const btn = wrap.querySelector(".dt-input");

  function setValue(v, fireChange = true) {
    hidden.value = v || "";
    textEl.textContent = v ? formatDatePretty(v) : placeholder;
    textEl.classList.toggle("dt-placeholder", !v);
    if (fireChange) onChange?.(v || "");
  }
  setValue(value, false);

  btn.addEventListener("click", () => {
    let viewMonth = parseISODate(hidden.value || todayISO());
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);

    const content = document.createElement("div");
    content.className = "dt-cal";
    renderCal();
    openPopover(btn, content);

    function renderCal() {
      const first = viewMonth;
      const firstWeekday = isoWeekday(first);
      const gridStart = new Date(first);
      gridStart.setDate(gridStart.getDate() - firstWeekday);
      const selectedISO = hidden.value;
      const today = todayISO();

      let daysHtml = "";
      for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(d.getDate() + i);
        const iso = toISODate(d);
        const outside = d.getMonth() !== first.getMonth();
        daysHtml += `<button type="button" class="dt-day ${outside ? "outside" : ""} ${iso === selectedISO ? "selected" : ""} ${iso === today ? "today" : ""}" data-iso="${iso}">${d.getDate()}</button>`;
      }

      content.innerHTML = `
        <div class="dt-cal-head">
          <button type="button" class="icon-btn" id="dt-prev"><svg class="icon"><use href="#icon-chevron-left"/></svg></button>
          <span>${MONTH_LABELS[first.getMonth()]} ${first.getFullYear()}</span>
          <button type="button" class="icon-btn" id="dt-next"><svg class="icon"><use href="#icon-chevron-right"/></svg></button>
        </div>
        <div class="dt-cal-dow">${DOW_LABELS.map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="dt-cal-grid">${daysHtml}</div>
        <div class="dt-cal-actions">
          <button type="button" class="btn btn-sm" id="dt-today">Hoy</button>
          ${allowClear ? `<button type="button" class="btn btn-sm btn-danger" id="dt-clear">Quitar</button>` : ""}
        </div>
      `;
      content.querySelector("#dt-prev").addEventListener("click", () => {
        viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
        renderCal();
      });
      content.querySelector("#dt-next").addEventListener("click", () => {
        viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
        renderCal();
      });
      content.querySelector("#dt-today").addEventListener("click", () => {
        setValue(todayISO());
        closeActivePopover();
      });
      content.querySelector("#dt-clear")?.addEventListener("click", () => {
        setValue("");
        closeActivePopover();
      });
      content.querySelectorAll(".dt-day").forEach((dayBtn) => {
        dayBtn.addEventListener("click", () => {
          setValue(dayBtn.dataset.iso);
          closeActivePopover();
        });
      });
    }
  });

  return { el: wrap, setValue, getValue: () => hidden.value };
}

/**
 * Selector de hora propio, con columnas de horas y minutos desplegables.
 */
export function createTimePicker({ name, value = "", placeholder = "Seleccionar hora", allowClear = true, minuteStep = 5, onChange } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "dt-field";
  wrap.innerHTML = `
    <input type="hidden" name="${name}" value="${value || ""}">
    <button type="button" class="dt-input">
      <svg class="icon" style="width:16px;height:16px"><use href="#icon-clock"/></svg>
      <span class="dt-input-text"></span>
    </button>
  `;
  const hidden = wrap.querySelector("input[type=hidden]");
  const textEl = wrap.querySelector(".dt-input-text");
  const btn = wrap.querySelector(".dt-input");

  function setValue(v, fireChange = true) {
    hidden.value = v || "";
    textEl.textContent = v || placeholder;
    textEl.classList.toggle("dt-placeholder", !v);
    if (fireChange) onChange?.(v || "");
  }
  setValue(value, false);

  btn.addEventListener("click", () => {
    const hasValue = !!hidden.value;
    const [curH, curM] = hasValue ? hidden.value.split(":").map(Number) : [new Date().getHours(), 0];

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [];
    for (let m = 0; m < 60; m += minuteStep) minutes.push(m);
    if (!minutes.includes(curM)) { minutes.push(curM); minutes.sort((a, b) => a - b); }

    const content = document.createElement("div");
    content.className = "dt-time";
    content.innerHTML = `
      <div class="dt-time-cols">
        <div class="dt-time-col scrollbar-thin" data-col="h">
          ${hours.map((h) => `<button type="button" class="dt-time-opt ${hasValue && h === curH ? "selected" : ""}" data-h="${h}">${String(h).padStart(2, "0")}</button>`).join("")}
        </div>
        <div class="dt-time-col scrollbar-thin" data-col="m">
          ${minutes.map((m) => `<button type="button" class="dt-time-opt ${hasValue && m === curM ? "selected" : ""}" data-m="${m}">${String(m).padStart(2, "0")}</button>`).join("")}
        </div>
      </div>
      <div class="dt-cal-actions">
        <button type="button" class="btn btn-sm" id="dt-time-now">Ahora</button>
        ${allowClear ? `<button type="button" class="btn btn-sm btn-danger" id="dt-time-clear">Quitar</button>` : ""}
        <button type="button" class="btn btn-sm btn-primary" id="dt-time-done" style="margin-left:auto">Listo</button>
      </div>
    `;

    let h = curH;
    let m = curM;
    const hCol = content.querySelector('[data-col="h"]');
    const mCol = content.querySelector('[data-col="m"]');

    function commit() {
      setValue(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }

    hCol.querySelectorAll("[data-h]").forEach((b) => b.addEventListener("click", () => {
      h = Number(b.dataset.h);
      hCol.querySelectorAll(".dt-time-opt").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      commit();
    }));
    mCol.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => {
      m = Number(b.dataset.m);
      mCol.querySelectorAll(".dt-time-opt").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      commit();
    }));
    content.querySelector("#dt-time-now").addEventListener("click", () => {
      const now = new Date();
      const roundedM = Math.round(now.getMinutes() / minuteStep) * minuteStep;
      setValue(`${String(now.getHours()).padStart(2, "0")}:${String(roundedM % 60).padStart(2, "0")}`);
      closeActivePopover();
    });
    content.querySelector("#dt-time-clear")?.addEventListener("click", () => {
      setValue("");
      closeActivePopover();
    });
    content.querySelector("#dt-time-done").addEventListener("click", () => closeActivePopover());

    openPopover(btn, content);
    requestAnimationFrame(() => {
      hCol.querySelector(".selected")?.scrollIntoView({ block: "center" });
      mCol.querySelector(".selected")?.scrollIntoView({ block: "center" });
    });
  });

  return { el: wrap, setValue, getValue: () => hidden.value };
}
