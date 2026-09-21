
const cfg = window.APP_CONFIG || {};
const supabaseReady = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR_PROJECT") && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("YOUR_");
const sb = supabaseReady ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

let state={user:null,profile:null,papers:[],attempts:[],ads:[],isAdmin:false};

const app=document.getElementById("app");
const loading=document.getElementById("loading");

function hideLoading(){loading.style.display="none"}
function toast(t){const x=document.getElementById("toast");x.textContent=t;x.style.display="block";setTimeout(()=>x.style.display="none",2300)}
function setPage(name){
  document.querySelectorAll(".side-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  if(name==="dashboard") dashboard();
  if(name==="papers") papersPage();
  if(name==="analytics") analyticsPage();
  if(name==="leaderboard") leaderboardPage();
  if(name==="profile") profilePage();
  if(name==="admin") adminPage();
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>setPage(b.dataset.page)));
document.getElementById("auth-btn").onclick=()=>authModal(false);
document.getElementById("signup-btn").onclick=()=>authModal(true);
document.getElementById("logout-btn").onclick=async()=>{if(sb) await sb.auth.signOut(); state={...state,user:null,profile:null,isAdmin:false}; updateHeader(); dashboard(); toast("Signed out");};
document.getElementById("modal-close").onclick=closeModal;
document.getElementById("global-search").addEventListener("input",e=>{if(document.querySelector(".paper-grid")) renderPaperCards(e.target.value)});

async function init(){
  if(!sb){hideLoading();updateHeader();dashboard();return}
  const {data:{session}}=await sb.auth.getSession();
  await loadUser(session?.user||null);
  sb.auth.onAuthStateChange((_e,s)=>setTimeout(()=>loadUser(s?.user||null),0));
  hideLoading(); dashboard();
}
async function loadUser(user){
  state.user=user; state.profile=null; state.isAdmin=false;
  if(user && sb){
    const {data:p}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
    state.profile=p||null; state.isAdmin=p?.role==="admin";
    const {data:a}=await sb.from("attempts").select("*,papers(title,subject)").eq("user_id",user.id).order("submitted_at",{ascending:false}).limit(50);
    state.attempts=a||[];
  }
  updateHeader();
}
function updateHeader(){
  const login=document.getElementById("auth-btn"), signup=document.getElementById("signup-btn"), logout=document.getElementById("logout-btn");
  if(state.user){login.classList.add("hidden");signup.classList.add("hidden");logout.classList.remove("hidden");document.getElementById("mini-avatar").textContent=(state.profile?.display_name||state.user.email||"A")[0].toUpperCase()}
  else {login.classList.remove("hidden");signup.classList.remove("hidden");logout.classList.add("hidden")}
  document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!state.isAdmin));
}
async function loadPapers(){
  if(sb){
    const {data}=await sb.from("papers").select("*").eq("published",true).order("created_at",{ascending:false});
    state.papers=data||[];
  } else {
    state.papers=[
      {id:"demo-p1",title:"Physics 2025 — Full MCQ",subject:"Physics",year:2025,question_count:50,duration_minutes:60},
      {id:"demo-p2",title:"Physics — Mechanics Topic Test",subject:"Physics",year:2026,question_count:50,duration_minutes:50},
      {id:"demo-c1",title:"Chemistry 2025 — Full MCQ",subject:"Chemistry",year:2025,question_count:50,duration_minutes:60},
      {id:"demo-c2",title:"Chemistry — P Block Topic Test",subject:"Chemistry",year:2026,question_count:50,duration_minutes:50}
    ];
  }
}
async function loadAds(){
  if(sb){const {data}=await sb.from("ads").select("*").eq("active",true).order("priority",{ascending:false});state.ads=data||[]}
}
async function dashboard(){
  await Promise.all([loadPapers(),loadAds()]);
  const attempts=state.attempts, completed=attempts.length;
  const answered=attempts.reduce((s,a)=>s+(a.total_questions||0),0), accuracy=completed?Math.round(attempts.reduce((s,a)=>s+(a.percentage||0),0)/completed):0;
  app.innerHTML=`
  <section class="hero">
    <div><h1>Hi, ${esc(state.profile?.display_name||"Student")}.<span>What are your plans for today?</span></h1>
    <p>Your personal A/L workspace. Practise Physics and Chemistry MCQs, organize your papers, track your accuracy and turn every mistake into progress.</p>
    <div class="hero-actions"><button class="btn purple" onclick="papersPage()">Start practicing →</button><button class="btn white" onclick="profilePage()">Customize profile</button></div></div>
    <div class="hero-art"><div class="orb"><div class="atom">⚛</div></div></div>
  </section>
  <section class="stats">
   ${stat("▱",completed,"Papers completed")}
   ${stat("✓",answered,"Questions answered")}
   ${stat("◒",accuracy+"%","Average accuracy")}
   ${stat("♕","—","Leaderboard position")}
  </section>
  <section class="content">
   <div class="section"><div class="sectionhead"><div><h2>Subjects</h2><span style="font-size:9px;color:#9aa1b0">Your current A/L practice</span></div><button onclick="papersPage()">View all →</button></div>
    <div class="subjects">
      ${subjectCard("Physics","Physics","Past papers, mechanics, waves, electronics and topic tests.",74)}
      ${subjectCard("Chemistry","Chemistry","Inorganic, organic, physical chemistry and full MCQ papers.",61)}
    </div>
   </div>
   <div class="section"><div class="sectionhead"><div><h2>Upcoming work</h2><span style="font-size:9px;color:#9aa1b0">Your next sessions</span></div><button onclick="papersPage()">Edit</button></div>
    <div class="assign">${upcoming()}</div>
   </div>
  </section>
  <section class="lower">
    <div class="section"><div class="sectionhead"><div><h2>Recent activity</h2><span style="font-size:9px;color:#9aa1b0">Your latest attempts</span></div><button onclick="analyticsPage()">View analytics</button></div>${recentAttempts()}</div>
    <div class="section calendar"><div class="calhead"><b>${new Date().toLocaleString("en",{month:"long",year:"numeric"})}</b><span style="color:#a0a6b5">‹ &nbsp; ›</span></div>${calendar()}</div>
  </section>
  ${adBlock()}
  <div class="promo"><div><h3>Go premium.</h3><p>Unlock detailed analytics, unlimited practice and advanced review tools.</p></div><button onclick="toast('Premium options are ready to connect')">Find out more →</button></div>`;
}
function stat(icon,val,label){return `<div class="stat"><div class="icon">${icon}</div><b>${val}</b><small>${label}</small></div>`}
function subjectCard(label,cls,desc,progress){return `<article class="subject ${cls.toLowerCase()}"><button onclick="papersPage('${label}')">→</button><span class="tag">${label.toUpperCase()}</span><h3>${label}</h3><p>${desc}</p><div class="progress"><span style="width:${progress}%"></span></div><div class="foot"><span>${progress}% progress</span><span>${state.papers.filter(p=>p.subject===label).length} papers</span></div></article>`}
function upcoming(){if(!state.papers.length)return `<div class="assignrow"><div><b>No published papers yet</b><small>Admin can publish papers from the admin panel.</small></div></div>`;return state.papers.slice(0,3).map((p,i)=>`<div class="assignrow"><div><b>${esc(p.title)}</b><small>${p.question_count||50} MCQs · ${p.subject}</small></div><span class="badge ${i===1?"green":""}">${i===1?"Planned":"Ready"}</span></div>`).join("")}
function recentAttempts(){if(!state.attempts.length)return `<div style="padding:25px;color:#9aa1b0;font-size:11px">No completed papers yet. Start your first paper to build your analytics.</div>`;return `<div class="tasks">${state.attempts.slice(0,4).map(a=>`<div class="task"><div class="check">${a.percentage>=75?"✓":"!"}</div><div><b>${esc(a.papers?.title||"Paper")}</b><small>${new Date(a.submitted_at||Date.now()).toLocaleString()} · ${a.correct_count||0}/${a.total_questions||50}</small><div class="bar"><span style="width:${a.percentage||0}%"></span></div></div><div class="percent">${a.percentage||0}%</div></div>`).join("")}</div>`}
function calendar(){const now=new Date(),year=now.getFullYear(),month=now.getMonth(),days=new Date(year,month+1,0).getDate();let first=(new Date(year,month,1).getDay()+6)%7;let cells="";for(let i=0;i<first;i++)cells+="<div></div>";for(let d=1;d<=days;d++)cells+=`<div class="${d===now.getDate()?"active":""}">${d}</div>`;return `<div class="days"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div><div class="dates">${cells}</div><div class="event"><b>Next practice session</b><span>Choose a paper from your workspace</span></div>`}
function adBlock(){const a=state.ads[0];return a?`<div class="promo" style="background:linear-gradient(135deg,#11172a,#443a78)"><div><h3>${esc(a.title||"Study smarter")}</h3><p>${esc(a.description||"Keep building your A/L progress.")}</p></div><button onclick="window.open('${escAttr(a.target_url||"#")}','_blank')">Learn more →</button></div>`:""}
async function papersPage(subject=""){
 await loadPapers();
 app.innerHTML=`<div class="page-title">MCQ Papers</div><p class="page-sub">Real published papers from your A/L MCQ library.</p><div class="filterbar"><button class="filter ${!subject?"active":""}" onclick="papersPage()">All</button><button class="filter ${subject==="Physics"?"active":""}" onclick="papersPage('Physics')">Physics</button><button class="filter ${subject==="Chemistry"?"active":""}" onclick="papersPage('Chemistry')">Chemistry</button></div><div id="paper-grid" class="paper-grid"></div>`;
 renderPaperCards("",subject);
}
function renderPaperCards(search="",subject=""){const grid=document.getElementById("paper-grid");if(!grid)return;let x=state.papers.filter(p=>(!subject||p.subject===subject)&&(!search||p.title.toLowerCase().includes(search.toLowerCase())));grid.innerHTML=x.length?x.map(p=>`<article class="paper-card"><span style="font-size:9px;color:#7568ed;font-weight:800">${esc(p.subject||"A/L")}</span><h3>${esc(p.title)}</h3><small>${p.year||""} · ${p.question_count||50} MCQs · ${p.duration_minutes||60} min</small><div class="paper-actions"><span style="font-size:9px;color:#9aa1b0">Instant review</span><button onclick="startPaper('${escAttr(p.id)}')">Start →</button></div></article>`).join(""):`<div class="section" style="grid-column:1/-1;color:#9299aa;font-size:11px">No published papers match this filter.</div>`}
async function startPaper(id){
 if(!state.user){authModal(false);return}
 if(!sb){toast("Connect Supabase in config.js to start real papers.");return}
 const {data,error}=await sb.rpc("start_attempt",{p_paper_id:id});
 if(error){toast(error.message);return}
 const attemptId=data?.attempt_id||data?.[0]?.attempt_id; if(!attemptId){toast("Could not start paper");return}
 const {data:q,error:eq}=await sb.rpc("get_paper_questions",{p_paper_id:id});
 if(eq){toast(eq.message);return}
 quizPage(attemptId,q||[]);
}
function quizPage(attemptId,questions){
 let idx=0,answers={};
 const render=()=>{const q=questions[idx];app.innerHTML=`<div class="section"><div class="sectionhead"><div><h2>${esc(state.papers.find(p=>p.id===q.paper_id)?.title||"MCQ Paper")}</h2><span style="font-size:9px;color:#9aa1b0">Question ${idx+1} of ${questions.length}</span></div><button onclick="dashboard()">Exit</button></div>${q.image_url?`<img src="${escAttr(q.image_url)}" style="width:100%;max-height:430px;object-fit:contain;border-radius:14px;background:#f5f6fa;margin:10px 0">`:`<div style="background:#f5f6fa;border-radius:14px;padding:30px;margin:10px 0;color:#a0a6b5;text-align:center">Question image not available</div>`}<h3 style="font-family:Manrope">${esc(q.question_text||"Choose the correct answer")}</h3><div style="display:grid;gap:10px">${["A","B","C","D","E"].map(o=>`<button class="filter ${answers[q.id]===o?"active":""}" style="text-align:left;padding:14px" onclick="this.dataset.answer='${o}';document.querySelectorAll('.option').forEach(x=>x.classList.remove('active'));this.classList.add('active')"><b>${o}</b> &nbsp; ${esc(q["option_"+o.toLowerCase()]||"Option "+o)}</button>`).join("")}</div><div style="display:flex;justify-content:space-between;margin-top:18px"><button class="btn white" id="prev">← Previous</button><button class="btn purple" id="next">${idx===questions.length-1?"Submit paper":"Next →"}</button></div></div>`;
 document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.answer)answers[q.id]=b.dataset.answer}));
 document.getElementById("prev").onclick=()=>{if(idx>0){idx--;render()}};
 document.getElementById("next").onclick=async()=>{if(idx<questions.length-1){idx++;render()}else{const {data,error}=await sb.rpc("submit_attempt",{p_attempt_id:attemptId,p_answers:answers});if(error){toast(error.message);return}showResult(data)}}};
 };
 render();
}
function showResult(r){const x=Array.isArray(r)?r[0]:r;app.innerHTML=`<div class="section" style="text-align:center;padding:45px"><div style="font-size:50px;color:#6657ee">✓</div><h1 class="page-title">Paper complete</h1><p class="page-sub">Your result has been saved securely.</p><div class="stats" style="max-width:650px;margin:25px auto"><div class="stat"><b>${x.score||0}/${x.total_questions||0}</b><small>Score</small></div><div class="stat"><b>${x.percentage||0}%</b><small>Accuracy</small></div><div class="stat"><b>${x.correct_count||0}</b><small>Correct</small></div><div class="stat"><b>${x.wrong_count||0}</b><small>Wrong</small></div></div><button class="btn purple" onclick="analyticsPage()">View analytics →</button></div>`}
async function analyticsPage(){if(state.user&&sb){const {data}=await sb.from("attempts").select("*,papers(title,subject)").eq("user_id",state.user.id).order("submitted_at",{ascending:false});state.attempts=data||[]}app.innerHTML=`<div class="page-title">Performance analytics</div><p class="page-sub">Understand your progress across every completed paper.</p><div class="stats">${stat("✓",state.attempts.reduce((s,a)=>s+(a.correct_count||0),0),"Correct answers")}${stat("!",state.attempts.reduce((s,a)=>s+(a.wrong_count||0),0),"Wrong answers")}${stat("◒",state.attempts.length?Math.round(state.attempts.reduce((s,a)=>s+(a.percentage||0),0)/state.attempts.length):0+"%","Average accuracy")}${stat("▱",state.attempts.length,"Completed papers")}</div><div class="section">${recentAttempts()}</div>`}
async function leaderboardPage(){let rows=[];if(sb){const {data,error}=await sb.rpc("public_leaderboard",{p_limit:20});if(!error)rows=data||[]}if(!rows.length)rows=[{rank:1,display_name:"Leaderboard will appear here",accuracy:0}];app.innerHTML=`<div class="page-title">Leaderboard</div><p class="page-sub">Public rankings based on completed A/L MCQ attempts.</p><div class="section"><div class="assign">${rows.map(r=>`<div class="assignrow"><div><b>#${r.rank} &nbsp; ${esc(r.display_name||"Student")}</b><small>Verified A/L MCQ performance</small></div><strong style="color:#49a982">${Number(r.accuracy||0).toFixed(1)}%</strong></div>`).join("")}</div></div>`}
function profilePage(){app.innerHTML=`<div class="page-title">My profile</div><p class="page-sub">Your account and learning profile.</p><div class="section"><h2 style="font-family:Manrope">${esc(state.profile?.display_name||"Student")}</h2><p style="font-size:11px;color:#9299aa">${esc(state.user?.email||"Not signed in")}</p><button class="btn purple" onclick="authModal(true)">Edit profile</button></div>`}
async function adminPage(){
 if(!state.isAdmin){toast("Admin access required");return}
 await loadPapers();
 app.innerHTML=`<div class="page-title">Admin workspace</div><p class="page-sub">Manage papers, questions, users and advertisements.</p>
 <div class="stats">${stat("▱",state.papers.length,"Papers")}${stat("◎","Admin","Access level")}${stat("✓","50","Questions / paper")}${stat("◒","Secure","Server-side marking")}</div>
 <div class="section"><div class="sectionhead"><div><h2>Paper manager</h2><span style="font-size:9px;color:#9aa1b0">Create a paper, then add questions.</span></div><button class="btn purple" onclick="createPaperModal()">New paper</button></div>
 <div class="assign">${state.papers.map(p=>`<div class="assignrow"><div><b>${esc(p.title)}</b><small>${esc(p.subject)} · ${p.question_count||50} questions · ${p.published?"Published":"Draft"}</small></div><button class="filter active" onclick="questionManager('${escAttr(p.id)}')">Manage questions →</button></div>`).join("")||"<p style='font-size:11px;color:#9299aa'>No papers yet.</p>"}</div></div>
 <div class="section" style="margin-top:17px"><div class="sectionhead"><div><h2>Advertisements</h2><span style="font-size:9px;color:#9aa1b0">Manage sponsored cards shown to students.</span></div><button class="btn purple" onclick="adModal()">New ad</button></div></div>`;
}
async function questionManager(paperId){
 const paper=state.papers.find(x=>x.id===paperId); if(!paper)return;
 const {data,error}=await sb.from("questions").select("*").eq("paper_id",paperId).order("question_number");
 if(error){toast(error.message);return}
 app.innerHTML=`<div class="page-title">${esc(paper.title)}</div><p class="page-sub">Question manager · ${data.length}/50 added. Publish only after all 50 are complete.</p>
 <div class="section"><div class="sectionhead"><h2>Add / update question</h2><button onclick="adminPage()">← Back</button></div>
 <div style="display:grid;grid-template-columns:110px 1fr;gap:8px"><input id="qnum" type="number" min="1" max="50" placeholder="No." style="padding:11px;border:1px solid #e5e7ef;border-radius:9px"><input id="qtext" placeholder="Question text (optional if using screenshot)" style="padding:11px;border:1px solid #e5e7ef;border-radius:9px"></div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">${["a","b","c","d","e"].map(x=>`<input id="op${x}" placeholder="Option ${x.toUpperCase()}" style="padding:11px;border:1px solid #e5e7ef;border-radius:9px">`).join("")}</div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><select id="correct" style="padding:11px;border:1px solid #e5e7ef;border-radius:9px"><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option></select><input id="topic" placeholder="Topic" style="padding:11px;border:1px solid #e5e7ef;border-radius:9px"></div>
 <textarea id="review" placeholder="Review / explanation" style="width:100%;min-height:80px;margin-top:8px;padding:11px;border:1px solid #e5e7ef;border-radius:9px"></textarea>
 <label style="display:block;font-size:10px;color:#8d95a7;margin-top:10px">Question image <input id="qfile" type="file" accept="image/*" style="display:block;margin-top:6px"></label>
 <label style="display:block;font-size:10px;color:#8d95a7;margin-top:10px">Review image <input id="rfile" type="file" accept="image/*" style="display:block;margin-top:6px"></label>
 <button class="btn purple" style="margin-top:15px" onclick="saveQuestion('${escAttr(paperId)}')">Save question</button></div>
 <div class="section" style="margin-top:15px"><div class="sectionhead"><h2>Questions</h2><span>${data.length}/50</span></div>${data.map(q=>`<div class="assignrow"><div><b>Q${q.question_number}</b> · ${esc(q.topic||"General")}<small>${esc((q.question_text||"Image question").slice(0,90))}</small></div><span class="badge green">${q.correct_answer}</span></div>`).join("")||"<p style='font-size:11px;color:#9299aa'>No questions yet.</p>"}</div>`;
}
async function saveQuestion(paperId){
 if(!sb)return;
 const n=Number(document.getElementById("qnum").value); if(!n||n<1||n>50)return toast("Question number must be 1–50");
 async function upload(file,bucket){if(!file)return null;const path=`${state.user.id}/${paperId}/${n}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;const {error}=await sb.storage.from(bucket).upload(path,file,{upsert:true});if(error)throw error;return `${cfg.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;}
 try{
  const qi=await upload(document.getElementById("qfile").files[0],"question-images");
  const ri=await upload(document.getElementById("rfile").files[0],"review-images");
  const payload={paper_id:paperId,question_number:n,question_text:document.getElementById("qtext").value,option_a:document.getElementById("opa").value,option_b:document.getElementById("opb").value,option_c:document.getElementById("opc").value,option_d:document.getElementById("opd").value,option_e:document.getElementById("ope").value,correct_answer:document.getElementById("correct").value,topic:document.getElementById("topic").value,review_text:document.getElementById("review").value};
  if(qi)payload.image_path=qi;if(ri)payload.review_image_path=ri;
  const {error}=await sb.from("questions").upsert(payload,{onConflict:"paper_id,question_number"});if(error)throw error;
  toast("Question saved");questionManager(paperId);
 }catch(e){toast(e.message)}
}
function adModal(){openModal(`<h2 style="font-family:Manrope">Create advertisement</h2><input id="adtitle" placeholder="Title" style="width:100%;padding:11px;border:1px solid #e5e7ef;border-radius:9px;margin:6px 0"><textarea id="addesc" placeholder="Description" style="width:100%;padding:11px;border:1px solid #e5e7ef;border-radius:9px;margin:6px 0"></textarea><input id="adurl" placeholder="Target URL" style="width:100%;padding:11px;border:1px solid #e5e7ef;border-radius:9px;margin:6px 0"><button class="btn purple" onclick="saveAd()">Save ad</button>`)}
async function saveAd(){if(!sb)return;const {error}=await sb.from("ads").insert({title:document.getElementById("adtitle").value,description:document.getElementById("addesc").value,target_url:document.getElementById("adurl").value,active:true});if(error)toast(error.message);else{closeModal();toast("Advertisement saved");}}

function createPaperModal(){openModal(`<h2 style="font-family:Manrope">Create paper</h2><input id="paper-title" placeholder="Paper title" style="width:100%;padding:12px;border:1px solid #e5e7ef;border-radius:10px;margin:7px 0"><select id="paper-subject" style="width:100%;padding:12px;border:1px solid #e5e7ef;border-radius:10px;margin:7px 0"><option>Physics</option><option>Chemistry</option></select><input id="paper-year" type="number" value="2026" style="width:100%;padding:12px;border:1px solid #e5e7ef;border-radius:10px;margin:7px 0"><button class="btn purple" onclick="createPaper()">Create paper</button>`)}
async function createPaper(){if(!sb)return toast("Connect Supabase first");const title=document.getElementById("paper-title").value.trim(),subject=document.getElementById("paper-subject").value,year=+document.getElementById("paper-year").value;if(!title)return toast("Enter a title");const {error}=await sb.from("papers").insert({title,subject,year,question_count:50,published:false,created_by:state.user.id});if(error)toast(error.message);else{closeModal();toast("Paper created");adminPage()}}
function authModal(signup){openModal(`<h2 style="font-family:Manrope">${signup?"Create your account":"Welcome back"}</h2><p style="font-size:11px;color:#9299aa">Use email/password or Google.</p><input id="email" placeholder="Email" style="width:100%;padding:12px;border:1px solid #e5e7ef;border-radius:10px;margin:6px 0"><input id="password" type="password" placeholder="Password" style="width:100%;padding:12px;border:1px solid #e5e7ef;border-radius:10px;margin:6px 0"><input id="display" placeholder="Display name" ${signup?"":"style='display:none'"} style="width:100%;padding:12px;border:1px solid #e5e7ef;border-radius:10px;margin:6px 0"><button class="btn purple" style="width:100%;margin-top:8px" onclick="emailAuth(${signup})">${signup?"Create account":"Login"}</button><button class="btn white" style="width:100%;margin-top:8px" onclick="googleAuth()">Continue with Google</button>`)}
async function emailAuth(signup){if(!sb)return toast("Open config.js and add Supabase credentials first");const email=document.getElementById("email").value,password=document.getElementById("password").value;let r=signup?await sb.auth.signUp({email,password,options:{data:{display_name:document.getElementById("display")?.value||email.split("@")[0]}}}):await sb.auth.signInWithPassword({email,password});if(r.error)toast(r.error.message);else{closeModal();toast(signup?"Account created. Check email if confirmation is enabled.":"Logged in");}}
async function googleAuth(){if(!sb)return toast("Connect Supabase first");const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin}});if(error)toast(error.message)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escAttr(s){return esc(s)}
function openModal(x){document.getElementById("modalContent").innerHTML=x;document.getElementById("modal").classList.add("show")}
function closeModal(){document.getElementById("modal").classList.remove("show")}
init();
