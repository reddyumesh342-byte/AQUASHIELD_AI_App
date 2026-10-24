# AQUASHIELD AI
## Intelligent Flood Prediction & Emergency Response System

**Tagline:** Predict. Protect. Save Lives.

A local prototype integrating a virtual flood simulation with an incident-response dashboard.

### Included modules
- Unified dashboard with sample flood incidents, priority triage, incident reporting, hotspot map, and response-task tracking.
- Flood simulation with virtual water-level/rainfall scenarios, sensor fault testing, and event logs.
- Demo alert workflow, simulated SMS event logging, and browser-local speaker alarm.

### Run on Windows (PowerShell)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```
If activation is blocked, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned` in that terminal, then activate again.

Open `http://127.0.0.1:5000/` for the response dashboard and `http://127.0.0.1:5000/aquanex` for the simulation.

### Prototype limitations
The included data and scenario logic are illustrative, not validated flood forecasts. SMS events are simulated and are not sent to real phones. The browser alarm plays audio on the local device only and does not control external siren hardware. Live sensor feeds, secure production authentication, approved messaging integration, and deployment hardening are not included. Do not use this prototype for real emergency decisions.
