/* MAX GAINS v6 — Training Programme Editor (development add-on)
   No workout history is migrated, renamed, or deleted. Programme is device-local. */
(()=>{
'use strict';
const STORAGE='max_gains_training_programme_v6';
const defaults=JSON.parse(JSON.stringify(plan));
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let draft;
function valid(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return false;
 const names=Object.keys(data);if(!names.length||names.length>14||new Set(names.map(x=>x.trim().toLowerCase())).size!==names.length)return false;
 return names.every(n=>n.trim()&&n.length<=70&&Array.isArray(data[n])&&data[n].length<=30&&data[n].every(e=>Array.isArray(e)&&e.length===3&&typeof e[0]==='string'&&e[0].trim()&&e[0].length<=100&&Number.isInteger(e[1])&&e[1]>=1&&e[1]<=12&&typeof e[2]==='string'&&e[2].length<=30));
}
try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(valid(saved)){for(const k of Object.keys(plan))delete plan[k];Object.assign(plan,clone(saved));}}catch(e){console.warn('Programme settings not loaded',e)}
function refreshChoices(){
 const chosen=$('workout').value,filter=$('historyFilter').value;
 const names=Object.keys(plan),history=[...new Set(records.map(r=>r.workout))];
 $('workout').innerHTML=[...new Set([...names,...history])].map(n=>`<option value="${esc(n)}">${esc(n)}${!plan[n]?' (historical)':''}</option>`).join('');
 $('workout').value=[...names,...history].includes(chosen)?chosen:names[0];
 $('historyFilter').innerHTML='<option value="">All workouts</option>'+[...new Set([...names,...history])].map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
 $('historyFilter').value=[...names,...history].includes(filter)?filter:'';
 render();renderHistory();
}
// Render archived sessions from their own saved exercise snapshot, never the edited programme.
const originalRender=render;
render=function(){
 const saved=records.find(r=>r.workout===$('workout').value&&r.date===$('date').value);
 const key=$('workout').value,existing=plan[key];
 if(saved&&Array.isArray(saved.exercises)){
  plan[key]=saved.exercises.map(e=>[e.name,Math.max(1,e.sets?.length||1),existing?.find(x=>x[0]===e.name)?.[2]||'']);
  try{return originalRender()}finally{if(existing)plan[key]=existing;else delete plan[key]}
 }
 if(!existing){plan[key]=[];try{return originalRender()}finally{delete plan[key]}}
 return originalRender();
};
// Existing save/collect use plan; block historical rewrites if the plan no longer matches.
const oldSave=save;
save=async function(){
 const saved=records.find(r=>r.workout===$('workout').value&&r.date===$('date').value);
 if(saved){
  const active=plan[saved.workout]||[];
  const same=active.length===saved.exercises.length&&active.every((x,i)=>x[0]===saved.exercises[i].name&&x[1]===saved.exercises[i].sets.length);
  if(!same){alert('This is a historical session recorded under an earlier programme. To protect its original sets, editing and re-saving this session is disabled after programme changes. You can still view it and export your history.');return}
 }
 return oldSave();
};
const css=document.createElement('style');css.textContent=`
#mg6Editor{margin:18px 0;padding:18px;border:1px solid #43516a;border-radius:16px;background:#131b27;color:#eef2f7}
#mg6Editor h2,#mg6Editor h3{margin:8px 0 12px}#mg6Editor p{color:#b9c4d2}
#mg6Editor input{width:100%;box-sizing:border-box;min-width:0;background:#0c111a;color:white;border:1px solid #465369;border-radius:8px;padding:10px}
#mg6Editor button{border:1px solid #61738c;border-radius:9px;padding:9px 12px;margin:3px;color:white;background:#26354a;cursor:pointer}
#mg6Editor button.primary{background:#146f5d}#mg6Editor button.danger{border-color:#9d6262;color:#ffc4c4}
#mg6Editor .day{padding:12px;border:1px solid #364458;border-radius:12px;margin:12px 0}
#mg6Editor .exercise-row{display:grid;grid-template-columns:minmax(0,1fr) 66px 86px;gap:6px;margin:8px 0;align-items:center}
#mg6Editor .exercise-row .actions{grid-column:1/-1}#mg6Editor .actions{display:flex;flex-wrap:wrap;gap:3px}
#mg6Editor .day-title{display:flex;flex-wrap:wrap;align-items:center;gap:8px}#mg6Editor .day-title input{flex:1 1 200px}
#mg6Editor .note{font-size:13px}#mg6Editor .toolbar{display:flex;flex-wrap:wrap;gap:5px}
`;document.head.appendChild(css);
const panel=document.createElement('section');panel.id='mg6Editor';panel.innerHTML=`<h2>Training Programme Editor · v6</h2><p>Customise workouts, exercise order, working sets and rep ranges. Changes affect future sessions only. Existing records are kept unchanged.</p><div id="mg6Days"></div><div class="toolbar"><button id="mg6AddDay" type="button">+ Add workout day</button><button id="mg6Save" class="primary" type="button">Save programme</button><button id="mg6Reset" class="danger" type="button">Restore original programme</button></div><p id="mg6Message" class="note" role="status">Programme changes are saved on this device only; they do not yet sync to Supabase.</p>`;
// Existing Settings tab if present, otherwise create a separate settings-like panel on the page.
const settings=document.querySelector('#view-settings')||document.querySelector('[data-settings-panel]');
if(settings)settings.appendChild(panel);else{
 const target=document.querySelector('#view-training')||document.querySelector('.view')||document.body;
 target.appendChild(panel);
 const toggle=document.createElement('button');toggle.textContent='⚙ Edit training programme';toggle.type='button';toggle.className='btn secondary';toggle.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)panel.scrollIntoView({behavior:'smooth'})};panel.hidden=true;target.insertBefore(toggle,panel);
}
function draw(){const box=panel.querySelector('#mg6Days');box.innerHTML=Object.entries(draft).map(([name,exercises],di)=>`<div class="day"><div class="day-title"><input aria-label="Workout name" data-day-name="${di}" value="${esc(name)}"><div class="actions"><button data-day-up="${di}" type="button">↑</button><button data-day-down="${di}" type="button">↓</button><button data-day-delete="${di}" class="danger" type="button">Remove day</button></div></div><div class="note">Exercise · sets · rep range</div>${exercises.map(([ex,sets,reps],ei)=>`<div class="exercise-row"><input aria-label="Exercise name" data-ex="${di}:${ei}" value="${esc(ex)}"><input aria-label="Working sets" type="number" min="1" max="12" data-sets="${di}:${ei}" value="${sets}"><input aria-label="Rep range" data-reps="${di}:${ei}" value="${esc(reps)}"><div class="actions"><button data-ex-up="${di}:${ei}" type="button">↑ Move</button><button data-ex-down="${di}:${ei}" type="button">↓ Move</button><button data-ex-delete="${di}:${ei}" class="danger" type="button">Remove</button></div></div>`).join('')}<button data-ex-add="${di}" type="button">+ Add exercise</button></div>`).join('');
 box.querySelectorAll('[data-day-name]').forEach(el=>el.oninput=()=>rename(Number(el.dataset.dayName),el.value));
 box.querySelectorAll('[data-ex]').forEach(el=>el.oninput=()=>{const [d,e]=el.dataset.ex.split(':').map(Number);draft[Object.keys(draft)[d]][e][0]=el.value});
 box.querySelectorAll('[data-sets]').forEach(el=>el.oninput=()=>{const [d,e]=el.dataset.sets.split(':').map(Number);draft[Object.keys(draft)[d]][e][1]=Number(el.value)});
 box.querySelectorAll('[data-reps]').forEach(el=>el.oninput=()=>{const [d,e]=el.dataset.reps.split(':').map(Number);draft[Object.keys(draft)[d]][e][2]=el.value});
 box.querySelectorAll('button[data-day-up],button[data-day-down],button[data-day-delete],button[data-ex-up],button[data-ex-down],button[data-ex-delete],button[data-ex-add]').forEach(b=>b.onclick=()=>action(b));
}
function rename(i,newName){const a=Object.entries(draft);a[i][0]=newName;draft=Object.fromEntries(a)}
function action(b){const attr=[...b.attributes].find(a=>a.name.startsWith('data-day-')||a.name.startsWith('data-ex-'));const [d,e]=attr.value.split(':').map(Number),kind=attr.name;const days=Object.entries(draft),ex=days[d]?.[1];
 if(kind==='data-day-delete'){if(!confirm('Remove this day from the future programme? Saved workouts will remain.'))return;days.splice(d,1)}
 if(kind==='data-day-up'&&d>0)[days[d-1],days[d]]=[days[d],days[d-1]];
 if(kind==='data-day-down'&&d<days.length-1)[days[d+1],days[d]]=[days[d],days[d+1]];
 if(kind==='data-ex-add')ex.push(['New exercise',3,'8–12']);
 if(kind==='data-ex-delete')ex.splice(e,1);
 if(kind==='data-ex-up'&&e>0)[ex[e-1],ex[e]]=[ex[e],ex[e-1]];
 if(kind==='data-ex-down'&&e<ex.length-1)[ex[e+1],ex[e]]=[ex[e],ex[e+1]];
 draft=Object.fromEntries(days);draw();
}
panel.querySelector('#mg6AddDay').onclick=()=>{if(Object.keys(draft).length>=14)return alert('Maximum 14 workout days');let name='New workout';let i=2;while(Object.hasOwn(draft,name))name='New workout '+i++;draft[name]=[];draw()};
panel.querySelector('#mg6Save').onclick=()=>{if(!valid(draft))return alert('Check the programme: each day needs a unique name; exercises need names, 1–12 sets and a rep range. Maximum 14 days and 30 exercises per day.');try{localStorage.setItem(STORAGE,JSON.stringify(draft));for(const k of Object.keys(plan))delete plan[k];Object.assign(plan,clone(draft));refreshChoices();panel.querySelector('#mg6Message').textContent='✓ Programme saved on this device. Existing workout history was not changed.';if(typeof saveNotice==='function')saveNotice('✓ Training programme saved')}catch(e){alert('Could not save programme: '+e.message)}};
panel.querySelector('#mg6Reset').onclick=()=>{if(!confirm('Restore the original five-day programme? Your logged workouts will not be deleted.'))return;draft=clone(defaults);draw();panel.querySelector('#mg6Save').click()};
draft=clone(plan);draw();refreshChoices();
})();
