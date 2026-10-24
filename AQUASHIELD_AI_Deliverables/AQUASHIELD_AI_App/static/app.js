let incidentData = [];
let taskData = [];
let map = null;
let markers = [];
const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function priorityClass(score) { return score >= 90 ? "critical" : score >= 70 ? "high" : "other"; }
function statusClass(status) { return status === "Resolved" || status === "Completed" ? "resolved" : status === "In Progress" ? "progress" : ""; }

function initMap() {
  if (!window.L) {
    $("map").innerHTML = '<div class="empty">Map library could not load. Check internet access, then refresh.</div>';
    return;
  }
  map = L.map("map").setView([13.339, 78.754], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function renderMap() {
  if (!map) return;
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  incidentData.forEach(item => {
    const color = item.priority >= 90 ? "#dc3545" : item.priority >= 70 ? "#f59e0b" : "#4d57ef";
    const marker = L.circleMarker([item.lat, item.lng], {radius: item.priority >= 90 ? 10 : 8, color, fillColor: color, fillOpacity: .8, weight: 2})
      .bindPopup(`<strong>${escapeHtml(item.title)}</strong><br>Priority: ${item.priority}/100<br>Severity: ${escapeHtml(item.severity)}<br>Status: ${escapeHtml(item.status)}<br>Rainfall: ${escapeHtml(item.rainfall_mm)} mm`);
    marker.addTo(map);
    markers.push(marker);
  });
}

function renderIncidents() {
  const open = incidentData.filter(i => i.status !== "Resolved");
  $("openCount").textContent = open.length;
  $("urgentCount").textContent = incidentData.filter(i => i.status !== "Resolved" && i.priority >= 70).length;
  $("resolvedCount").textContent = incidentData.filter(i => i.status === "Resolved").length;
  $("incidentCount").textContent = incidentData.length;
  $("incidentList").innerHTML = [...incidentData].sort((a,b) => b.priority-a.priority).map(item => `
    <div class="incident-row">
      <div class="priority-line ${priorityClass(item.priority)}"></div>
      <div><div class="incident-title">${escapeHtml(item.title)}</div>
      <div class="incident-meta">${escapeHtml(item.category)} · ${escapeHtml(item.severity)} · ${escapeHtml(item.rainfall_mm)} mm rain<br>${escapeHtml(item.drainage)} · #${item.id}</div>
      <div class="row-actions"><select class="mini-select" aria-label="Update incident status" data-incident-status="${item.id}">
        ${["Reported","Assigned","In Progress","Resolved"].map(s=>`<option ${s===item.status?"selected":""}>${s}</option>`).join("")}
      </select></div></div>
      <div class="incident-score"><div class="score">${item.priority}</div><div class="score-caption">PRIORITY / 100</div><span class="status-pill ${priorityClass(item.priority)}">${escapeHtml(item.status)}</span></div>
    </div>`).join("") || '<div class="empty">No incidents reported.</div>';
  const select = $("taskIncident");
  const current = select.value;
  select.innerHTML = [...incidentData].sort((a,b)=>b.priority-a.priority).map(i=>`<option value="${i.id}">#${i.id} · ${escapeHtml(i.title)}</option>`).join("");
  if ([...select.options].some(o => o.value === current)) select.value = current;
  renderMap();
}
function renderTasks() {
  $("progressCount").textContent = taskData.filter(t => t.status === "In Progress").length;
  $("taskList").innerHTML = [...taskData].sort((a,b)=>b.id-a.id).map(t => `
    <div class="task-item"><div class="task-item-head"><strong>${escapeHtml(t.title)}</strong><span class="status-pill">${escapeHtml(t.status)}</span></div>
    <p>Incident #${t.incident_id} · ${escapeHtml(t.team)}</p>
    <div class="task-item-foot"><small>Due: ${escapeHtml(t.due)}</small><select class="mini-select" aria-label="Update task status" data-task-status="${t.id}">
      ${["Assigned","In Progress","Completed"].map(s=>`<option ${s===t.status?"selected":""}>${s}</option>`).join("")}
    </select></div></div>`).join("") || '<div class="empty">No municipal tasks yet.</div>';
}
async function api(url, options={}) {
  const response = await fetch(url, {headers: {"Content-Type":"application/json"}, ...options});
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}
async function refresh() {
  [incidentData, taskData] = await Promise.all([api("/api/incidents"), api("/api/tasks")]);
  renderIncidents(); renderTasks();
}
function showMessage(id, message, error=false) {
  const el = $(id); el.textContent = message; el.classList.toggle("error", error);
}
$("incidentForm").addEventListener("submit", async e => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const payload = Object.fromEntries(form.entries());
  ["rainfall_mm","lat","lng"].forEach(k => payload[k] = Number(payload[k]));
  try {
    const result = await api("/api/incidents", {method:"POST", body:JSON.stringify(payload)});
    showMessage("reportMessage", `Incident #${result.id} saved. Priority score: ${result.priority}/100.`);
    e.currentTarget.reset();
    e.currentTarget.elements.rainfall_mm.value = 45;
    e.currentTarget.elements.lat.value = 13.3390;
    e.currentTarget.elements.lng.value = 78.7540;
    await refresh();
  } catch(err) { showMessage("reportMessage", err.message, true); }
});
$("taskForm").addEventListener("submit", async e => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
  try {
    const result = await api("/api/tasks", {method:"POST", body:JSON.stringify(payload)});
    showMessage("taskMessage", `Task #${result.id} created and assigned.`);
    e.currentTarget.elements.title.value = "";
    await refresh();
  } catch(err) { showMessage("taskMessage", err.message, true); }
});
document.addEventListener("change", async e => {
  const el = e.target;
  try {
    if (el.dataset.incidentStatus) {
      await api(`/api/incidents/${el.dataset.incidentStatus}`, {method:"PATCH", body:JSON.stringify({status:el.value})});
      await refresh();
    }
    if (el.dataset.taskStatus) {
      await api(`/api/tasks/${el.dataset.taskStatus}`, {method:"PATCH", body:JSON.stringify({status:el.value})});
      await refresh();
    }
  } catch(err) { alert(err.message); await refresh(); }
});
$("resetDemo").addEventListener("click", async () => {
  if (!confirm("Restore the original sample incidents and tasks? Your demo changes will be overwritten.")) return;
  try { await api("/api/reset-demo", {method:"POST", body:"{}"}); await refresh(); }
  catch(err) { alert(err.message); }
});
function syncSliderLabels() {
  $("rainValue").textContent = $("rainSlider").value;
  $("blockValue").textContent = $("blockSlider").value;
  $("riverValue").textContent = $("riverSlider").value;
}
["rainSlider","blockSlider","riverSlider"].forEach(id => $(id).addEventListener("input", syncSliderLabels));
async function runSimulation() {
  const payload = {rainfall_mm:Number($("rainSlider").value), blockage:Number($("blockSlider").value), river_level:Number($("riverSlider").value)};
  try {
    const result = await api("/api/simulate", {method:"POST", body:JSON.stringify(payload)});
    $("riskScore").textContent = result.risk;
    $("riskLabel").textContent = result.label;
    $("riskBar").style.width = `${result.risk}%`;
    $("riskBar").style.background = result.risk >= 75 ? "#dc3545" : result.risk >= 55 ? "#f59e0b" : result.risk >= 35 ? "#4d57ef" : "#1f9b70";
    $("riskScore").style.color = result.risk >= 75 ? "#dc3545" : result.risk >= 55 ? "#c17b11" : "#4d57ef";
    $("riskAdvice").textContent = result.advice;
  } catch(err) { $("riskAdvice").textContent = err.message; }
}
$("runSimulation").addEventListener("click", runSimulation);
initMap();
syncSliderLabels();
refresh().then(runSimulation).catch(err => console.error(err));


async function loadAlertConfig() {
  try {
    const cfg = await api("/api/alerts/config");
    $("smsEnabled").checked = !!cfg.sms_enabled;
    $("sirenEnabled").checked = !!cfg.siren_enabled;
    $("phoneNumbers").value = (cfg.phone_numbers || []).join("\n");
  } catch (err) {
    showMessage("alertMessageStatus", err.message, true);
  }
}
$("alertForm").addEventListener("submit", async e => {
  e.preventDefault();
  const phone_numbers = $("phoneNumbers").value.split(/\n|,/).map(n => n.trim()).filter(Boolean);
  try {
    const result = await api("/api/alerts/config", {
      method: "POST",
      body: JSON.stringify({
        sms_enabled: $("smsEnabled").checked,
        siren_enabled: $("sirenEnabled").checked,
        phone_numbers
      })
    });
    showMessage("alertMessageStatus", result.message);
  } catch(err) {
    showMessage("alertMessageStatus", err.message, true);
  }
});
$("testAlert").addEventListener("click", async () => {
  try {
    const result = await api("/api/alerts/test", {
      method: "POST",
      body: JSON.stringify({message: $("alertMessage").value})
    });
    showMessage("alertMessageStatus", result.notice + " Check the Flask terminal for the simulated event.");
  } catch(err) {
    showMessage("alertMessageStatus", err.message, true);
  }
});
loadAlertConfig();


// Local computer-speaker alarm demo. It plays only after an explicit user click.
// Browser permissions/device volume can prevent audible output.
let speakerAudioContext = null;
let speakerOscillators = [];
let speakerStopTimer = null;

function stopSpeakerAlarm() {
  if (speakerStopTimer) {
    clearTimeout(speakerStopTimer);
    speakerStopTimer = null;
  }
  speakerOscillators.forEach(osc => {
    try { osc.stop(); } catch (_) {}
  });
  speakerOscillators = [];
  if (speakerAudioContext && speakerAudioContext.state !== "closed") {
    speakerAudioContext.close().catch(() => {});
  }
  speakerAudioContext = null;
}
function playSpeakerAlarm() {
  stopSpeakerAlarm();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    showMessage("alertMessageStatus", "This browser does not support the Web Audio API. Try a recent Chrome or Edge browser.", true);
    return;
  }
  try {
    speakerAudioContext = new AudioCtx();
    const ctx = speakerAudioContext;
    const gain = ctx.createGain();
    gain.gain.value = 0.055;
    gain.connect(ctx.destination);
    const start = ctx.currentTime;
    // Three short, moderate-volume alternating tones; local demo only.
    [880, 660, 880, 660, 880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      const t = start + i * 0.24;
      osc.start(t);
      osc.stop(t + 0.16);
      speakerOscillators.push(osc);
    });
    showMessage("alertMessageStatus", "Playing a short alarm tone on this computer only. This is not a real public siren.");
    speakerStopTimer = setTimeout(stopSpeakerAlarm, 1900);
  } catch (err) {
    stopSpeakerAlarm();
    showMessage("alertMessageStatus", "Could not play the alarm. Check browser audio permissions and device volume.", true);
  }
}
if ($("speakerTest")) {
  $("speakerTest").addEventListener("click", async () => {
    try {
      const result = await api("/api/alerts/speaker-test", {method:"POST", body:"{}"});
      playSpeakerAlarm();
    } catch(err) {
      showMessage("alertMessageStatus", err.message, true);
    }
  });
}
if ($("stopSpeaker")) {
  $("stopSpeaker").addEventListener("click", () => {
    stopSpeakerAlarm();
    showMessage("alertMessageStatus", "Computer alarm stopped.");
  });
}
