const $ = (sel) => document.querySelector(sel);

const taskEl = $("#task");
const startEl = $("#start");
const endEl   = $("#end");
const form = $("#task-form");
const durationPreview = $("#durationPreview");
const entriesEl = $("#entries");
const totalMinutesEl = $("#totalMinutes");
const totalPrettyEl = $("#totalPretty");
const importBtn = $("#importBtn");
const exportBtn = $("#exportBtn");
const clearBtn  = $("#clearBtn");
const importDialog = $("#importDialog");
const chooseFileBtn = $("#chooseFileBtn");
const fileInput = $("#fileInput");
const expandBtn = $("#expandBtn");
const copyReportBtn = $("#copyReportBtn");
const clockToggle = $("#clockToggle");
const startNowBtn = $("#startNowBtn");
const addBtn = $("#addBtn");

let entries = []; // {id, task, start, end, minutes, isActive, createdAt}
let clockEnabled = true;
let tickTimer = null;

/* ---------- Helpers ---------- */
const pad = (n) => String(n).padStart(2, "0");
const nowHHMM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
function parseTimeToMinutes(t) {
  const [h, m] = (t || "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
// --- AM/PM label (mantiene HH tal cual en 00-23) ---
function labelAMPM(hhmm){
  if(!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const mer = (h >= 0 && h < 12) ? "AM" : "PM";
  return `${hStr}:${mStr}${mer}`;
}
function minutesToPretty(mins) { // HH:MM
  const h = Math.floor(mins / 60);
  const m = Math.abs(mins % 60);
  return `${h}:${pad(m)}h`;
}
function diffMinutes(startHHMM, endHHMM) {
  const s = parseTimeToMinutes(startHHMM);
  const e = parseTimeToMinutes(endHHMM);
  if (s == null || e == null) return 0;
  return e >= s ? (e - s) : ((e + 24 * 60) - s);
}
function computeMinutes(entry) {
  const minutesField = Number(entry.minutes);
  const hasMinutes = !Number.isNaN(minutesField);

  const base = hasMinutes
    ? minutesField
    : ((entry.start && entry.end) ? diffMinutes(entry.start, entry.end) : 0);

  if (entry.isActive) {
    const since = entry.activeSince || entry.start;
    if (!since) return base;
    return base + diffMinutes(since, nowHHMM());
  }

  return base;
}

function updatePreview() {
  if (!startEl.value || !endEl.value) {
    durationPreview.textContent = `0 min (0:00h)`;
    return;
  }
  const mins = diffMinutes(startEl.value, endEl.value);
  durationPreview.textContent = `${mins} min (${minutesToPretty(mins)})`;
}

/* ---------- Storage ---------- */
function save() { chrome.storage.local.set({ entries, clockEnabled }, () => {}); }
function load() {
  chrome.storage.local.get(["entries", "clockEnabled"], (data) => {
    entries = Array.isArray(data.entries) ? data.entries : [];
    clockEnabled = data.clockEnabled !== false; // default ON
    clockToggle.checked = clockEnabled;
    setClockUI(clockEnabled);
    renderList();
    startTick();
  });
}

/* ---------- UI ---------- */
function setClockUI(enabled) {
  document.documentElement.classList.toggle("no-clock", !enabled);
}

function renderList() {
  entriesEl.innerHTML = "";
  let total = 0;

  entries.forEach((it) => {
    const mins = computeMinutes(it);
    total += mins;

    const isPaused =
      !it.isActive &&
      !it.end &&
      !!it.start;

    const li = document.createElement("li");
    li.className = "entry";

    const row1 = document.createElement("div");
    row1.className = "row";

    const taskSpan = document.createElement("span");
    taskSpan.className = "task";
    taskSpan.textContent = it.task || "(Sin nombre)";

    const metaSpan = document.createElement("span");
    metaSpan.className = "meta";

    if (it.isActive) {
      metaSpan.textContent = `(${it.start || "?"} → ahora)`;
    } else if (isPaused) {
      metaSpan.textContent = `(${it.start || "?"} → pausa)`;
    } else {
      metaSpan.textContent = `(${it.start || ""}${it.end ? " → " + it.end : ""})`;
    }

    const right = document.createElement("div");
    right.className = "right";

    const stateChip = document.createElement("span");
    stateChip.className = "pill " + (it.isActive ? "active" : (isPaused ? "paused" : ""));
    stateChip.textContent = it.isActive
      ? "En progreso"
      : (isPaused ? "Pausada" : "Cerrada");

    const minutesChip = document.createElement("span");
    minutesChip.className = "pill";
    minutesChip.textContent = `${mins} min`;

    const prettySmall = document.createElement("span");
    prettySmall.className = "mini";
    prettySmall.textContent = ` (${minutesToPretty(mins)})`;

    right.append(stateChip, minutesChip, prettySmall);

    if (it.isActive || isPaused) {
      const pauseBtn = document.createElement("button");
      pauseBtn.type = "button";
      pauseBtn.textContent = it.isActive ? "Pausar" : "Reanudar";

      pauseBtn.addEventListener("click", () => {
        const base = Number(it.minutes) || 0;

        if (it.isActive) {
          const now = nowHHMM();
          const since = it.activeSince || it.start;
          if (since) {
            it.minutes = base + diffMinutes(since, now);
          } else {
            it.minutes = base;
          }
          it.isActive = false;
          it.activeSince = null;
        } else {
          it.isActive = true;
          it.activeSince = nowHHMM();
        }

        save();
        renderList();
      });

      right.append(pauseBtn);
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = (it.isActive || isPaused) ? "Cerrar" : "Eliminar";

    closeBtn.addEventListener("click", () => {
      const base = Number(it.minutes) || 0;

      if (it.isActive || isPaused) {
        const now = nowHHMM();

        if (it.isActive) {
          const since = it.activeSince || it.start;
          if (since) {
            it.minutes = base + diffMinutes(since, now);
          } else {
            it.minutes = base;
          }
          it.isActive = false;
          it.activeSince = null;
        } else {
          it.minutes = base;
        }

        if (!it.end) {
          it.end = now;
        }

        save();
        renderList();
      } else {
        entries = entries.filter(e => e.id !== it.id);
        save();
        renderList();
      }
    });

    right.append(closeBtn);
    row1.append(taskSpan, metaSpan, right);
    li.append(row1);
    entriesEl.append(li);
  });

  totalMinutesEl.textContent = `${total} min`;
  totalPrettyEl.textContent = minutesToPretty(total);
}


function startTick(){
  if (tickTimer) clearInterval(tickTimer);
  // actualizar cada 30 s para tareas activas
  tickTimer = setInterval(() => {
    // Si hay alguna activa, re-render para refrescar minutos
    if (entries.some(e => e.isActive)) {
      renderList();
    }
  }, 30 * 1000);
}

/* ---------- Events ---------- */
startNowBtn.addEventListener("click", () => {
  const task = taskEl.value.trim();
  if (!task) { taskEl.focus(); return; }

  const start = nowHHMM();
  const entry = {
    id: crypto.randomUUID(),
    task,
    start,
    end: "",
    minutes: 0,
    isActive: true,
    activeSince: start,
    createdAt: Date.now(),
  };

  entries.unshift(entry);
  taskEl.value = "";
  save();
  renderList();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const task = taskEl.value.trim();
  const startV = startEl.value;
  const endV = endEl.value;

  if (!task) { taskEl.focus(); return; }

  if (startV && endV) {
    const minutes = diffMinutes(startV, endV);
    entries.unshift({
      id: crypto.randomUUID(),
      task,
      start: startV,
      end: endV,
      minutes,
      isActive: false,
      createdAt: Date.now(),
    });
  } else if (startV && !endV) {
    const startM = startV;
    entries.unshift({
      id: crypto.randomUUID(),
      task,
      start: startM,
      end: "",
      minutes: 0,
      isActive: true,
      activeSince: startM,
      createdAt: Date.now(),
    });
  } else {
    const start = nowHHMM();
    entries.unshift({
      id: crypto.randomUUID(),
      task,
      start,
      end: "",
      minutes: 0,
      isActive: true,
      activeSince: start,
      createdAt: Date.now(),
    });
  }

  save();
  renderList();
  form.reset();
  updatePreview();
});

clearBtn.addEventListener("click", () => {
  if (entries.length === 0) return;
  if (confirm("¿Borrar todos los registros?")) { entries = []; save(); renderList(); }
});

[startEl, endEl].forEach(el => {
  el.addEventListener("input", updatePreview);
  el.addEventListener("change", updatePreview);
});

clockToggle.addEventListener("change", () => {
  clockEnabled = clockToggle.checked;
  setClockUI(clockEnabled);
  save();
});

importBtn.addEventListener("click", () => importDialog.showModal());
$("#closeImport").addEventListener("click", () => importDialog.close());
chooseFileBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  const text = await file.text();
  const isCSV = file.name.toLowerCase().endsWith(".csv");
  const newItems = isCSV ? parseCSV(text) : parseTXT(text);
  if (newItems.length === 0) return alert("No se encontraron filas válidas.");
  entries = [...newItems, ...entries]; save(); renderList(); importDialog.close(); fileInput.value = "";
});

exportBtn.addEventListener("click", () => {
  const header = "tarea,inicio,fin,estado,duracion_minutos,duracion_HH:MM\n";
  const rows = entries.map(e => {
    const mins = computeMinutes(e);
    const estado = e.isActive ? "en_progreso" : "cerrada";
    return [
      csvEscape(e.task),
      e.start || "",
      e.end || "",
      estado,
      mins,
      minutesToPretty(mins).replace('h','')
    ].join(",");
  });
  const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tiempo_tareas_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

expandBtn.addEventListener("click", () => {
  const url = chrome.runtime.getURL("popup.html");
  window.open(url, "_blank");
});

copyReportBtn.addEventListener("click", async () => {
  const totalText = totalPrettyEl.textContent.replace('h','');
  const text = `Total: ${totalText} horas`;
  try {
    await navigator.clipboard.writeText(text);
    copyReportBtn.textContent = "Copiado ✓";
    setTimeout(() => copyReportBtn.textContent = "Copiar reporte", 1200);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
    copyReportBtn.textContent = "Copiado ✓";
    setTimeout(() => copyReportBtn.textContent = "Copiar reporte", 1200);
  }
});

/* ---------- Import parsers (igual que antes) ---------- */
function parseCSV(t) {
  const out = [];
  const lines = t.split(/\r?\n/).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    if (i === 0 && /^tarea\s*,\s*inicio/i.test(raw)) continue;

    const cols = splitCSV(raw);
    if (cols.length < 3) continue;
    const [task, start, end] = cols.map(c => c.trim());
    const mins = start && end ? diffMinutes(start, end) : 0;
    out.push({
      id: crypto.randomUUID(),
      task,
      start: start || "",
      end: end || "",
      minutes: mins,
      isActive: !!(start && !end),
      createdAt: Date.now()
    });
  }
  return out;
}
function parseTXT(t) {
  const out = [];
  const lines = t.split(/\r?\n/).filter(Boolean);
  const re = /^\s*(\d{1,2}):(\d{2})h?\s+(.+?)\s*$/i;
  for (const raw of lines) {
    const m = raw.match(re);
    if (!m) continue;
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const task = m[3].trim();
    if (Number.isNaN(hh) || Number.isNaN(mm) || !task) continue;
    const mins = (hh * 60) + mm;
    out.push({ id: crypto.randomUUID(), task, start: "", end: "", minutes: mins, isActive: false, createdAt: Date.now() });
  }
  return out;
}
function splitCSV(line) {
  const res = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (ch === ',' && !inQ) { res.push(cur); cur = ""; }
    else { cur += ch; }
  }
  res.push(cur); return res;
}
function csvEscape(s) {
  if (s == null) return "";
  const needs = /[",\n]/.test(s);
  return needs ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  load();
  updatePreview();
});
