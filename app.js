const KEY="trainingHubV2";let state=JSON.parse(localStorage.getItem(KEY)||"null")||{progress:{dips:25,pullups:20,vo2:52,handstand:20,lsit:25},sessions:[],skills:[],cardio:[],history:[]};let tab="overview";
const plans=[["MO","Upper + Handstand","Dips • Weighted Pull-Ups • Rows"],["DI","Cardio Zone 2","Laufen • Rad • Kampfsport"],["MI","Lower + Pistol","Hex-Bar • Lunges • Pistol"],["DO","Full Body EMOM","Pull-Ups • Push-Ups • Dips • Squats"],["FR","Cardio Intervalle","VO₂max-Fokus"],["SA","Strength Endurance","Ganzkörper • AMRAP"],["SO","Regeneration / Cardio","Locker oder frei"]];
const skills=[["Handstand","Wall Hold → Freestanding"],["Muscle-Up","Transition → Strict"],["L-Sit","Tuck → Full"],["Pistol Squat","Assisted → Full"]];
const exercises=[["Weighted Pull-Ups","4 × 4–6","Strength"],["Dips","4 × 5–8","Strength"],["Barbell Rows","3 × 6–10","Back"],["Incline Bench Press","3 × 6–10","Push"],["Military Press","3 × 6–10","Shoulders"],["Lateral Raises","3 × 10–15","Shoulders"],["Hollow Hold","3 × 30–45 s","Core"]];
function save(){localStorage.setItem(KEY,JSON.stringify(state))}function setTab(t){tab=t;render()}function card(x){return `<div class="card">${x}</div>`}
function weekMin(){let s=Date.now()-6*864e5;return state.sessions.filter(x=>x.date>=s).reduce((a,x)=>a+x.min,0)}function skillMin(){let s=Date.now()-6*864e5;return state.skills.filter(x=>x.date>=s).reduce((a,x)=>a+x.min,0)}function totalHours(){return(weekMin()+skillMin())/60}

// --- Dynamic XP / Level system ---
function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) total += 250 + (l - 1) * 150;
  return total;
}
function getLevelFromXP(xp) {
  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) level++;
  return level;
}
function getDateValue(item) {
  return item?.date || item?.createdAt || item?.timestamp || new Date().toISOString();
}
function getISOWeekKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "unknown";
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((x - yearStart) / 86400000) + 1) / 7);
  return `${x.getUTCFullYear()}-W${String(week).padStart(2,"0")}`;
}
function calculateXP() {
  const workouts = state.history || state.workoutHistory || [];
  const skills = state.skillsHistory || state.skillHistory || [];
  const cardio = state.cardioHistory || [];
  let xp = workouts.length * 100 + skills.length * 50 + cardio.length * 80;

  // PR bonus for strength logs: +150 whenever a later performance beats the previous best.
  const best = {};
  workouts.forEach(item => {
    const exercise = item.exercise || item.name || "Workout";
    const weight = Number(item.weight || item.addedWeight || 0);
    const reps = Number(item.reps || 0);
    const score = weight > 0 ? weight * Math.max(reps, 1) : reps;
    if (best[exercise] === undefined) best[exercise] = score;
    else if (score > best[exercise]) {
      xp += 150;
      best[exercise] = score;
    }
  });

  // +300 XP for each historical week with at least 8 logged training hours.
  const weeklyMinutes = {};
  const addMinutes = (item, fallback=0) => {
    const key = getISOWeekKey(getDateValue(item));
    const mins = Number(item.duration ?? item.minutes ?? fallback) || 0;
    weeklyMinutes[key] = (weeklyMinutes[key] || 0) + mins;
  };
  workouts.forEach(x => addMinutes(x));
  skills.forEach(x => addMinutes(x));
  cardio.forEach(x => addMinutes(x));
  Object.values(weeklyMinutes).forEach(mins => { if (mins >= 480) xp += 300; });

  return xp;
}
function getXPStatus() {
  const xp = calculateXP();
  const level = getLevelFromXP(xp);
  const floor = xpRequiredForLevel(level);
  const ceiling = xpRequiredForLevel(level + 1);
  const pct = ceiling === floor ? 100 : Math.max(0, Math.min(100, ((xp-floor)/(ceiling-floor))*100));
  return { xp, level, floor, ceiling, pct };
}
function xpCardHTML() {
  const x = getXPStatus();
  return `<div class="xp-card">
    <div class="xp-card-top"><strong>Level ${x.level}</strong><span>${x.xp} / ${x.ceiling} XP</span></div>
    <div class="xp-track"><div class="xp-progress" style="width:${x.pct.toFixed(1)}%"></div></div>
    <small>${Math.max(0, x.ceiling-x.xp)} XP bis Level ${x.level+1}</small>
  </div>`;
}

function render(){let titles={overview:"Übersicht",week:"Wochenplan",workout:"Training",skills:"Skills",progress:"Fortschritt"};pageTitle.textContent=titles[tab];level.textContent=getXPStatus().level;document.querySelectorAll(".tabbar button").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));content.innerHTML={overview,week,workout,skills:skillsView,progress}[tab]()}
function overview(){let h=totalHours();return `<div class="grid">${card(`<div class="small">WOCHE</div><div class="big">${h.toFixed(1)} h</div><div class="small">Ziel 8–10 h</div>`)}${card(`<div class="small">VO₂MAX</div><div class="big">${state.progress.vo2}</div><div class="trend">Leistungswert</div>`)}</div>${card(`<div class="small">ATHLETE • LEVEL ${getXPStatus().level}</div><div class="big">Wochenziel</div><div class="progress"><i style="width:${Math.min(h/10,1)*100}%"></i></div><p class="small">${h.toFixed(1)} / 10 Stunden</p>`)}<div class="section">Heute</div>${card(`<h3>Upper Body + Handstand</h3><p class="small">Dips • Weighted Pull-Ups • Rows • Handstand</p><button class="btn" onclick="setTab('workout')">Training öffnen</button>`)}<div class="section">Schnellwerte</div>${card(`<div class="row between"><b>Pull-Up</b><span class="badge">+${state.progress.pullups} kg</span></div><hr><div class="row between"><b>Dips</b><span class="badge">+${state.progress.dips} kg</span></div><hr><div class="row between"><b>Handstand</b><span class="badge">${state.progress.handstand}s</span></div>`)}`}
function week(){return plans.map(p=>card(`<div class="row"><div class="day">${p[0]}</div><div><b>${p[1]}</b><div class="small">${p[2]}</div></div></div>`)).join("")}
function workout(){return `<div class="section">Upper Body + Handstand</div>${exercises.map(e=>card(`<div class="row between"><div><b>${e[0]}</b><div class="small">${e[2]}</div></div><span class="badge">${e[1]}</span></div>`)).join("")}${card(`<h3>Training loggen</h3><label>Dauer (min)<input id="dur" type="number" value="60"></label><label>Übung<input id="ex" placeholder="z.B. Weighted Pull-Ups"></label><label>Sätze<input id="sets" type="number" value="4"></label><label>Wiederholungen<input id="reps" type="number" value="5"></label><label>Zusatzgewicht (kg)<input id="weight" type="number" step=".5" value="20"></label><button class="btn" onclick="logWorkout()">Speichern</button>`)}`}
function logWorkout(){let min=+dur.value||60;state.sessions.push({date:Date.now(),min});let exn=ex.value.trim();if(exn)state.history.push({date:new Date().toISOString().slice(0,10),exercise:exn,sets:+sets.value||1,reps:+reps.value||1,weight:+weight.value||0});save();render()}
function skillsView(){return skills.map(s=>card(`<div class="row between"><b>${s[0]}</b><span class="badge" onclick="logSkill('${s[0]}')">+ Session</span></div><p class="small">${s[1]}</p>`)).join("")+card(`<b>Skill-Zeit diese Woche</b><div class="big">${skillMin()} min</div>`)}
function logSkill(n){let m=+prompt("Minuten für "+n,"15");if(m>0){state.skills.push({date:Date.now(),min:m,skill:n});save();render()}}
function metric(title,key,unit){return `<label>${title}<input type="number" step=".5" value="${state.progress[key]}" onchange="metricUpdate('${key}',this.value)"></label><span class="small">${unit}</span>`}function metricUpdate(k,v){state.progress[k]=+v;save()}
function chartSVG(values,label){if(!values.length)return `<div class="small">Noch keine Daten vorhanden.</div>`;let max=Math.max(...values.map(x=>x.v),1),min=Math.min(...values.map(x=>x.v),0),w=500,h=150,p=15;let pts=values.map((x,i)=>{let X=p+i*(w-2*p)/Math.max(values.length-1,1),Y=h-p-(x.v-min)/(max-min||1)*(h-2*p);return `${X},${Y}`}).join(" ");return `<div class="chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#75bcff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${values.map((x,i)=>{let [X,Y]=pts.split(" ")[i].split(",");return `<circle cx="${X}" cy="${Y}" r="4" fill="#75bcff"/>`}).join("")}</svg></div><div class="small">${label}</div>`}
function progress(){let pull=state.history.filter(x=>x.exercise.toLowerCase().includes("pull")).map(x=>({v:x.weight*x.reps*x.sets}));let dips=state.history.filter(x=>x.exercise.toLowerCase().includes("dip")).map(x=>({v:x.weight*x.reps*x.sets}));return `<div class="grid">${card(`<div class="small">PULL-UP</div><div class="kpi">+${state.progress.pullups} kg</div><div class="trend">Zusatzgewicht</div>`)}${card(`<div class="small">DIPS</div><div class="kpi">+${state.progress.dips} kg</div><div class="trend">Zusatzgewicht</div>`)}</div><div class="section">Kraftentwicklung</div>${card(`<h3>Weighted Pull-Up</h3>${chartSVG(pull,"Volumen = Sätze × Wiederholungen × Zusatzgewicht")}`)}${card(`<h3>Dips</h3>${chartSVG(dips,"Volumen = Sätze × Wiederholungen × Zusatzgewicht")}`)}<div class="section">Leistungsdaten</div>${card(metric("Weighted Pull-Up","pullups","kg"))}${card(metric("Dips","dips","kg"))}${card(metric("VO₂max","vo2",""))}${card(metric("Handstand-Hold","handstand","Sekunden"))}${card(metric("L-Sit","lsit","Sekunden"))}<div class="section">Cardio</div>${card(`<label>Aktivität<select id="ctype"><option>Laufen</option><option>Radfahren</option><option>Kampfsport</option></select></label><label>Distanz (km)<input id="dist" type="number" step=".01"></label><label>Zeit (min)<input id="ctime" type="number"></label><label>Pace / Geschwindigkeit<input id="pace"></label><button class="btn" onclick="logCardio()">Cardio speichern</button>`)}${card(`<h3>Cardio-Historie</h3>${state.cardio.length?state.cardio.slice(-8).reverse().map(x=>`<div class="row between"><span>${x.type} • ${x.dist} km</span><span class="badge">${x.time} min</span></div>`).join("<hr>"):"<div class='small'>Noch keine Cardio-Daten gespeichert.</div>"}`)}${card(`<h3>Statistik-Logik</h3><p class="small">Die App erfasst Sätze, Wiederholungen, Gewicht, Trainingszeit, Skill-Zeit, Strecke, Pace/Geschwindigkeit und VO₂max. Kraftdiagramme zeigen das Trainingsvolumen; weitere Auswertungen können darauf aufbauen.</p>`)}`}
function logCardio(){state.cardio.push({date:new Date().toISOString().slice(0,10),type:ctype.value,dist:+dist.value||0,time:+ctime.value||0,pace:pace.value});save();render()}
document.querySelectorAll(".tabbar button").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));render();