from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from pathlib import Path
from datetime import datetime
import json, threading

app = Flask(__name__)
ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
LOCK = threading.Lock()

SEED_INCIDENTS = [
    {"id": 1001, "title": "Waterlogging near Main Market", "category": "Waterlogging", "severity": "High", "rainfall_mm": 72, "drainage": "Partially blocked", "status": "Reported", "reporter": "Citizen", "lat": 13.3389, "lng": 78.7542, "description": "Water accumulating at the market junction.", "created_at": "2026-10-20 08:40", "priority": 86},
    {"id": 1002, "title": "Blocked drain at Bus Stand Road", "category": "Blocked drain", "severity": "Medium", "rainfall_mm": 48, "drainage": "Blocked", "status": "Assigned", "reporter": "Field worker", "lat": 13.3412, "lng": 78.7488, "description": "Drain grate covered with silt and plastic waste.", "created_at": "2026-10-20 09:05", "priority": 74},
    {"id": 1003, "title": "Flooded underpass", "category": "Road flooding", "severity": "Critical", "rainfall_mm": 91, "drainage": "Blocked", "status": "In Progress", "reporter": "Citizen", "lat": 13.3334, "lng": 78.7605, "description": "Unsafe depth reported by commuters.", "created_at": "2026-10-20 09:22", "priority": 98},
    {"id": 1004, "title": "Overflow near School Street", "category": "Drain overflow", "severity": "High", "rainfall_mm": 64, "drainage": "Needs inspection", "status": "Reported", "reporter": "Citizen", "lat": 13.3451, "lng": 78.7577, "description": "Water nearing the school entrance.", "created_at": "2026-10-20 10:10", "priority": 79},
    {"id": 1005, "title": "Minor pooling at Park Lane", "category": "Waterlogging", "severity": "Low", "rainfall_mm": 22, "drainage": "Clear", "status": "Resolved", "reporter": "Field worker", "lat": 13.3308, "lng": 78.7462, "description": "Shallow pooling cleared after inspection.", "created_at": "2026-10-20 07:50", "priority": 28},
]
SEED_TASKS = [
    {"id": 501, "incident_id": 1003, "title": "Deploy pump to flooded underpass", "team": "Emergency Response A", "status": "In Progress", "due": "Today 12:00"},
    {"id": 502, "incident_id": 1002, "title": "Clear silt from Bus Stand Road drain", "team": "Drainage Team 2", "status": "Assigned", "due": "Today 14:00"},
    {"id": 503, "incident_id": 1001, "title": "Inspect market junction and place barricades", "team": "Ward Team 1", "status": "Assigned", "due": "Today 13:00"},
]

def read_json(filename, fallback):
    path = DATA / filename
    with LOCK:
        if not path.exists():
            path.write_text(json.dumps(fallback, indent=2), encoding="utf-8")
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return fallback

def write_json(filename, value):
    with LOCK:
        (DATA / filename).write_text(json.dumps(value, indent=2), encoding="utf-8")

def incidents():
    return read_json("incidents.json", SEED_INCIDENTS)

def tasks():
    return read_json("tasks.json", SEED_TASKS)

def priority_score(severity, rainfall, drainage):
    severity_points = {"Low": 10, "Medium": 25, "High": 40, "Critical": 50}.get(severity, 20)
    rain_points = min(max(float(rainfall), 0), 150) / 150 * 25
    drainage_points = {"Clear": 0, "Needs inspection": 8, "Partially blocked": 15, "Blocked": 25}.get(drainage, 8)
    return round(min(100, severity_points + rain_points + drainage_points))

@app.route("/")
def dashboard():
    items = incidents()
    task_items = tasks()
    return render_template("index.html", incidents=items, tasks=task_items)

@app.route("/api/incidents", methods=["GET", "POST"])
def api_incidents():
    items = incidents()
    if request.method == "GET":
        return jsonify(sorted(items, key=lambda x: x.get("priority", 0), reverse=True))
    data = request.get_json(silent=True) or request.form.to_dict()
    try:
        lat, lng = float(data.get("lat", 13.339)), float(data.get("lng", 78.754))
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise ValueError()
    except (TypeError, ValueError):
        return jsonify({"error": "Latitude/longitude must be valid coordinates."}), 400
    severity = data.get("severity", "Medium")
    if severity not in ("Low", "Medium", "High", "Critical"):
        return jsonify({"error": "Invalid severity."}), 400
    drainage = data.get("drainage", "Needs inspection")
    if drainage not in ("Clear", "Needs inspection", "Partially blocked", "Blocked"):
        return jsonify({"error": "Invalid drainage status."}), 400
    rainfall = min(max(float(data.get("rainfall_mm", 0)), 0), 300)
    new_id = max([int(x["id"]) for x in items] + [1000]) + 1
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    item = {
        "id": new_id, "title": str(data.get("title", "Flood incident")).strip()[:100] or "Flood incident",
        "category": str(data.get("category", "Waterlogging"))[:50], "severity": severity,
        "rainfall_mm": rainfall, "drainage": drainage, "status": "Reported",
        "reporter": str(data.get("reporter", "Citizen"))[:40], "lat": lat, "lng": lng,
        "description": str(data.get("description", ""))[:500], "created_at": now,
        "priority": priority_score(severity, rainfall, drainage)
    }
    items.append(item)
    write_json("incidents.json", items)
    return jsonify(item), 201

@app.route("/api/incidents/<int:incident_id>", methods=["PATCH"])
def update_incident(incident_id):
    items = incidents()
    data = request.get_json(silent=True) or {}
    for item in items:
        if int(item["id"]) == incident_id:
            status = data.get("status")
            if status not in ("Reported", "Assigned", "In Progress", "Resolved"):
                return jsonify({"error": "Invalid status."}), 400
            item["status"] = status
            write_json("incidents.json", items)
            return jsonify(item)
    return jsonify({"error": "Incident not found."}), 404

@app.route("/api/tasks", methods=["GET", "POST"])
def api_tasks():
    items = tasks()
    if request.method == "GET":
        return jsonify(items)
    data = request.get_json(silent=True) or {}
    try:
        incident_id = int(data.get("incident_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "Choose an incident."}), 400
    if not any(int(i["id"]) == incident_id for i in incidents()):
        return jsonify({"error": "Incident not found."}), 404
    new_id = max([int(x["id"]) for x in items] + [500]) + 1
    item = {"id": new_id, "incident_id": incident_id,
            "title": str(data.get("title", "Inspect drainage hotspot")).strip()[:120],
            "team": str(data.get("team", "Municipal Response Team")).strip()[:80],
            "status": "Assigned", "due": str(data.get("due", "Today"))[:50]}
    items.append(item)
    write_json("tasks.json", items)
    return jsonify(item), 201

@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    items = tasks()
    data = request.get_json(silent=True) or {}
    for item in items:
        if int(item["id"]) == task_id:
            status = data.get("status")
            if status not in ("Assigned", "In Progress", "Completed"):
                return jsonify({"error": "Invalid task status."}), 400
            item["status"] = status
            write_json("tasks.json", items)
            return jsonify(item)
    return jsonify({"error": "Task not found."}), 404

@app.route("/api/simulate", methods=["POST"])
def simulate():
    data = request.get_json(silent=True) or {}
    rainfall = min(max(float(data.get("rainfall_mm", 60)), 0), 250)
    blockage = min(max(float(data.get("blockage", 50)), 0), 100)
    river = min(max(float(data.get("river_level", 35)), 0), 100)
    # Transparent heuristic scenario model; not a hydrological forecast.
    risk = round(min(100, rainfall * 0.42 + blockage * 0.32 + river * 0.26))
    if risk >= 75:
        label, advice = "Critical", "Activate emergency response, restrict unsafe roads, and deploy pumps."
    elif risk >= 55:
        label, advice = "High", "Inspect drains immediately and pre-position response teams."
    elif risk >= 35:
        label, advice = "Moderate", "Monitor water levels and verify blocked-drain reports."
    else:
        label, advice = "Low", "Continue routine monitoring and keep drainage channels clear."
    return jsonify({"risk": risk, "label": label, "advice": advice,
                    "inputs": {"rainfall_mm": rainfall, "blockage": blockage, "river_level": river},
                    "model_note": "Illustrative weighted scenario score; not a validated flood prediction."})



# Alert configuration is stored locally for demo purposes. Provider credentials are read from environment variables.
ALERT_CONFIG_FILE = DATA / "alert_config.json"

def alert_config():
    return read_json("alert_config.json", {
        "sms_enabled": False,
        "siren_enabled": False,
        "phone_numbers": [],
        "sms_provider": "console",
        "siren_mode": "demo",
        "last_alert": None
    })

@app.route("/api/alerts/config", methods=["GET", "POST"])
def api_alert_config():
    config = alert_config()
    if request.method == "GET":
        # Never expose provider credentials or secrets through the API.
        return jsonify(config)
    data = request.get_json(silent=True) or {}
    phone_numbers = data.get("phone_numbers", [])
    if not isinstance(phone_numbers, list):
        return jsonify({"error": "Phone numbers must be a list."}), 400
    cleaned = []
    for number in phone_numbers:
        number = str(number).strip()
        if number and number not in cleaned:
            cleaned.append(number[:30])
    config.update({
        "sms_enabled": bool(data.get("sms_enabled", False)),
        "siren_enabled": bool(data.get("siren_enabled", False)),
        "phone_numbers": cleaned,
        "sms_provider": "console",
        "siren_mode": "demo"
    })
    write_json("alert_config.json", config)
    return jsonify({"ok": True, "config": config,
                    "message": "Alert preferences saved. SMS delivery and physical siren require external hardware/provider configuration."})

@app.route("/api/alerts/test", methods=["POST"])
def api_alert_test():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "AQUASHIELD AI AI demo alert: high flood risk reported. Please follow official safety instructions."))[:320]
    config = alert_config()
    # Safe default: this endpoint only logs a simulated alert; it never sends real SMS or triggers hardware.
    record = {
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "message": message,
        "sms_recipients": config.get("phone_numbers", []) if config.get("sms_enabled") else [],
        "sms_status": "SIMULATED ONLY — no SMS sent; this demo has no SMS gateway connected",
        "siren_status": "BROWSER SPEAKER ONLY — no external siren hardware connected" if config.get("siren_enabled") else "Disabled"
    }
    config["last_alert"] = record
    write_json("alert_config.json", config)
    print("[HYDROGUARD DEMO ALERT]", json.dumps(record, ensure_ascii=False))
    return jsonify({"ok": True, "record": record,
                    "notice": "Simulation only: no SMS was sent. Use the separate browser speaker test for a local computer alarm; no external siren was activated."})



@app.route("/api/alerts/speaker-test", methods=["POST"])
def api_speaker_test():
    # This endpoint only authorizes the frontend to play a local browser tone.
    # Audio playback is initiated by a user click in the browser; no hardware is controlled.
    return jsonify({
        "ok": True,
        "mode": "browser-speaker-demo",
        "message": "Speaker alarm demo ready. Click Play alarm in the browser to hear the local test tone.",
        "notice": "This plays audio only on this computer/browser. It does not alert phones or activate external sirens."
    })

@app.route("/api/reset-demo", methods=["POST"])
def reset_demo():
    write_json("incidents.json", SEED_INCIDENTS)
    write_json("tasks.json", SEED_TASKS)
    return jsonify({"ok": True, "message": "Sample data restored."})



@app.route("/aquanex")
def aquanex_dashboard():
    """Serve the AQUANEX virtual sensor simulation as part of the integrated demo."""
    return render_template("aquanex.html")

@app.route("/aquanex-assets/<path:filename>")
def aquanex_assets(filename):
    return send_from_directory(ROOT / "aquanex_assets", filename)

if __name__ == "__main__":
    # Local demo only. For deployment, use a production WSGI server and secure configuration.
    app.run(host="127.0.0.1", port=5000, debug=False)
