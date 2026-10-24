# AQUASHIELD AI AI — Live Demo Script (4 minutes)

## Before presenting
- Start the application with `python app.py`.
- Open `http://127.0.0.1:5000`.
- Keep an internet connection available for map tiles.

## Demo sequence
1. **Dashboard (30 sec):** Show open incidents, high/critical incidents, tasks in progress, and resolved incidents.
2. **Hotspot map (30 sec):** Click markers to show incident details and explain that sample locations are illustrative.
3. **Report an incident (45 sec):** Enter a title, choose severity and drainage condition, add rainfall and coordinates, then submit. Point out the calculated priority score.
4. **Prioritisation (30 sec):** Explain the prototype score: severity (up to 50) + rainfall contribution (up to 25) + drainage condition (up to 25).
5. **Municipal task tracking (45 sec):** Select an incident, create a task, assign a team and due target, then update its status.
6. **Scenario lab (45 sec):** Increase rainfall, blockage and channel level; run the scenario and show the risk category and response advice.
7. **Close (15 sec):** Explain that the risk simulator is a transparent illustrative heuristic, not a validated flood forecast or live data feed.

## Suggested narration
“AQUASHIELD AI AI brings local flood reports, map-based hotspots, and municipal task tracking into one workflow. Each incident receives a transparent triage score based on severity, rainfall and drainage condition. Coordinators can assign work and follow its status. The scenario lab explores how changing conditions affect an illustrative risk score. This is a prototype; live feeds, security controls and model validation are the next steps.”

## Reset
Use **Reset sample data** to restore the original demo incidents and tasks.
