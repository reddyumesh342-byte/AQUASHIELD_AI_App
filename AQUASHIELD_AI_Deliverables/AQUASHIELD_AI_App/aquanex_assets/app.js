(() => {
"use strict";
const $ = id => document.getElementById(id);
const state = {water:0.42,rain:12,block:12,waterFault:false,rainFault:false,network:true,running:true,scenario:"normal",history:[],events:[],tick:0};
const scenarios = {
 normal:{water:.42,rain:12,block:12,title:"Normal conditions"},
 rain:{water:1.08,rain:82,block:24,title:"Heavy rainfall"},
 blocked:{water:.92,rain:35,block:92,title:"Blocked drain"},
 rising:{water:1.42,rain:64,block:55,title:"Rapid water rise"},
 critical:{water:1.92,rain:98,block:78,title:"Critical water level"}
};
function now(){return new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function evaluate(){
  const badWater=state.waterFault, badRain=state.rainFault;
  const validCount=(!badWater?1:0)+(!badRain?1:0);
  // Illustrative and explainable scoring only; not a validated flood model.
  let score=Math.round((badWater?0:state.water/2.5*45)+(badRain?0:state.rain/120*25)+state.block/100*20+(state.water>=1.5?15:state.water>=1?7:0));
  score=clamp(score,0,100);
  if(validCount===0)return {score:null,level:"unknown",action:"VERIFY INPUTS",title:"Sensor readings unreliable",copy:"Both primary inputs are faulted. Do not infer that conditions are safe.",reasons:["Water-level input is unavailable or invalid.","Rainfall input is unavailable or invalid.","Request field verification before acting."]};
  if(badWater || badRain) return {score,level:"unknown",action:"VERIFY INPUTS",title:"Data quality warning",copy:"At least one sensor input is unavailable. Risk assessment is incomplete.",reasons:[badWater?"Water-level reading is flagged as unreliable.":"Water-level input is available.",badRain?"Rainfall reading is flagged as unreliable.":"Rainfall input is available.","Verify faulty input; do not treat missing data as a safe reading."]};
  if(!state.network)return {score,level:score>=75?"critical":score>=50?"high":score>=25?"moderate":"low",action:"LOCAL / OFFLINE",title:"Network offline — remote delivery unavailable",copy:"Local simulation continues, but remote alert delivery is not available or confirmed.",reasons:["Network connection is marked offline.","Current values remain virtual browser inputs.","Do not claim that remote alerts were delivered."]};
  let level,action,title,copy,reasons=[];
  if(state.water>=1.8 || (state.water>=1.5 && state.rain>=75) || score>=80){level="critical";action="URGENT ASSESSMENT";title="High-priority field assessment";copy="Critical conditions under demo rules. Request urgent human assessment.";reasons=["Water level or combined risk crossed a critical demo threshold.","Prioritise verification of the location and access conditions.","Human operator must confirm conditions; no public alert is sent."];}
  else if(score>=50 || state.block>=75){level="high";action="INSPECT DRAIN";title="Prioritise drainage inspection";copy="High risk or significant blockage detected by the rule-based selector.";reasons=[];if(score>=50)reasons.push("Illustrative risk score is at or above 50.");if(state.block>=75)reasons.push("Drain blockage input is at least 75%.");reasons.push("Assign a field team to verify and inspect the drain.");}
  else if(score>=25 || state.water>=.9 || state.rain>=45){level="moderate";action="INCREASE MONITORING";title="Increase monitoring and prepare warning";copy="Conditions are changing; monitor the location and verify readings.";reasons=["Moderate score, rising water level, or increased rainfall triggered monitoring.","Review the next reading and local observations.","This is not an official public warning."];}
  else{level="low";action="MONITOR";title="Continue monitoring";copy="Current readings are within the configured demo limits.";reasons=["Inputs are available in the simulation.","Risk score remains below the configured moderate threshold.","Continue monitoring for changes."];}
  return {score,level,action,title,copy,reasons};
}
function logEvent(title,detail,level="info"){
 state.events.unshift({time:now(),title,detail,level});state.events=state.events.slice(0,60);renderEvents();
}
function addHistory(){
 state.history.push({time:now(),water:state.water,rain:state.rain,block:state.block,network:state.network,waterFault:state.waterFault,rainFault:state.rainFault});
 state.history=state.history.slice(-24);
}
function updateUI(){
 const r=evaluate();
 $("water-value").textContent=state.water.toFixed(2);$("rain-value").textContent=Math.round(state.rain);
 $("water-slider-val").textContent=state.water.toFixed(2);$("rain-slider-val").textContent=Math.round(state.rain);$("block-slider-val").textContent=Math.round(state.block);
 $("water-slider").value=state.water;$("rain-slider").value=state.rain;$("block-slider").value=state.block;
 $("water-meter").style.width=(state.water/2.5*100)+"%";$("rain-meter").style.width=(state.rain/120*100)+"%";
 $("rain-label").textContent=state.rain>=75?"Heavy":state.rain>=35?"Moderate":"Light";
 $("water-trend").textContent=state.scenario==="rising"?"↗ rapid rise":state.water>=1.3?"↗ rising":"↔ stable";
 $("water-trend").className="trend "+(state.scenario==="rising"?"positive":"");
 $("drain-value").textContent=state.block>=75?"Suspected blockage":state.block>=40?"Restricted":"Open";
 $("blockage-value").textContent=Math.round(state.block)+"%";$("drain-bar").style.width=state.block+"%";
 $("drain-bar").style.background=state.block>=75?"#e34b5c":state.block>=40?"#e6a23c":"#24b88b";
 $("risk-score").textContent=r.score===null?"—":r.score;$("risk-caption").textContent=r.level==="unknown"?"Risk assessment incomplete":r.level==="low"?"Conditions within demo limits":"Review recommended response";
 $("risk-badge").textContent=r.level==="unknown"?"DATA UNRELIABLE":r.level.toUpperCase()+" RISK";$("risk-badge").className="risk-badge "+r.level;
 const deg=r.score===null?0:r.score*3.6;const c=r.level==="critical"?"#e34b5c":r.level==="high"?"#e88b3d":r.level==="moderate"?"#e6b23c":r.level==="unknown"?"#9aa8b9":"#18a779";
 $("risk-gauge").style.background=`conic-gradient(${c} 0deg,${c} ${deg}deg,#e9eef4 ${deg}deg)`;
 $("response-banner").className="response-banner "+r.level;$("response-state").textContent=r.action;$("response-title").textContent=r.title;$("response-copy").textContent=r.copy;
 $("response-icon").textContent=r.level==="critical"?"!":r.level==="high"?"↗":r.level==="unknown"?"?":"✓";
 $("reason-list").innerHTML=r.reasons.map(x=>`<li>${escapeHtml(x)}</li>`).join("");
 setHealth("water-health",state.waterFault?"FAULT":"OK",state.waterFault?"bad":"ok");
 setHealth("rain-health",state.rainFault?"FAULT":"OK",state.rainFault?"bad":"ok");
 setHealth("network-health",state.network?"ONLINE":"OFFLINE",state.network?"ok":"bad");
 $("water-health-note").textContent=state.waterFault?"Reading invalid / stale": "Fresh virtual reading";
 $("rain-health-note").textContent=state.rainFault?"Reading invalid / stale":"Fresh virtual reading";
 $("network-health-note").textContent=state.network?"Local simulation connected":"Remote communication unavailable";
 $("side-dot").style.background=state.network?"#28d5a0":"#e34b5c";
 $("side-network").textContent=state.network?"Network online":"Network offline";
 $("side-network-note").textContent=state.network?"Simulation link active":"Remote delivery unavailable";
 $("connection-fill").style.width=state.network?"100%":"18%";$("connection-fill").style.background=state.network?"#26c99d":"#e34b5c";
 $("sensor-fault-btn").textContent=(state.waterFault||state.rainFault)?"✓ Restore sensor inputs":"⚠ Toggle sensor fault";
 $("network-btn").textContent=state.network?"⇄ Go offline":"⇄ Restore network";
 $("fault-hint").textContent=state.waterFault||state.rainFault?"Fault state active: the risk output is incomplete and requests verification.":!state.network?"Offline state active: the UI does not claim remote alerts were delivered.":"Try a sensor fault or network outage to verify that the dashboard does not report faulty data as safe.";
 $("last-update").textContent="Updated "+now();
 $("mon-water").textContent=state.water.toFixed(2);$("mon-rain").textContent=Math.round(state.rain);$("mon-block").textContent=Math.round(state.block);$("mon-risk").textContent=r.score===null?"—":r.score;
 renderCharts();renderQuality(r);
}
function setHealth(id,label,kind){$(id).textContent="● "+label;$(id).className="health-state "+kind;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function drawChart(canvasId){
 const canvas=$(canvasId);if(!canvas||canvas.offsetParent===null)return;
 const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
 canvas.width=Math.max(300,rect.width*dpr);canvas.height=Math.max(170,rect.height*dpr);
 const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);
 const w=rect.width,h=rect.height,p={l:35,r:15,t:15,b:25},cw=w-p.l-p.r,ch=h-p.t-p.b;
 ctx.clearRect(0,0,w,h);ctx.font="9px DM Sans, sans-serif";ctx.strokeStyle="#edf1f6";ctx.fillStyle="#91a0b2";ctx.lineWidth=1;
 for(let i=0;i<=4;i++){const y=p.t+ch*i/4;ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.stroke();ctx.fillText((2.5-i*.625).toFixed(1)+"m",2,y+3);}
 const data=state.history.length?state.history:[{water:state.water,rain:state.rain}];
 function line(key,max,color){ctx.beginPath();data.forEach((d,i)=>{const x=p.l+(data.length===1?cw/2:cw*i/(data.length-1));const val=key==="water"?d.water/2.5:d.rain/max;const y=p.t+ch*(1-clamp(val,0,1));if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.strokeStyle=color;ctx.lineWidth=2.3;ctx.lineJoin="round";ctx.stroke();const last=data[data.length-1],x=p.l+(data.length===1?cw/2:cw*(data.length-1)/(data.length-1)),y=p.t+ch*(1-clamp(key==="water"?last.water/2.5:last.rain/max,0,1));ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
 line("water",2.5,"#3878ee");line("rain",120,"#22b8d3");
 ctx.fillStyle="#91a0b2";ctx.fillText("Older",p.l,h-6);ctx.fillText("Latest",w-p.r-30,h-6);
}
function renderCharts(){drawChart("trend-chart");drawChart("monitor-chart");}
function renderQuality(r){
 const items=[
  ["Water-level input",state.waterFault?"Fault / stale reading":"Virtual reading available",state.waterFault],
  ["Rainfall input",state.rainFault?"Fault / stale reading":"Virtual reading available",state.rainFault],
  ["Network",state.network?"Connected in local simulation":"Offline; remote delivery not confirmed",!state.network],
  ["Risk decision",r.level==="unknown"?"Incomplete — verification requested":`Rule-based recommendation: ${r.action}`,r.level==="unknown"],
  ["Data provenance","All current values are simulated; no hardware feed connected",true]
 ];
 $("quality-checks").innerHTML=items.map(([a,b,w])=>`<div class="quality-item"><span class="quality-icon ${w?"warn":""}">${w?"!":"✓"}</span><div><b>${a}</b><p>${b}</p></div></div>`).join("");
}
function renderEvents(){
 $("event-count").textContent=state.events.length;
 const html=arr=>arr.map(e=>`<div class="${arr===state.events?"full-event":"event-row"}"><${arr===state.events?"time": "span"} class="${arr===state.events?"":"event-time"}">${e.time}</${arr===state.events?"time":"span"}><i class="event-dot" style="background:${e.level==="danger"?"#e34b5c":e.level==="warn"?"#e6a23c":"#3878ee"}"></i><div class="event-text"><b>${escapeHtml(e.title)}</b><small>${escapeHtml(e.detail)}</small></div>${arr===state.events?"":`<span class="event-tag">${e.level.toUpperCase()}</span>`}</div>`).join("");
 $("recent-events").innerHTML=html(state.events.slice(0,4))||'<div class="empty">No events yet.</div>';
 $("full-events").innerHTML=html(state.events)||'<div class="empty">No events recorded in this session.</div>';
}
function setScenario(name){
 const s=scenarios[name];if(!s)return;state.scenario=name;state.water=s.water;state.rain=s.rain;state.block=s.block;
 state.waterFault=false;state.rainFault=false;
 document.querySelectorAll(".scenario-btn").forEach(b=>b.classList.toggle("selected",b.dataset.scenario===name));
 addHistory();updateUI();const r=evaluate();logEvent(s.title,`Water ${state.water.toFixed(2)} m · Rain ${state.rain} mm/h · Blockage ${state.block}% · Response: ${r.action}`,r.level==="critical"?"danger":r.level==="high"?"warn":"info");
}
function testCases(){
 return [
  {name:"Normal conditions",detail:"Valid low water, light rain and low blockage should recommend monitoring.",run:()=>{state.water=.3;state.rain=8;state.block=10;state.waterFault=false;state.rainFault=false;state.network=true;return evaluate().level==="low";}},
  {name:"Heavy rainfall raises response",detail:"High rainfall and raised water should trigger a higher response than normal.",run:()=>{state.water=1.08;state.rain=82;state.block=24;state.waterFault=false;state.rainFault=false;state.network=true;return ["high","critical"].includes(evaluate().level)||evaluate().level==="moderate";}},
  {name:"Blocked drain prioritises inspection",detail:"A blockage of 92% should recommend drainage inspection or more urgent assessment.",run:()=>{state.water=.92;state.rain=35;state.block=92;state.waterFault=false;state.rainFault=false;state.network=true;return ["high","critical"].includes(evaluate().level);}},
  {name:"Critical water level triggers urgent assessment",detail:"Water level above the critical threshold should produce critical priority.",run:()=>{state.water=1.92;state.rain=98;state.block=78;state.waterFault=false;state.rainFault=false;state.network=true;return evaluate().level==="critical"&&evaluate().action==="URGENT ASSESSMENT";}},
  {name:"Sensor fault is not treated as safe",detail:"Faulted water input must mark assessment incomplete and request verification.",run:()=>{state.water=.4;state.rain=10;state.block=10;state.waterFault=true;state.rainFault=false;state.network=true;return evaluate().level==="unknown"&&evaluate().action==="VERIFY INPUTS";}},
  {name:"Both sensors faulted",detail:"With both primary inputs unavailable, score must be withheld.",run:()=>{state.waterFault=true;state.rainFault=true;return evaluate().score===null&&evaluate().level==="unknown";}},
  {name:"Network offline is visible",detail:"Offline state must not claim remote alert delivery.",run:()=>{state.waterFault=false;state.rainFault=false;state.network=false;return evaluate().action==="LOCAL / OFFLINE"&&evaluate().copy.includes("not available or confirmed");}}
 ];
}
function renderTestStart(){const ts=testCases();$("test-results").innerHTML=ts.map((t,i)=>`<div class="test-row" id="test-${i}"><span class="test-icon">•</span><div><b>${t.name}</b><small>${t.detail}</small></div><span class="test-result" style="background:#eef2f7;color:#6e7c90">NOT RUN</span></div>`).join("");}
function runTests(){
 const ts=testCases();let passed=0;
 ts.forEach((t,i)=>{let ok=false;try{ok=!!t.run()}catch(e){ok=false}if(ok)passed++;
  const row=$("test-"+i);row.querySelector(".test-icon").textContent=ok?"✓":"×";row.querySelector(".test-icon").className="test-icon"+(ok?"":" fail");
  row.querySelector(".test-result").textContent=ok?"PASS":"FAIL";row.querySelector(".test-result").className="test-result"+(ok?"":" fail");
 });
 // Restore the default visible scenario after testing, avoiding hidden test state.
 state.waterFault=false;state.rainFault=false;state.network=true;state.scenario="normal";state.water=.42;state.rain=12;state.block=12;
 document.querySelectorAll(".scenario-btn").forEach(b=>b.classList.toggle("selected",b.dataset.scenario==="normal"));
 addHistory();updateUI();logEvent("Scenario tests completed",`${passed}/${ts.length} functional checks passed. These checks validate demo logic only.`,passed===ts.length?"info":"warn");
}
function showView(name){
 document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
 $(name+"-view").classList.remove("hidden");
 document.querySelectorAll(".side-link").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 const titles={dashboard:"Flood response dashboard",monitor:"Live monitoring",tests:"Scenario test bench",events:"Incident and decision log"};
 $("page-title").textContent=titles[name];$("crumb").textContent=titles[name];
 setTimeout(renderCharts,80);
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll(".scenario-btn").forEach(b=>b.addEventListener("click",()=>setScenario(b.dataset.scenario)));
$("water-slider").addEventListener("input",e=>{state.water=Number(e.target.value);state.scenario="custom";document.querySelectorAll(".scenario-btn").forEach(b=>b.classList.remove("selected"));addHistory();updateUI();});
$("rain-slider").addEventListener("input",e=>{state.rain=Number(e.target.value);state.scenario="custom";document.querySelectorAll(".scenario-btn").forEach(b=>b.classList.remove("selected"));addHistory();updateUI();});
$("block-slider").addEventListener("input",e=>{state.block=Number(e.target.value);state.scenario="custom";document.querySelectorAll(".scenario-btn").forEach(b=>b.classList.remove("selected"));addHistory();updateUI();});
$("sensor-fault-btn").addEventListener("click",()=>{if(state.waterFault||state.rainFault){state.waterFault=false;state.rainFault=false;logEvent("Sensor inputs restored","Virtual sensor inputs marked available again.","info");}else{state.waterFault=true;logEvent("Water-level sensor fault","Water-level value marked invalid/stale; risk assessment requests verification.","warn");}addHistory();updateUI();});
$("network-btn").addEventListener("click",()=>{state.network=!state.network;logEvent(state.network?"Network restored":"Network offline",state.network?"Simulation connection restored.":"Remote alert delivery is unavailable and is not claimed.","warn");addHistory();updateUI();});
$("pause-btn").addEventListener("click",()=>{state.running=!state.running;$("pause-btn").textContent=state.running?"Ⅱ Pause simulation":"▶ Resume simulation";logEvent(state.running?"Simulation resumed":"Simulation paused",state.running?"Virtual stream updates resumed.":"Values remain fixed until resumed or changed.","info");});
$("reset-btn").addEventListener("click",()=>{state.water=.42;state.rain=12;state.block=12;state.waterFault=false;state.rainFault=false;state.network=true;state.scenario="normal";state.history=[];document.querySelectorAll(".scenario-btn").forEach(b=>b.classList.toggle("selected",b.dataset.scenario==="normal"));addHistory();updateUI();logEvent("Demo reset","Default virtual conditions restored.","info");});
$("dismiss-notice").addEventListener("click",()=>document.querySelector(".notice").classList.add("hidden"));
$("run-all-tests").addEventListener("click",runTests);
$("clear-events").addEventListener("click",()=>{state.events=[];renderEvents();logEvent("Event log cleared","New events will be recorded from this point.","info");});
renderTestStart();
logEvent("Simulation started","Default virtual conditions loaded. No hardware or external data feed connected.","info");
for(let i=0;i<7;i++)addHistory();
updateUI();
setInterval(()=>{if(!state.running)return;state.tick++;if(state.scenario==="normal"||state.scenario==="custom"){
  state.water=clamp(state.water+(Math.random()-.55)*.035,0,2.5);
  state.rain=clamp(state.rain+(Math.random()-.55)*2.5,0,120);
  state.water=Math.round(state.water*100)/100;state.rain=Math.round(state.rain);
 }addHistory();updateUI();},2000);
window.addEventListener("resize",()=>setTimeout(renderCharts,100));
})();