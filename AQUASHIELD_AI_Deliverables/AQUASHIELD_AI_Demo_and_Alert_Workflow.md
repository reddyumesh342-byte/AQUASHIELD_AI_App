# AQUASHIELD AI — Demo & Alert Workflow

## 5-minute live demo
1. Start the app with `python app.py`.
2. Open `http://127.0.0.1:5000/` and review the sample incident queue.
3. Submit a sample incident; explain the rule-based priority score.
4. Open `http://127.0.0.1:5000/aquanex` and run heavy-rain or critical-level scenarios.
5. Trigger the alert demonstration and explain that SMS is logged only, while browser audio plays on the current device.
6. Assign/update a response task and close with limitations and next steps.

## Alert flow
Virtual or connected input → risk evaluation → threshold/priority event → dashboard alert → simulated SMS log / local browser audio → response team task.

## Important safety boundary
The current prototype does not send SMS to real phones, does not control physical sirens, and does not use verified live flood sensor feeds. Do not present demo alerts as real-world warnings.
