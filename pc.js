/* PC 조립 모드 — 회로 만들기 시뮬레이터 */
(()=>{
'use strict';

/* ================= 기본 치수 (월드 단위, 약 1.6 단위 = 1 mm) ================= */
const MATW=800,MATH=1150,CASEW=780,CASEH=870;
const MB={w:390,h:488};
const PD={
  mobo:{w:390,h:488,nm:'메인보드 (X870E)'},
  cpu:{w:60,h:72,nm:'CPU (Ryzen 9 9950X3D2)'},
  cooler:{w:170,h:160,nm:'CPU 쿨러 (NH-D15 G2)'},
  ram1:{w:213,h:44,nm:'램 1 (DDR5-6000 32GB)'},
  ram2:{w:213,h:44,nm:'램 2 (DDR5-6000 32GB)'},
  m2:{w:128,h:35,nm:'M.2 SSD (SN8100 4TB)'},
  gpu:{w:480,h:190,nm:'그래픽카드 (RTX 5090)'},
  psu:{w:240,h:138,nm:'파워서플라이 (1600W)'},
  paste:{w:100,h:26,nm:'써멀 그리스'},
  panel:{w:250,h:320,nm:'측면 패널'}
};
const PIDS=Object.keys(PD);
const ptype=id=>id==='ram1'||id==='ram2'?'ram':id;
const HOME={mobo:[20,20],cpu:[440,30],paste:[440,130],cooler:[580,20],ram1:[440,200],ram2:[440,256],m2:[440,330],psu:[540,380],gpu:[20,540],panel:[530,560]};
const RAMX={A1:245,A2:263,B1:281,B2:299};
const RAMSLOTS=['A1','A2','B1','B2'];

/* 케이블(커넥터) 정의: anchor는 케이블이 시작되는 곳 */
const CD={
  c_cpufan:{t:'fan',nm:'쿨러 팬 케이블(4핀)',col:'#d9d9d9',w:18,h:9,an:['part','cooler',160,150],rel:[40,40]},
  c_sysfan:{t:'fan',nm:'후면 팬 케이블(3핀)',col:'#d9d9d9',w:18,h:9,an:['case',78,236],rel:[50,70]},
  c_atx24:{t:'atx24',nm:'메인보드 전원(24핀)',col:'#2b2b2b',w:22,h:58,an:['part','psu',240,35],rel:[70,-110],thick:9},
  c_eps8:{t:'eps8',nm:'CPU 전원 1(8핀 EPS)',col:'#2b2b2b',w:22,h:24,an:['part','psu',240,55],rel:[110,-60],thick:6,lab:'CPU'},
  c_eps8b:{t:'eps8',nm:'CPU 전원 2(8핀 EPS)',col:'#2b2b2b',w:22,h:24,an:['part','psu',240,65],rel:[130,-30],thick:6,lab:'CPU'},
  c_pcie8:{t:'gpu16',nm:'그래픽카드 전원(12V-2x6 16핀)',col:'#2b2b2b',w:28,h:18,an:['part','psu',240,75],rel:[150,20],thick:7,lab:'16핀'},
  c_sata:{t:'sata',nm:'SATA 전원(이번 조립에는 쓰지 않음)',col:'#2b2b2b',w:26,h:10,an:['part','psu',240,95],rel:[90,50],thick:4},
  c_pwrsw:{t:'fp2',nm:'전원 스위치(POWER SW)',col:'#8a8f98',w:28,h:11,sh:'PWR',an:['case',494,560],rel:[110,-130],lab:'POWER SW'},
  c_rstsw:{t:'fp2',nm:'리셋 스위치(RESET SW)',col:'#8a8f98',w:28,h:11,sh:'RST',an:['case',494,560],rel:[110,-90],lab:'RESET SW'},
  c_pled:{t:'fp2',nm:'전원 LED(POWER LED +/−)',col:'#8a8f98',w:28,h:11,sh:'PLED',an:['case',494,560],rel:[110,-50],lab:'POWER LED',pol:true},
  c_hdled:{t:'fp2',nm:'HDD LED(+/−)',col:'#8a8f98',w:28,h:11,sh:'HDD',an:['case',494,560],rel:[110,-10],lab:'HDD LED',pol:true},
  c_usb3:{t:'usb3',nm:'전면 USB 3.0(19핀)',col:'#2f6fd6',w:20,h:44,an:['case',494,560],rel:[110,40],thick:6},
  c_audio:{t:'audio',nm:'전면 오디오(HD AUDIO)',col:'#2b2b2b',w:30,h:12,an:['case',494,560],rel:[110,100],thick:3},
  c_hdmi:{t:'hdmi',nm:'모니터 케이블(HDMI)',col:'#1d1d1d',w:26,h:14,an:['mat',200,1040],rel:[200,40],thick:6},
  c_ac:{t:'ac',nm:'전원 케이블',col:'#1d1d1d',w:26,h:22,an:['mat',445,1095],rel:[110,0],thick:7}
};
const CIDS=Object.keys(CD);
const FP=['fpPLED','fpPWR','fpHDLED','fpRST'];

/* ================= 상태 ================= */
function fresh(){
  const loose={};for(const id of PIDS)loose[id]={x:HOME[id][0],y:HOME[id][1]};
  const cend={};for(const c of CIDS)cend[c]={x:CD[c].rel[0],y:CD[c].rel[1]};
  const conn={};for(const c of CIDS)conn[c]=null;
  return{v:1,loose,inst:{mobo:null,cpu:null,cooler:null,ram1:null,ram2:null,m2:null,gpu:null,psu:null,panel:null},
    rot:{cpu:1,ram1:1,ram2:0,c_pled:1,c_hdled:0},lever:'closed',latch:{A1:0,A2:0,B1:0,B2:0},paste:false,covers:[1,1,1,1],psuSw:0,
    conn,cend,order:PIDS.slice(),savedAt:0};
}
let S=fresh();
let run=null,lastDiag=null;

/* ================= 레이아웃 ================= */
let MO={x:0,y:0},CO={x:MATW,y:0},WW=MATW+CASEW,WH=MATH,portrait=false;
function layout(w,h){
  portrait=h>w*1.15;
  if(portrait){MO={x:20,y:0};WW=MATW+40;CO={x:(WW-CASEW)/2,y:MATH};WH=MATH+CASEH;}
  else{MO={x:0,y:0};CO={x:MATW,y:(MATH-CASEH)/2};WW=MATW+CASEW;WH=MATH;}
}

/* ================= 위치 계산 ================= */
function partRect(id){
  const d=PD[id],k=S.inst[id];
  if(id==='mobo'){if(k)return{x:CO.x+70,y:CO.y+80,w:MB.w,h:MB.h,inst:true};}
  else if(id==='psu'){if(k)return{x:CO.x+70,y:CO.y+625,w:240,h:138,inst:true};}
  else if(id==='panel'){if(k)return{x:CO.x+20,y:CO.y+30,w:740,h:800,inst:true};}
  else if(k){
    const m=partRect('mobo');
    if(id==='cpu')return{x:m.x+120,y:m.y+80,w:60,h:72,inst:true};
    if(id==='cooler')return{x:m.x+65,y:m.y+36,w:170,h:160,inst:true};
    if(id==='ram1'||id==='ram2')return{x:m.x+RAMX[k],y:m.y+40,w:12,h:224,inst:true,slot:k};
    if(id==='m2')return{x:m.x+74,y:m.y+250,w:128,h:35,inst:true};
    if(id==='gpu')return{x:m.x-50,y:m.y+296,w:530,h:64,inst:true};
  }
  const p=S.loose[id];let w=d.w,h=d.h;
  if(id==='cpu'&&S.rot.cpu%2){w=d.h;h=d.w;}
  return{x:MO.x+p.x,y:MO.y+p.y,w,h,inst:false};
}
const moboR=()=>partRect('mobo');
function slots(){
  const m=moboR(),L=[];
  L.push({id:'socket',acc:'cpu',x:m.x+110,y:m.y+70,w:80,h:92});
  L.push({id:'coolerSlot',acc:'cooler',x:m.x+65,y:m.y+36,w:170,h:160});
  for(const s of RAMSLOTS)L.push({id:s,acc:'ram',x:m.x+RAMX[s],y:m.y+40,w:12,h:224,padx:6});
  L.push({id:'m2slot',acc:'m2',x:m.x+60,y:m.y+248,w:146,h:40});
  L.push({id:'pcie',acc:'gpu',x:m.x+40,y:m.y+300,w:180,h:14,pady:40});
  L.push({id:'tray',acc:'mobo',x:CO.x+70,y:CO.y+80,w:MB.w,h:MB.h});
  L.push({id:'psubay',acc:'psu',x:CO.x+70,y:CO.y+625,w:240,h:138});
  L.push({id:'caseside',acc:'panel',x:CO.x+20,y:CO.y+30,w:740,h:800});
  return L;
}
function headers(){
  const m=moboR(),L=[];
  const H=(id,t,x,y,w,h,nm)=>L.push({id,t,x:m.x+x,y:m.y+y,w,h,nm});
  H('eps','eps8',60,10,46,18,'CPU 8핀 1');
  H('eps2','eps8',110,10,46,18,'CPU 8핀 2');
  H('cpufan','fan',215,20,22,10,'CPU_FAN');
  H('sysfan','fan',250,470,22,10,'SYS_FAN1');
  H('atx24','atx24',340,150,22,110,'ATX 24핀');
  H('usb3','usb3',355,380,18,50,'USB3 헤더');
  H('fpPLED','fp2',280,452,30,12,'F_PANEL 전원 LED 자리');
  H('fpPWR','fp2',310,452,30,12,'F_PANEL 전원 스위치 자리');
  H('fpHDLED','fp2',280,466,30,12,'F_PANEL HDD LED 자리');
  H('fpRST','fp2',310,466,30,12,'F_PANEL 리셋 자리');
  H('audio','audio',20,462,34,16,'HD_AUDIO');
  if(S.inst.gpu)H('gpupwr','gpu16',322,280,56,16,'그래픽카드 12V-2x6');
  if(S.inst.mobo)L.push({id:'hdmiMobo',t:'hdmi',x:CO.x+24,y:CO.y+190,w:32,h:14,nm:'메인보드 HDMI'});
  if(S.inst.gpu)L.push({id:'hdmiGpu',t:'hdmi',x:CO.x+24,y:CO.y+384,w:32,h:14,nm:'그래픽카드 HDMI'});
  if(S.inst.psu)L.push({id:'acin',t:'ac',x:CO.x+24,y:CO.y+645,w:32,h:26,nm:'파워 전원 입력'});
  return L;
}
const hdrById=id=>headers().find(h=>h.id===id);
function anchorPos(c){
  const a=CD[c].an;
  if(a[0]==='part'){const r=partRect(a[1]);return{x:r.x+a[2]*(r.inst&&a[1]==='cooler'?1:1),y:r.y+a[3]};}
  if(a[0]==='case')return{x:CO.x+a[1],y:CO.y+a[2]};
  return{x:MO.x+a[1],y:MO.y+a[2]};
}
function endPos(c){
  const h=S.conn[c]&&hdrById(S.conn[c]);
  if(h)return{x:h.x+h.w/2,y:h.y+h.h/2,on:true,h};
  const a=anchorPos(c);return{x:a.x+S.cend[c].x,y:a.y+S.cend[c].y,on:false};
}
function caseInter(){return{
  covers:[0,1,2,3].map(i=>({id:'cover'+i,x:CO.x+22,y:CO.y+376+i*32,w:36,h:30})),
  psusw:{id:'psusw',x:CO.x+24,y:CO.y+680,w:32,h:24},
  pwrbtn:{id:'pwrbtn',x:CO.x+726,y:CO.y+70,w:28,h:28},
  rstbtn:{id:'rstbtn',x:CO.x+730,y:CO.y+110,w:20,h:16}
};}
function moboInter(){
  const m=moboR(),L=[{id:'lever',x:m.x+190,y:m.y+64,w:18,h:104}];
  for(const s of RAMSLOTS)L.push({id:'latch'+s,x:m.x+RAMX[s]-3,y:m.y+262,w:18,h:16});
  return L;
}

/* ================= 저장 ================= */
const LKEY='pc-build-v1';
let saveT=0,cloudT=0,cloudState='';
function changed(){
  S.savedAt=Date.now();
  clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(LKEY,JSON.stringify(S));}catch(e){}},250);
  scheduleCloud();
}
function scheduleCloud(){
  const A=window.CircuitAuth;if(!A||!A.sb||!A.user){setCloud('');return;}
  clearTimeout(cloudT);setCloud('saving');cloudT=setTimeout(saveCloud,1500);
}
async function saveCloud(){
  const A=window.CircuitAuth;if(!A||!A.sb||!A.user)return;
  try{const{error}=await A.sb.from('pc_build_progress').upsert({user_id:A.user.id,data:S,updated_at:new Date().toISOString()});if(error)throw error;setCloud('saved');}
  catch(e){setCloud('error');}
}
async function loadCloud(){
  const A=window.CircuitAuth;if(!A||!A.sb||!A.user){setCloud('');return;}
  try{
    const{data,error}=await A.sb.from('pc_build_progress').select('data,updated_at').eq('user_id',A.user.id).maybeSingle();
    if(error)throw error;
    if(data&&data.data&&(data.data.savedAt||0)>(S.savedAt||0)){applyState(data.data);toast('계정에 저장된 조립 진행상황을 불러왔어요');try{localStorage.setItem(LKEY,JSON.stringify(S));}catch(e){}}
    else if(!data&&S.savedAt)saveCloud();
    setCloud('saved');
  }catch(e){setCloud('error');}
}
function applyState(d){
  const f=fresh();
  S=Object.assign(f,d);
  for(const k of ['loose','inst','rot','latch','conn','cend'])S[k]=Object.assign(f[k],d[k]||{});
  if(!Array.isArray(S.covers)||S.covers.length!==4)S.covers=[1,1,1,1];
  for(const c of['c_pwrsw','c_rstsw','c_pled','c_hdled','c_usb3','c_audio'])if(S.cend[c]&&S.cend[c].x===-110)S.cend[c]={x:CD[c].rel[0],y:CD[c].rel[1]};
  S.order=(Array.isArray(d.order)?d.order.filter(x=>PD[x]):[]);for(const id of PIDS)if(!S.order.includes(id))S.order.push(id);
  run=null;lastDiag=null;
}
function loadLocal(){try{const d=JSON.parse(localStorage.getItem(LKEY));if(d&&d.v===1)applyState(d);}catch(e){}}
function setCloud(st){
  cloudState=st;const el=document.getElementById('pcCloud');if(!el)return;
  const A=window.CircuitAuth;
  if(!A||!A.user){el.textContent='로그인하면 계정에 저장';el.className='pcCloud off';return;}
  if(st==='saving'){el.textContent='저장 중…';el.className='pcCloud';}
  else if(st==='error'){el.textContent='저장 실패';el.className='pcCloud err';}
  else{const d=new Date(),z=n=>String(n).padStart(2,'0');el.textContent=`계정에 저장됨 ${z(d.getHours())}:${z(d.getMinutes())}`;el.className='pcCloud ok';}
}

/* ================= DOM ================= */
let root,cv,ctx,W=1,H=1,dpr=1,open=false;
const cam={s:1,x:0,y:0};
function build(){
  const css=document.createElement('style');
  css.textContent=`
#pc{position:fixed;inset:0;z-index:30;background:#0d1117;display:none;flex-direction:column;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;-webkit-user-select:none;user-select:none}
#pc.show{display:flex}
#pc header{flex:0 0 52px;display:flex;align-items:center;gap:6px;padding:0 10px;background:#111823;border-bottom:1px solid #1f2a37;touch-action:none}
#pc .q{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#ffc247,#ff7b4a);color:#111;font-size:22px;font-weight:900;border:0;cursor:pointer;font-family:inherit}
#pc .tt{font-weight:800;font-size:16px;white-space:nowrap}
#pc .sp{flex:1}
.pcCloud{font-size:11px;color:#8b9bb0;white-space:nowrap;cursor:pointer}
.pcCloud.ok{color:#7ee787}.pcCloud.err{color:#ff9b94}
@media (max-width:520px){#pc .tt{display:none}.pcCloud{max-width:92px;overflow:hidden;text-overflow:ellipsis}}
#pc .hb2{height:38px;padding:0 11px;border-radius:10px;background:#1a2330;border:1px solid #263242;color:#e6edf3;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;touch-action:manipulation}
#pc main{flex:1;position:relative;overflow:hidden}
#pcCv{position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block}
#pcToast{position:absolute;top:10px;left:50%;transform:translateX(-50%);max-width:92%;font-size:13px;line-height:1.45;background:rgba(17,24,35,.95);border:1px solid #2a3646;padding:8px 14px;border-radius:12px;pointer-events:none;transition:opacity .4s;opacity:0;text-align:center}
#pcToast.bad{border-color:#a1323a;background:rgba(70,18,22,.95);color:#ffd7d5}
#pcToast.good{border-color:#2f8f4e;background:rgba(18,52,30,.95);color:#c9f7d5}
#pcZoom{position:absolute;right:10px;bottom:10px;display:flex;flex-direction:column;gap:6px}
#pcZoom button{width:38px;height:38px;border-radius:10px;background:rgba(26,35,48,.92);border:1px solid #263242;color:#e6edf3;font-size:18px;cursor:pointer;touch-action:manipulation}
#pcHint{position:absolute;inset:0;background:rgba(0,0,0,.55);display:none;z-index:5}
#pcHint.show{display:block}
#pcHint .card{position:absolute;left:10px;top:10px;width:min(440px,calc(100% - 20px));max-height:calc(100% - 20px);overflow:auto;background:#111823;border:1px solid #2a3646;border-radius:14px;padding:14px 16px 16px;font-size:14px;line-height:1.65;-webkit-user-select:text;user-select:text}
#pcHint h3{margin:0 0 2px;font-size:12px;color:#8b9bb0;font-weight:600}
#pcHint h2{margin:0 0 6px;font-size:18px;color:#ffc247}
#pcHint p{margin:6px 0;color:#d5dde6}
#pcHint .why{font-size:12.5px;color:#9fb0c3;border-left:3px solid #2f6db0;padding-left:8px}
#pcHint .bt{display:flex;gap:6px;margin-top:10px}
#pcHint .bt button{flex:1;background:#1a2330;border:1px solid #2a3646;color:#e6edf3;border-radius:10px;padding:9px;font-size:13px;cursor:pointer;font-family:inherit}
#pcHint .bt .pri{background:#1e3a5f;border-color:#2f6db0}
#pcHint ol{padding-left:20px;margin:8px 0 0;font-size:12.5px;color:#8b9bb0}
#pcHint li.done{color:#7ee787}
#pcHint li.cur{color:#fff;font-weight:700}
#pcHint .pins{font-family:ui-monospace,Menlo,monospace;font-size:12px;background:#0a0e14;border:1px solid #1f2a37;border-radius:8px;padding:6px 8px;white-space:pre;overflow:auto;color:#fff}
`;
  document.head.appendChild(css);
  root=document.createElement('div');root.id='pc';
  root.innerHTML=`<header><button class="q" id="pcQ" title="다음에 할 일">?</button><div class="tt">PC 조립</div><div class="sp"></div><div class="pcCloud off" id="pcCloud"></div><button class="hb2" id="pcReset">처음부터</button><button class="hb2" id="pcBack">회로 모드</button></header>
<main><canvas id="pcCv"></canvas><div id="pcToast"></div><div id="pcZoom"><button id="pcZi">＋</button><button id="pcZo">－</button><button id="pcZf">⤢</button></div>
<div id="pcHint"><div class="card" id="pcHintCard"></div></div></main>`;
  document.body.appendChild(root);
  cv=document.getElementById('pcCv');ctx=cv.getContext('2d');
  document.getElementById('pcBack').onclick=close;
  document.getElementById('pcQ').onclick=()=>{document.getElementById('pcHint').classList.contains('show')?hideHint():showHint();};
  document.getElementById('pcHint').onclick=e=>{if(e.target.id==='pcHint')hideHint();};
  let resetArm=0;
  document.getElementById('pcReset').onclick=e=>{
    const b=e.currentTarget;
    if(Date.now()-resetArm>3000){resetArm=Date.now();b.textContent='한 번 더 누르면 초기화돼요';setTimeout(()=>b.textContent='처음부터',3000);return;}
    resetArm=0;b.textContent='처음부터';S=fresh();run=null;lastDiag=null;changed();fit();toast('부품을 모두 매트 위로 되돌렸어요');
  };
  document.getElementById('pcCloud').onclick=()=>{const A=window.CircuitAuth;if(A&&!A.user&&A.openAcct)A.openAcct();};
  document.getElementById('pcZi').onclick=()=>zoomAt(W/2,H/2,1.25);
  document.getElementById('pcZo').onclick=()=>zoomAt(W/2,H/2,.8);
  document.getElementById('pcZf').onclick=fit;
  bindInput();
  window.addEventListener('resize',()=>{if(open){const p=portrait;resize();if(p!==portrait)fit();}});
  if(window.CircuitAuth&&window.CircuitAuth.on)window.CircuitAuth.on(()=>{if(open)loadCloud();else setCloud('');});
}
function resize(){const r=cv.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2.5);W=Math.max(1,r.width);H=Math.max(1,r.height);cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);layout(W,H);}
function fit(){const s=Math.min(W/WW,H/WH)*.98;cam.s=s;cam.x=(W-WW*s)/2;cam.y=(H-WH*s)/2;}
function zoomAt(x,y,f){const s=Math.max(.12,Math.min(6,cam.s*f));cam.x=x-(x-cam.x)*s/cam.s;cam.y=y-(y-cam.y)*s/cam.s;cam.s=s;}
let toastT=0;
function toast(msg,kind,ms){const t=document.getElementById('pcToast');t.textContent=msg;t.className=kind||'';t.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>t.style.opacity=0,ms||3200);}

/* ================= 장착 규칙 ================= */
const ramOf=s=>S.inst.ram1===s?'ram1':S.inst.ram2===s?'ram2':null;
function canInstall(id,slot){
  const t=ptype(id);
  if(run)return'전원이 켜져 있어요. 먼저 전원을 꺼 주세요';
  if(slot.acc!==t)return'여기에 맞는 부품이 아니에요';
  if(S.inst.panel&&['tray','psubay','pcie'].includes(slot.id)||S.inst.panel&&S.inst.mobo&&['socket','coolerSlot','m2slot','A1','A2','B1','B2'].includes(slot.id))return'측면 패널이 닫혀 있어요. 패널부터 떼어 주세요';
  switch(slot.id){
    case'socket':
      if(S.inst.cpu)return'소켓에 이미 CPU가 있어요';
      if(S.lever!=='open')return'소켓 레버가 내려가 있어요. 소켓 오른쪽 레버를 눌러 먼저 올려 주세요';
      if(S.rot.cpu!==0)return'CPU 방향이 안 맞아요. CPU의 금색 삼각형을 소켓 왼쪽 위 삼각형에 맞춰 주세요. CPU를 탭하면 90°씩 돌아가요';
      return null;
    case'coolerSlot':
      if(S.inst.cooler)return'이미 쿨러가 달려 있어요';
      if(!S.inst.cpu)return'CPU부터 장착해 주세요';
      if(S.lever!=='closed')return'소켓 레버를 먼저 내려서 CPU를 고정해 주세요';
      return null;
    case'A1':case'A2':case'B1':case'B2':
      if(ramOf(slot.id))return'그 슬롯에는 이미 램이 꽂혀 있어요';
      if(!S.latch[slot.id])return`${slot.id} 슬롯 아래쪽 래치(걸쇠)가 닫혀 있어요. 래치를 눌러 먼저 열어 주세요`;
      if(S.rot[id]!==0)return'램의 홈(노치)이 슬롯 돌기와 안 맞아요. 램을 탭해서 180° 돌려 주세요';
      return null;
    case'm2slot':if(S.inst.m2)return'이미 SSD가 꽂혀 있어요';return null;
    case'pcie':
      if(S.inst.gpu)return'이미 그래픽카드가 꽂혀 있어요';
      if(!S.inst.mobo)return'그래픽카드는 메인보드를 케이스에 넣은 다음에 꽂아요(브래킷을 케이스 뒤판에 고정해야 하거든요)';
      if(S.covers[0]||S.covers[1])return'케이스 뒤쪽 확장 슬롯 덮개 2개를 먼저 떼어 주세요(그래픽카드가 2칸을 차지해요)';
      return null;
    case'tray':if(S.inst.mobo)return'이미 메인보드가 들어가 있어요';return null;
    case'psubay':if(S.inst.psu)return'이미 파워가 들어가 있어요';return null;
    case'caseside':if(S.inst.panel)return'이미 패널이 닫혀 있어요';return null;
  }
  return null;
}
function canRemove(id){
  const r=partRect(id);
  if(!r.inst)return null;
  if(run)return'전원이 켜져 있어요. 먼저 전원을 꺼 주세요';
  if(S.inst.panel&&id!=='panel'&&id!=='psu')return'측면 패널이 닫혀 있어요. 패널부터 떼어 주세요';
  if(S.inst.panel&&id==='psu')return'측면 패널이 닫혀 있어요. 패널부터 떼어 주세요';
  switch(id){
    case'cpu':if(S.inst.cooler)return'쿨러가 CPU를 덮고 있어요. 쿨러부터 빼 주세요';if(S.lever!=='open')return'소켓 레버를 올려야 CPU를 뺄 수 있어요';break;
    case'ram1':case'ram2':if(S.latch[S.inst[id]]===0)return'래치가 닫혀서 램이 고정돼 있어요. 슬롯 아래 래치를 눌러 열어 주세요';break;
    case'mobo':if(S.inst.gpu)return'그래픽카드가 케이스에 고정돼 있어요. 그래픽카드부터 빼 주세요';break;
  }
  return null;
}

/* ================= 입력 ================= */
let held=null,act=null;const ptrs=new Map();
const toW=(sx,sy)=>({x:(sx-cam.x)/cam.s,y:(sy-cam.y)/cam.s});
const inR=(p,r,pad=0,pady)=>p.x>=r.x-(r.padx||0)-pad&&p.x<=r.x+r.w+(r.padx||0)+pad&&p.y>=r.y-(r.pady||0)-(pady??pad)&&p.y<=r.y+r.h+(r.pady||0)+(pady??pad);
function panelBlocks(p){return S.inst.panel&&p.x>CO.x+60&&p.x<CO.x+720&&p.y>CO.y+40&&p.y<CO.y+820;}
function hitConn(p){
  const pad=10/cam.s;let best=null,bd=1e9;
  for(const c of CIDS){
    const e=endPos(c);
    if(panelBlocks(e)&&!['c_hdmi','c_ac'].includes(c))continue;
    const d=Math.hypot(p.x-e.x,p.y-e.y);const rr=Math.max(CD[c].w,CD[c].h)/2+pad;
    if(d<rr&&d<bd){bd=d;best=c;}
  }
  return best;
}
function hitInter(p){
  const ci=caseInter(),pad=6/cam.s;
  for(const k of ['pwrbtn','rstbtn','psusw'])if((k!=='psusw'||S.inst.psu)&&inR(p,ci[k],pad))return ci[k].id;
  if(!S.inst.panel)for(const c of ci.covers)if(S.covers[+c.id.slice(5)]&&!(S.inst.gpu&&+c.id.slice(5)<2)&&inR(p,c,pad))return c.id;
  if(!panelBlocks(p))for(const m of moboInter())if(inR(p,m,pad)){
    if(m.id==='lever'&&S.inst.cooler)continue;
    return m.id;
  }
  return null;
}
function hitPart(p){
  if(S.inst.panel&&inR(p,partRect('panel')))return panelBlocks(p)?'panel':null;
  const z=['gpu','cooler','ram1','ram2','cpu','m2','mobo','psu'];
  const instTop=z.filter(id=>partRect(id).inst);
  const looseO=S.order.filter(id=>!partRect(id).inst).reverse();
  // 매트 위 부품(위에 놓인 것 우선)과 그 위의 장착물
  const cand=[];
  for(const id of instTop){const r=partRect(id);if(inR(p,r,2/cam.s))cand.push(id);}
  for(const id of looseO){const r=partRect(id);if(inR(p,r,2/cam.s))cand.push(id);}
  if(!cand.length)return null;
  // 장착된 자식이 있으면 자식 우선, 메인보드/파워는 뒤
  const pri=id=>{const r=partRect(id);if(!r.inst&&id!=='mobo')return 100-looseO.indexOf(id);return{gpu:90,cooler:80,ram1:70,ram2:70,cpu:60,m2:60,mobo:r.inst?10:40,psu:10}[id];};
  // 매트 위 부품이 메인보드(매트) 위에 겹쳐 있을 때 위쪽 우선
  cand.sort((a,b)=>pri(b)-pri(a));
  return cand[0];
}
function bindInput(){
  cv.addEventListener('pointerdown',ev=>{
    ev.preventDefault();try{cv.setPointerCapture(ev.pointerId);}catch(e){}
    const r=cv.getBoundingClientRect(),sp={x:ev.clientX-r.left,y:ev.clientY-r.top};ptrs.set(ev.pointerId,sp);
    if(ptrs.size===2){cancelHeld();const[a,b]=[...ptrs.values()];act={k:'pinch',d0:Math.max(10,Math.hypot(a.x-b.x,a.y-b.y)),m0:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},c0:{...cam}};return;}
    if(ptrs.size>2)return;
    const p=toW(sp.x,sp.y);
    const c=hitConn(p);
    if(c){act={k:'conn',id:c,s0:sp,p0:p,moved:false};return;}
    const it=hitInter(p);
    if(it){act={k:'tap',id:it,s0:sp,moved:false};return;}
    const id=hitPart(p);
    if(id){const pr=partRect(id);act={k:'part',id,s0:sp,p0:p,off:{x:p.x-pr.x,y:p.y-pr.y},moved:false};return;}
    act={k:'pan',s0:sp,c0:{...cam}};
  });
  cv.addEventListener('pointermove',ev=>{
    if(!ptrs.has(ev.pointerId))return;
    const r=cv.getBoundingClientRect(),sp={x:ev.clientX-r.left,y:ev.clientY-r.top};ptrs.set(ev.pointerId,sp);
    if(!act)return;
    if(act.k==='pinch'){if(ptrs.size<2)return;const[a,b]=[...ptrs.values()];const f=Math.hypot(a.x-b.x,a.y-b.y)/act.d0,m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const s=Math.max(.12,Math.min(6,act.c0.s*f));cam.s=s;cam.x=m.x-(act.m0.x-act.c0.x)*s/act.c0.s;cam.y=m.y-(act.m0.y-act.c0.y)*s/act.c0.s;return;}
    if(act.k==='pan'){cam.x=act.c0.x+sp.x-act.s0.x;cam.y=act.c0.y+sp.y-act.s0.y;return;}
    const dist=Math.hypot(sp.x-act.s0.x,sp.y-act.s0.y);
    if(!act.moved&&dist>7){
      act.moved=true;
      if(act.k==='part'){if(!startPart(act))return;}
      else if(act.k==='conn'){if(!startConn(act))return;}
    }
    if(held)held.p=toW(sp.x,sp.y);
  });
  const end=(ev,cancel)=>{
    ptrs.delete(ev.pointerId);
    if(!act)return;
    if(act.k==='pinch'){if(!ptrs.size)act=null;return;}
    const a=act;act=null;
    if(cancel){cancelHeld();return;}
    if(a.k==='tap'&&!a.moved)tapInter(a.id);
    else if(a.k==='part'){if(held)dropPart();else if(!a.moved)tapPart(a.id);}
    else if(a.k==='conn'){if(held)dropConn();else if(!a.moved)tapConn(a.id);}
  };
  cv.addEventListener('pointerup',ev=>end(ev,false));
  cv.addEventListener('pointercancel',ev=>end(ev,true));
  cv.addEventListener('wheel',ev=>{ev.preventDefault();const r=cv.getBoundingClientRect();zoomAt(ev.clientX-r.left,ev.clientY-r.top,Math.exp(-ev.deltaY*.0015));},{passive:false});
}
function cancelHeld(){
  if(held){if(held.k==='part'){S.loose[held.id]=held.prevLoose;S.inst[held.id]=held.prevInst;}else{S.conn[held.id]=held.prevConn;}held=null;}
  act=act&&act.k==='pinch'?act:null;
}
function startPart(a){
  const id=a.id,msg=canRemove(id);
  if(msg){toast(msg,'bad');act=null;return false;}
  const r=partRect(id);
  held={k:'part',id,off:r.inst?{x:Math.min(a.off.x,PD[id].w*.5),y:Math.min(a.off.y,PD[id].h*.5)}:a.off,p:a.p0,prevLoose:{...S.loose[id]},prevInst:S.inst[id],wasInst:r.inst};
  if(r.inst){
    if(id==='ram1'||id==='ram2'){/* 래치는 열린 상태 유지 */}
    S.inst[id]=null;
    if(id==='gpu'){detachIf(['gpupwr','hdmiGpu']);}
    if(id==='mobo'){detachIf(['hdmiMobo']);}
    if(id==='psu'){detachIf(['acin']);}
    if(id==='cooler'&&S.conn.c_cpufan){detachIf([S.conn.c_cpufan]);toast('쿨러 팬 케이블을 먼저 뽑고 쿨러를 뗐어요');}
    held.off={x:Math.min(a.off.x,PD[id].w-10),y:Math.min(a.off.y,PD[id].h-10)};
  }
  S.order=S.order.filter(x=>x!==id);S.order.push(id);
  return true;
}
function detachIf(ids){for(const c of CIDS)if(ids.includes(S.conn[c])){const e=endPos(c);const an=anchorPos(c);S.conn[c]=null;S.cend[c]={x:e.x-an.x+20,y:e.y-an.y+30};}}
function startConn(a){
  if(run&&a.id!=='c_ac'){toast('전원이 켜져 있어요. 먼저 전원을 꺼 주세요','bad');act=null;return false;}
  held={k:'conn',id:a.id,p:a.p0,prevConn:S.conn[a.id]};
  if(S.conn[a.id]){S.conn[a.id]=null;}
  if(a.id==='c_ac'&&run){run=null;toast('전원 케이블을 뽑아서 전원이 꺼졌어요');}
  return true;
}
function slotAt(id,p){
  const t=ptype(id);let best=null,bd=1e9;
  for(const s of slots()){
    if(s.acc!==t)continue;
    if(s.id==='coolerSlot'||s.id==='caseside'){if(inR(p,s,10))return s;continue;}
    if(inR(p,s,24)){const d=Math.hypot(p.x-(s.x+s.w/2),p.y-(s.y+s.h/2))*(s.padx?3:1);if(d<bd){bd=d;best=s;}}
  }
  return best;
}
function dropPart(){
  const h=held;held=null;const id=h.id,p=h.p;
  if(id==='paste'){
    S.loose.paste={...h.prevLoose};
    const sk=slots().find(s=>s.id==='socket');
    if(inR(p,sk,30)){
      if(!S.inst.cpu)toast('소켓에 CPU가 없어요. CPU부터 장착해 주세요','bad');
      else if(S.inst.cooler)toast('쿨러가 CPU를 덮고 있어요. 쿨러를 빼고 발라 주세요','bad');
      else if(S.paste)toast('이미 써멀 그리스를 발랐어요. 너무 많이 바르면 옆으로 넘쳐요');
      else{S.paste=true;toast('CPU 가운데에 써멀 그리스를 콩알만큼 짰어요','good');}
    }else toast('써멀 그리스는 소켓에 꽂힌 CPU 위로 끌어다 놓으세요');
    changed();return;
  }
  const s=slotAt(id,p);
  if(s){
    const msg=canInstall(id,s);
    if(!msg){
      S.inst[id]=s.id;
      if(s.acc==='ram'){S.latch[s.id]=0;toast(`${s.id} 슬롯에 램이 '딸깍' 하고 고정됐어요`,'good');}
      else toast(INSTMSG[id]||'장착했어요','good');
      changed();return;
    }
    toast(msg,'bad',4200);
    if(!h.wasInst){S.loose[id]=h.prevLoose;changed();return;}
  }
  let x=p.x-h.off.x-MO.x,y=p.y-h.off.y-MO.y;
  const r=partRect(id);
  x=Math.max(-MO.x-r.w*.5,Math.min(WW-MO.x-r.w*.5,x));y=Math.max(-MO.y-r.h*.5,Math.min(WH-MO.y-r.h*.5,y));
  S.loose[id]={x,y};changed();
}
const INSTMSG={cpu:'CPU를 소켓에 살며시 내려놓았어요. 이제 레버를 내려서 고정해 주세요',cooler:'쿨러를 CPU 위에 고정했어요',m2:'M.2 SSD를 비스듬히 꽂고 나사로 고정했어요',gpu:'그래픽카드를 PCIe x16 슬롯에 꽂았어요(슬롯 끝 걸쇠가 딸깍 잠겨요)',mobo:'메인보드를 케이스 스탠드오프 위에 올리고 나사 9개로 고정했어요',psu:'파워를 케이스 아래 칸에 넣고 뒤판 나사로 고정했어요',panel:'측면 패널을 닫고 나사를 조였어요'};
function hdrAt(p){let best=null,bd=1e9;for(const h of headers()){if(inR(p,h,14)){const d=Math.hypot(p.x-(h.x+h.w/2),p.y-(h.y+h.h/2));if(d<bd){bd=d;best=h;}}}return best;}
function dropConn(){
  const h=held;held=null;const c=h.id,p=h.p,d=CD[c];
  const hd=hdrAt(p);
  if(hd&&!(panelBlocks(p)&&!['hdmi','ac'].includes(hd.t))){
    if(hd.t!==d.t){
      if(d.t==='eps8'&&hd.t==='gpu16'||d.t==='gpu16'&&hd.t==='eps8')toast('CPU용 8핀(EPS)과 그래픽카드용 12V-2x6(16핀)은 모양이 완전히 달라서 안 들어가요. 커넥터에 적힌 글자(CPU / 16핀)를 확인해 주세요','bad',5000);
      else if(d.t==='sata')toast('SATA 전원은 SATA 저장장치용이에요. 이번 조립에서는 안 쓰니 그냥 두세요','bad');
      else toast(`${d.nm}는 ${hd.nm}에 안 맞아요`,'bad');
    }else{
      const occ=CIDS.find(x=>x!==c&&S.conn[x]===hd.id);
      if(occ)toast(`${hd.nm}에는 이미 ${CD[occ].nm}가 꽂혀 있어요`,'bad');
      else{S.conn[c]=hd.id;toast(CONNMSG(c,hd),'good');changed();return;}
    }
  }
  const an=anchorPos(c);S.cend[c]={x:p.x-an.x,y:p.y-an.y};changed();
}
function CONNMSG(c,hd){
  if(c==='c_ac'){return'전원 케이블을 파워 뒤쪽에 꽂았어요';}
  if(CD[c].t==='fp2')return`${CD[c].lab}를 ${hd.nm.replace('F_PANEL ','')}에 꽂았어요`;
  return`${CD[c].nm}를 ${hd.nm}에 꽂았어요`;
}
function tapPart(id){
  if(run){toast('전원이 켜져 있어요');return;}
  const r=partRect(id);
  if(id==='cpu'&&!r.inst){S.rot.cpu=(S.rot.cpu+1)%4;changed();toast('CPU를 90° 돌렸어요. 금색 삼각형이 왼쪽 위로 오게 맞춰 주세요');return;}
  if((id==='ram1'||id==='ram2')&&!r.inst){S.rot[id]^=1;changed();toast('램을 180° 돌렸어요. 홈(노치) 위치를 확인해 보세요');return;}
  toast(`${PD[id].nm} — 끌어서 옮길 수 있어요`+(r.inst?' (장착된 부품은 끌면 빠져요)':''));
}
function tapConn(c){
  if(CD[c].pol){if(run){toast('전원이 켜져 있어요');return;}S.rot[c]^=1;changed();toast(`${CD[c].lab} 커넥터를 뒤집었어요(+/− 방향이 바뀌어요)`);return;}
  toast(CD[c].nm+(S.conn[c]?' — 끌어서 뽑을 수 있어요':' — 끌어서 맞는 곳에 꽂아 주세요'));
}
function tapInter(id){
  if(id==='pwrbtn'||id==='rstbtn'){pressButton(id);return;}
  if(id==='psusw'){if(!S.inst.psu){toast('파워가 아직 케이스에 없어요');return;}S.psuSw^=1;changed();toast(S.psuSw?'파워 스위치를 I(켜짐)로 올렸어요':'파워 스위치를 O(꺼짐)로 내렸어요');if(!S.psuSw&&run){run=null;toast('파워 스위치를 내려서 컴퓨터가 꺼졌어요');}return;}
  if(run){toast('전원이 켜져 있어요. 먼저 전원을 꺼 주세요','bad');return;}
  if(id.startsWith('cover')){const i=+id.slice(5);S.covers[i]=0;changed();toast(`확장 슬롯 덮개 ${i+1}번을 떼어 냈어요`,'good');return;}
  if(id==='lever'){S.lever=S.lever==='open'?'closed':'open';changed();toast(S.lever==='open'?'소켓 레버를 올렸어요':S.inst.cpu?'소켓 레버를 내려서 CPU를 고정했어요(꽤 뻑뻑한 게 정상이에요)':'소켓 레버를 내렸어요');return;}
  if(id.startsWith('latch')){const s=id.slice(5);S.latch[s]^=1;changed();toast(`${s} 슬롯 래치를 ${S.latch[s]?'열었어요':'닫았어요'}`);return;}
}

/* ================= 부팅 판정 ================= */
const epsN=()=>['c_eps8','c_eps8b'].filter(c=>S.conn[c]==='eps'||S.conn[c]==='eps2').length;
function diagnose(){
  if(S.conn.c_atx24!=='atx24')return{dead:true,msg:'메인보드 24핀 전원이 안 꽂혀 있어서 아무 반응이 없어요.'};
  if(!epsN())return{led:'CPU',msg:'팬은 도는데 CPU 디버그 LED가 켜진 채 멈췄어요. CPU 보조전원(8핀 EPS)이 하나도 안 꽂혀 있으면 CPU에 전원이 안 들어가요.'};
  if(!S.inst.cpu||S.lever!=='closed')return{led:'CPU',msg:'CPU 디버그 LED에서 멈췄어요. CPU가 없거나 소켓 레버가 고정되지 않았어요.'};
  if(!S.inst.ram1&&!S.inst.ram2)return{led:'DRAM',msg:'DRAM 디버그 LED에서 멈췄어요. 램이 없으면 부팅이 안 돼요.'};
  if(S.inst.gpu&&S.conn.c_pcie8!=='gpupwr')return{led:'VGA',msg:'VGA 디버그 LED에서 멈췄어요. RTX 5090의 12V-2x6(16핀) 전원이 안 꽂혀 있어요. 이 카드는 최대 575 W를 써서 슬롯 전원만으로는 켜지지 않아요.'};
  if(!S.inst.cooler)return{overheat:3.6,msg:'쿨러가 없어서 CPU 온도가 순식간에 95 °C 한계를 넘었고, CPU가 스스로를 지키려고 전원을 껐어요.'};
  if(S.conn.c_cpufan!=='cpufan')return{fanerr:true,msg:S.conn.c_cpufan?'쿨러 팬이 CPU_FAN이 아닌 다른 팬 단자에 꽂혀 있어서 BIOS가 "CPU Fan Error"를 띄웠어요.':'쿨러 팬 케이블이 안 꽂혀 있어서 BIOS가 "CPU Fan Error"를 띄웠어요.'};
  if(!S.inst.m2)return{led:'BOOT',noboot:true,msg:'BOOT 디버그 LED에서 멈추고 "부팅 장치를 찾을 수 없음" 메시지가 떴어요. 운영체제가 든 SSD가 없어요.'};
  if(!S.paste)return{os:true,overheat:10,msg:'윈도우까지는 켜졌는데, 써멀 그리스가 없어서 열이 쿨러로 잘 안 넘어갔어요. 온도가 계속 올라 과열로 꺼졌어요.'};
  if(!S.inst.gpu)return{os:true,igpuOnly:true,msg:'그래픽카드 없이 CPU 내장 그래픽으로 켜졌어요. Ryzen 9000은 작은 내장 그래픽이 있어서 메인보드 HDMI로 화면이 나와요. 게임용 성능을 쓰려면 RTX 5090을 달아야 해요.'};
  return{os:true,ok:true,msg:'정상적으로 부팅됐어요.'};
}
function pressButton(id){
  const c=id==='pwrbtn'?'c_pwrsw':'c_rstsw',at=S.conn[c];
  const nm=id==='pwrbtn'?'전원':'리셋';
  if(!at){toast(`케이스 ${nm} 버튼을 눌렀는데 반응이 없어요. 버튼 케이블이 메인보드에 안 꽂혀 있어요`,'bad');lastDiag={msg:`케이스 ${nm} 버튼 케이블(${CD[c].lab})이 F_PANEL에 안 꽂혀 있어요.`};return;}
  const action=at==='fpPWR'?'power':at==='fpRST'?'reset':null;
  if(!action){toast(`케이스 ${nm} 버튼을 눌렀는데 반응이 없어요`,'bad');lastDiag={msg:`${CD[c].lab} 커넥터가 F_PANEL의 엉뚱한 자리(LED 자리)에 꽂혀 있어요.`};return;}
  if(action==='reset'){
    if(run){run.t0=performance.now();toast('컴퓨터가 다시 시작됐어요');}
    else{toast(`케이스 ${nm} 버튼을 눌렀는데 켜지지 않아요`,'bad');lastDiag={msg:id==='pwrbtn'?'전원 스위치 커넥터가 F_PANEL의 리셋 자리에 꽂혀 있어요. 그래서 전원 버튼이 리셋 버튼처럼 동작해요.':'리셋 버튼은 켜져 있는 컴퓨터를 다시 시작할 뿐, 전원을 켜지는 않아요.'};}
    return;
  }
  if(run){run=null;toast('전원 버튼을 눌러 컴퓨터를 껐어요');return;}
  if(S.conn.c_ac!=='acin'||!S.psuSw){toast('전원 버튼을 눌렀는데 아무 반응이 없어요','bad');lastDiag={msg:S.conn.c_ac!=='acin'?'파워에 전원 케이블이 안 꽂혀 있어요.':'파워 뒤쪽 스위치가 O(꺼짐)에 있어요.'};return;}
  const d=diagnose();lastDiag=d;
  if(d.dead){toast('전원 버튼을 눌렀는데 아무 반응이 없어요','bad');return;}
  run={t0:performance.now(),d};toast('전원이 들어왔어요','good',1500);
}
function runPhase(){if(!run)return null;return(performance.now()-run.t0)/1000;}
function ledState(){
  const t=runPhase();if(t===null)return null;
  const seq=['CPU','DRAM','VGA','BOOT'],d=run.d;
  const i=Math.min(3,Math.floor(t/.55));
  if(d.led){const k=seq.indexOf(d.led);return t>=k*.55?d.led:seq[i];}
  if(t>2.2)return null;return seq[i];
}

/* ================= 힌트 ================= */
const fpTxt=`F_PANEL 핀 배치 (메인보드 설명서)
 ┌──────────────────────┐
 │ PLED+ PLED−  PWR   PWR │  ← 위 줄
 │ HDD+  HDD−   RST   RST │  ← 아래 줄
 └──────────────────────┘
 왼쪽 2핀 + 오른쪽 2핀씩 한 자리`;
function steps(){
  const ram2=[S.inst.ram1,S.inst.ram2].filter(Boolean);
  const L=[];
  const st=(id,title,done,text,why,tg)=>L.push({id,title,done,text,why,tg});
  st('lever','CPU 소켓 레버 올리기',!!S.inst.cpu||S.lever==='open','메인보드 CPU 소켓 오른쪽에 있는 쇠 레버를 탭해서 올려 주세요.','레버를 올려야 소켓 덮개(로드 플레이트)가 열려서 CPU를 넣을 수 있어요.',['lever']);
  st('cpu','CPU 장착',!!S.inst.cpu,'CPU를 끌어서 소켓에 놓아 주세요. CPU 모서리의 금색 삼각형이 소켓 왼쪽 위 삼각형과 같은 쪽에 와야 해요. 방향이 다르면 매트 위 CPU를 탭해서 90°씩 돌려 주세요.','AM5 소켓은 핀이 CPU가 아니라 메인보드 쪽에 있어요. CPU는 한 방향으로만 들어가고, 억지로 누르면 소켓 핀이 휘어서 메인보드가 망가져요.',['cpu','socket']);
  st('leverc','소켓 레버 내리기',!!S.inst.cpu&&S.lever==='closed','레버를 다시 탭해서 내려 주세요.','레버가 CPU를 눌러 고정해야 핀이 제대로 닿아요.',['lever']);
  st('paste','써멀 그리스 바르기',S.paste,'써멀 그리스 튜브를 끌어서 소켓의 CPU 위에 놓아 주세요.','CPU와 쿨러 바닥 사이의 미세한 틈을 메워서 열이 잘 전달되게 해 줘요.',['paste','socket']);
  st('cooler','CPU 쿨러 장착',!!S.inst.cooler&&S.paste,S.inst.cooler&&!S.paste?'써멀 그리스 없이 쿨러를 달았어요. 쿨러를 끌어서 뗀 다음, 써멀을 바르고 다시 달아 주세요.':'CPU 쿨러를 끌어서 CPU 위에 놓아 주세요.','쿨러가 없으면 CPU는 몇 초 만에 100 °C를 넘어요.',['cooler','coolerSlot']);
  st('cpufan','쿨러 팬 케이블 → CPU_FAN',S.conn.c_cpufan==='cpufan',S.conn.c_cpufan?'쿨러 팬 케이블이 다른 팬 단자에 꽂혀 있어요. 소켓 위쪽 CPU_FAN 단자로 옮겨 주세요.':'쿨러에서 나온 작은 팬 케이블 끝을 끌어서 소켓 위쪽 CPU_FAN 단자에 꽂아 주세요.','BIOS는 CPU_FAN 단자의 팬 회전수를 확인해요. 거기에 팬이 없으면 "CPU Fan Error"로 부팅이 멈춰요.',['c_cpufan','cpufan']);
  const badRam=ram2.some(s=>s==='A1'||s==='B1');
  const ramTxt=ram2.length===2&&badRam?'램이 A1/B1에 꽂혀 있어요. 2개를 쓸 때는 설명서 권장 슬롯인 A2·B2(CPU에서 2번째·4번째)에 꽂아야 듀얼 채널이 제대로 동작해요. 래치를 열고 옮겨 주세요.':
    '램 슬롯 A2·B2(CPU 쪽에서 2번째·4번째) 아래쪽 래치를 탭해서 연 다음, 램을 끌어 슬롯에 놓아 주세요. 램의 홈(노치)이 안 맞으면 매트 위에서 탭해 180° 돌리면 돼요.';
  st('ram','램 32GB 2개 장착 (A2·B2)',ram2.length===2&&!badRam,ramTxt,'램 2개를 서로 다른 채널(A·B)에 나눠 꽂아야 듀얼 채널로 속도(대역폭)가 두 배가 돼요.',['ram1','ram2','A2','B2','latchA2','latchB2']);
  st('m2','M.2 SSD 장착',!!S.inst.m2,'M.2 SSD를 끌어서 메인보드 가운데 M.2 슬롯에 놓아 주세요.','운영체제(윈도우)가 들어 있는 저장장치예요. PCIe 5.0 SSD는 CPU에 직접 연결된 이 슬롯에 꽂아야 최고 속도(약 14.9 GB/s)가 나와요.',['m2','m2slot']);
  st('psu','파워 장착',!!S.inst.psu,'파워서플라이를 끌어서 케이스 아래쪽 칸(파워 덮개 안)에 넣어 주세요.','파워는 콘센트의 교류 220 V를 컴퓨터가 쓰는 직류 12 V·5 V·3.3 V로 바꿔 줘요.',['psu','psubay']);
  st('mobo','메인보드를 케이스에 장착',!!S.inst.mobo,'메인보드를 통째로 끌어서 케이스 안 스탠드오프(나사 기둥) 위에 놓아 주세요. 후면 단자가 케이스 뒤쪽(왼쪽)을 향해야 해요.','스탠드오프가 메인보드를 케이스 철판에서 띄워 줘서 합선을 막아요.',['mobo','tray']);
  st('covers','확장 슬롯 덮개 떼기',!S.covers[0]&&!S.covers[1]||!!S.inst.gpu,'케이스 뒤판에서 그래픽카드 높이에 있는 확장 슬롯 덮개 1·2번을 탭해서 떼어 주세요.','그래픽카드는 2칸 두께라서 덮개 2개를 떼야 출력 단자가 밖으로 나와요.',['cover0','cover1']);
  st('gpu','그래픽카드 장착',!!S.inst.gpu,'그래픽카드를 끌어서 메인보드 맨 위 PCIe x16 슬롯에 놓아 주세요.','CPU와 가장 가까운 x16 슬롯이 CPU에 직접 연결된 16배속 슬롯이에요.',['gpu','pcie']);
  st('atx24','메인보드 24핀 전원',S.conn.c_atx24==='atx24','파워에서 나온 가장 두꺼운 24핀 커넥터를 메인보드 오른쪽 가장자리 24핀 단자에 꽂아 주세요.','메인보드 전체에 전기를 공급하는 주 전원이에요.',['c_atx24','atx24']);
  st('eps','CPU 8핀 전원 2개 (EPS)',epsN()===2,epsN()===1?'CPU 8핀이 하나만 꽂혀 있어요. 나머지 "CPU" 8핀 커넥터도 메인보드 왼쪽 위 남은 CPU 8핀 단자에 꽂아 주세요.':'"CPU"라고 적힌 8핀 커넥터 2개를 메인보드 왼쪽 위 CPU 8핀 단자 두 곳에 꽂아 주세요.','Ryzen 9 9950X3D2는 200 W급 CPU라서 8핀 두 개로 전기를 나눠 받아야 무거운 작업에서도 안정적이에요. 하나만 꽂아도 켜지긴 해요.',['c_eps8','c_eps8b','eps','eps2']);
  st('pcie','그래픽카드 12V-2x6 전원',S.conn.c_pcie8==='gpupwr','"16핀"이라고 적힌 12V-2x6 커넥터를 그래픽카드 위쪽 전원 단자에 딸깍 소리가 날 때까지 끝까지 꽂아 주세요.','RTX 5090은 최대 575 W를 써요. 커넥터가 덜 꽂히면 접촉 부분이 뜨거워져 녹을 수 있어서 끝까지 밀어 넣는 게 중요해요.',['c_pcie8','gpupwr']);
  st('sysfan','후면 팬 → SYS_FAN1',S.conn.c_sysfan==='sysfan',S.conn.c_sysfan==='cpufan'?'후면 팬이 CPU_FAN에 꽂혀 있어요. 메인보드 아래쪽 SYS_FAN1로 옮겨 주세요.':'케이스 뒤쪽 팬 케이블을 메인보드 아래쪽 SYS_FAN1 단자에 꽂아 주세요.','케이스 안의 뜨거운 공기를 밖으로 빼 줘요.',['c_sysfan','sysfan']);
  const FPW={c_pwrsw:['fpPWR','POWER SW','위 줄 오른쪽 (PWR PWR)'],c_rstsw:['fpRST','RESET SW','아래 줄 오른쪽 (RST RST)'],c_pled:['fpPLED','POWER LED','위 줄 왼쪽 (PLED+ PLED−)'],c_hdled:['fpHDLED','HDD LED','아래 줄 왼쪽 (HDD+ HDD−)']};
  const PNM={fpPWR:'위 줄 오른쪽',fpRST:'아래 줄 오른쪽',fpPLED:'위 줄 왼쪽',fpHDLED:'아래 줄 왼쪽'};
  let fpOk=true;const fpRows=[],fpTg=[];
  for(const c in FPW){
    const[want,nm,where]=FPW[c],at=S.conn[c];let st2,ok=false;
    if(!at)st2='아직 안 꽂았어요. 케이스 앞쪽에 늘어진 커넥터를 끌어 꽂아 주세요';
    else if(at!==want)st2=`자리가 틀렸어요 (지금 ${PNM[at]||at}). 끌어서 옮겨 주세요`;
    else if(CD[c].pol&&S.rot[c])st2='자리는 맞는데 +/− 방향이 반대예요. 커넥터를 한 번 탭하면 뒤집혀요';
    else{st2='완료';ok=true;}
    if(!ok){fpOk=false;fpTg.push(c);if(at!==want)fpTg.push(want);}
    fpRows.push(`<li class="${ok?'done':''}">${ok?'✓':'✗'} <b>${nm}</b> → ${where}<br><span style="font-weight:400">${st2}</span></li>`);
  }
  st('fp','전면 패널 커넥터 (F_PANEL)',fpOk,'케이스 앞쪽에서 나온 작은 커넥터 4개를 메인보드 오른쪽 아래 F_PANEL 핀에 꽂아 주세요. 커넥터 안에 이름(PWR, RST, PLED, HDD)이 적혀 있어요.<ol style="list-style:none;padding-left:0;font-size:13px;color:#d5dde6">'+fpRows.join('')+'</ol>LED 커넥터는 + 표시가 핀의 +쪽(왼쪽)에 와야 해요.<div class="pins">'+fpTxt+'</div>','스위치는 방향이 상관없지만, LED는 다이오드라서 한쪽으로만 전류가 흘러요. 화면을 크게 확대하면 핀 이름이 보여요.',fpTg.length?fpTg:['fpPWR']);
  st('usbaud','전면 USB 3.0·오디오',S.conn.c_usb3==='usb3'&&S.conn.c_audio==='audio','파란 USB 3.0 커넥터는 메인보드 오른쪽 USB3 헤더에, 오디오 커넥터는 메인보드 왼쪽 아래 HD_AUDIO에 꽂아 주세요.','안 꽂아도 부팅은 되지만, 케이스 앞쪽 USB 단자와 이어폰 단자가 동작하지 않아요.',['c_usb3','c_audio','usb3','audio']);
  st('panel','측면 패널 닫기',!!S.inst.panel,'매트 위 측면 패널(강화유리)을 끌어서 케이스 위에 놓아 주세요.','먼지를 막고, 케이스 팬이 만드는 공기 흐름이 제대로 생기게 해 줘요.',['panel']);
  st('hdmi','모니터 케이블 → 그래픽카드',S.conn.c_hdmi==='hdmiGpu',S.conn.c_hdmi==='hdmiMobo'?'모니터 케이블이 메인보드 HDMI에 꽂혀 있어요. Ryzen 9000은 내장 그래픽이 있어서 화면은 나오지만, RTX 5090 성능을 쓰려면 그래픽카드 쪽 단자에 꽂아야 해요.':'모니터에서 나온 HDMI 케이블 끝을 케이스 뒤쪽 그래픽카드 HDMI 단자에 꽂아 주세요.','화면 신호는 그래픽카드가 만들어요.',['c_hdmi','hdmiGpu']);
  st('ac','전원 케이블 꽂기',S.conn.c_ac==='acin','콘센트에서 나온 전원 케이블 끝을 케이스 뒤쪽 아래 파워 전원 단자에 꽂아 주세요.','작업을 다 끝낸 뒤 마지막에 꽂는 게 안전해요.',['c_ac','acin']);
  st('psusw','파워 스위치 켜기',!!S.psuSw,'파워 뒤쪽 스위치를 탭해서 I(켜짐)로 바꿔 주세요.','이 스위치가 O면 전원 버튼을 눌러도 안 켜져요.',['psusw']);
  st('power','전원 버튼 누르기',!!(run&&run.d.ok),'케이스 앞쪽 위 둥근 전원 버튼을 눌러 보세요. 디버그 LED와 모니터 화면을 확인해 보세요.','',['pwrbtn']);
  return L;
}
let hl=null;
function showHint(){
  const L=steps(),i=L.findIndex(s=>!s.done),card=document.getElementById('pcHintCard');
  let h='';
  const doneN=L.filter(s=>s.done).length;
  if(run&&!run.d.ok&&lastDiag&&!(run.d.overheat&&runPhase()<run.d.overheat)){
    h+=`<h3>부팅 결과</h3><h2>문제가 있어요</h2><p>${lastDiag.msg}</p><p class="why">전원 버튼을 다시 눌러 끄고, 아래 단계를 고친 다음 다시 켜 보세요.</p>`;
  }else if(!run&&lastDiag&&!lastDiag.ok){
    h+=`<h3>마지막으로 켜 본 결과</h3><p>${lastDiag.msg}</p>`;
  }
  if(i<0){
    h+=`<h3>${L.length}/${L.length} 완료</h3><h2>조립 완료!</h2><p>모든 단계를 마쳤어요. 컴퓨터가 정상적으로 부팅됐어요.</p>`;
  }else{
    const s=L[i];
    h+=`<h3>다음 할 일 · ${doneN}/${L.length} 완료</h3><h2>${i+1}. ${s.title}</h2><p>${s.text}</p>${s.why?`<p class="why">${s.why}</p>`:''}`;
    if(S.inst.panel&&!['panel','hdmi','ac','psusw','power'].includes(s.id))h+='<p class="why">⚠ 측면 패널이 닫혀 있어요. 패널을 끌어서 떼어야 안쪽 작업을 할 수 있어요.</p>';
    if(run&&!['power'].includes(s.id))h+='<p class="why">⚠ 전원이 켜져 있어요. 전원 버튼을 눌러 끈 다음 작업해 주세요.</p>';
  }
  h+=`<div class="bt">${i>=0?'<button class="pri" id="pcShow">화면에서 위치 보기</button>':''}<button id="pcHClose">닫기</button></div>`;
  h+='<ol>'+L.map((s,k)=>`<li class="${s.done?'done':k===i?'cur':''}">${s.done?'✓ ':''}${s.title}</li>`).join('')+'</ol>';
  card.innerHTML=h;
  document.getElementById('pcHint').classList.add('show');
  document.getElementById('pcHClose').onclick=hideHint;
  const b=document.getElementById('pcShow');
  if(b)b.onclick=()=>{hideHint();hl={ids:L[i].tg,t0:performance.now()};focusOn(L[i].tg);};
}
function hideHint(){document.getElementById('pcHint').classList.remove('show');}
function rectOf(id){
  if(PD[id])return partRect(id);
  if(CD[id]){const e=endPos(id);return{x:e.x-CD[id].w/2,y:e.y-CD[id].h/2,w:CD[id].w,h:CD[id].h};}
  const s=slots().find(x=>x.id===id);if(s)return s;
  const hh=headers().find(x=>x.id===id);if(hh)return hh;
  const ci=caseInter();for(const k of['psusw','pwrbtn','rstbtn'])if(ci[k].id===id)return ci[k];
  for(const c of ci.covers)if(c.id===id)return c;
  const m=moboInter().find(x=>x.id===id);if(m)return m;
  return null;
}
function focusOn(ids){
  const rs=ids.map(rectOf).filter(Boolean);if(!rs.length)return;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const r of rs){x0=Math.min(x0,r.x);y0=Math.min(y0,r.y);x1=Math.max(x1,r.x+r.w);y1=Math.max(y1,r.y+r.h);}
  const pad=60,bw=x1-x0+pad*2,bh=y1-y0+pad*2;
  const s=Math.max(Math.min(W/bw,H/bh,2.2),Math.min(W/WW,H/WH)*.98);
  cam.s=s;cam.x=W/2-(x0+x1)/2*s;cam.y=H/2-(y0+y1)/2*s;
  const m=20;
  if(WW*s>W)cam.x=Math.min(m,Math.max(W-WW*s-m,cam.x));else cam.x=(W-WW*s)/2;
  if(WH*s>H)cam.y=Math.min(m,Math.max(H-WH*s-m,cam.y));else cam.y=(H-WH*s)/2;
}

/* ================= 그리기 ================= */
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function F(px,w){return`${w||600} ${px}px -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`;}
function txt(s,x,y,px,col,al,w){ctx.font=F(px,w);ctx.fillStyle=col;ctx.textAlign=al||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y);}
function fanDraw(cx,cy,r,spin,col){
  ctx.save();ctx.translate(cx,cy);
  ctx.fillStyle='#14171c';ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
  ctx.rotate(spin);ctx.fillStyle=col||'#3a414c';
  for(let i=0;i<7;i++){ctx.rotate(Math.PI*2/7);ctx.beginPath();ctx.ellipse(r*.5,0,r*.42,r*.16,.5,0,7);ctx.fill();}
  ctx.fillStyle='#22262d';ctx.beginPath();ctx.arc(0,0,r*.25,0,7);ctx.fill();ctx.restore();
}
function drawMat(){
  ctx.fillStyle='#0b0f15';ctx.fillRect(-4000,-4000,WW+8000,WH+8000);
  ctx.fillStyle='#173a4a';rr(MO.x+4,MO.y+4,MATW-8,MATH-8,24);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;
  for(let x=40;x<MATW;x+=40){ctx.beginPath();ctx.moveTo(MO.x+x,MO.y+8);ctx.lineTo(MO.x+x,MO.y+MATH-8);ctx.stroke();}
  for(let y=40;y<MATH;y+=40){ctx.beginPath();ctx.moveTo(MO.x+8,MO.y+y);ctx.lineTo(MO.x+MATW-8,MO.y+y);ctx.stroke();}
  txt('정전기 방지 매트',MO.x+MATW-20,MO.y+MATH-20,16,'rgba(255,255,255,.18)','right',800);
}
function drawCaseBack(){
  const x=CO.x,y=CO.y;
  ctx.fillStyle='#1f242b';rr(x+20,y+30,740,800,18);ctx.fill();
  ctx.fillStyle='#14181d';rr(x+60,y+40,660,780,8);ctx.fill();
  // 메인보드 받침판(트레이)과 CPU 뒷면 구멍
  ctx.fillStyle='#181d23';rr(x+62,y+72,410,510,6);ctx.fill();
  ctx.fillStyle='#0b0e12';rr(x+150,y+120,150,150,10);ctx.fill();
  ctx.strokeStyle='#232931';ctx.lineWidth=2;rr(x+150,y+120,150,150,10);ctx.stroke();
  // 위쪽 통풍구
  ctx.fillStyle='#0b0e12';for(let k=0;k<22;k++)rr(x+110+k*24,y+48,14,14,3),ctx.fill();
  // 케이블 정리 구멍(고무 그로밋)
  for(const[gy,gh]of[[96,130],[262,150],[448,124]]){ctx.fillStyle='#07090b';rr(x+480,y+gy,28,gh,14);ctx.fill();ctx.strokeStyle='#2c323b';ctx.lineWidth=5;rr(x+480,y+gy,28,gh,14);ctx.stroke();ctx.strokeStyle='#14181d';ctx.lineWidth=1.5;for(let k=1;k<gh/12;k++){ctx.beginPath();ctx.moveTo(x+494,y+gy+k*12);ctx.lineTo(x+494,y+gy+k*12+5);ctx.stroke();}}
  // 케이블 타이 고리
  ctx.fillStyle='#3a414c';for(let k=0;k<6;k++){rr(x+530,y+110+k*85,10,6,2);ctx.fill();}
  // 앞쪽 흡기 팬 3개(옆에서 비스듬히 본 모습)
  const fsp=runPhase()!==null?runPhase()*14:0,hues=['#4ea8ff','#b16cff','#ff5ca8'];
  for(let i=0;i<3;i++){
    const fy=y+70+i*178;
    ctx.fillStyle='#1b1f25';rr(x+628,fy,82,172,12);ctx.fill();
    ctx.save();ctx.beginPath();ctx.ellipse(x+669,fy+86,30,78,0,0,7);ctx.fillStyle='#0b0d10';ctx.fill();ctx.clip();
    ctx.fillStyle='#2b3038';for(let k=0;k<7;k++){const yy=fy+10+((k*24+fsp*40)%156);ctx.beginPath();ctx.ellipse(x+669,yy,26,7,0,0,7);ctx.fill();}
    ctx.restore();
    ctx.strokeStyle=run?hues[i]:'#2e3540';ctx.lineWidth=run?4:3;ctx.beginPath();ctx.ellipse(x+669,fy+86,32,80,0,0,7);ctx.stroke();
    ctx.fillStyle='#22262d';ctx.beginPath();ctx.ellipse(x+669,fy+86,9,20,0,0,7);ctx.fill();
  }
  // 스탠드오프
  ctx.fillStyle='#b9a36a';for(const[a,b]of[[12,12],[195,12],[378,12],[12,250],[195,250],[378,250],[12,476],[195,476],[378,476]]){ctx.beginPath();ctx.arc(x+70+a,y+80+b,5,0,7);ctx.fill();}
  txt('케이스 (옆으로 눕혀 둔 상태)',x+390,y+20,13,'#6e7d91','center',700);
  txt('뒤쪽',x+40,y+20,12,'#6e7d91','center');txt('앞쪽',x+740,y+20,12,'#6e7d91','center');
  // 뒤판
  ctx.fillStyle='#2a3038';ctx.fillRect(x+20,y+40,40,780);
  ctx.fillStyle='#0d1014';ctx.fillRect(x+24,y+92,32,196);
  if(!S.inst.mobo)txt('I/O',x+40,y+190,10,'#555','center');
  // 확장 슬롯 덮개
  const ci=caseInter();
  for(let i=0;i<4;i++){const c=ci.covers[i];
    if(S.covers[i]&&!(S.inst.gpu&&i<2)){ctx.fillStyle='#8d949e';ctx.fillRect(c.x,c.y,c.w,c.h);ctx.fillStyle='#5f6670';for(let k=0;k<5;k++)ctx.fillRect(c.x+5+k*6,c.y+8,3,14);}
    else{ctx.fillStyle='#07090c';ctx.fillRect(c.x,c.y,c.w,c.h);}
  }
  // 후면 팬 (옆에서 본 모습)
  const sp=runPhase()!==null&&S.conn.c_sysfan?runPhase()*20:0;
  ctx.fillStyle='#262b33';ctx.fillRect(x+60,y+96,34,140);ctx.fillStyle='#3a414c';for(let k=0;k<7;k++){ctx.fillRect(x+64,y+102+((k*20+sp*30)%130),26,6);}
  txt('후면 팬',x+77,y+248,9,'#8b9bb0','center');
  // 파워 칸
  ctx.strokeStyle='#39424e';ctx.setLineDash([6,5]);ctx.lineWidth=2;ctx.strokeRect(x+70,y+625,240,138);ctx.setLineDash([]);
  if(!S.inst.psu)txt('파워 칸',x+190,y+695,14,'#55606e','center',700);
  // 뒤판 단자: AC 입력, 스위치
  ctx.fillStyle='#2a3038';
  // 앞면 패널 스트립
  ctx.fillStyle='#262c34';ctx.fillRect(x+720,y+40,40,780);
  const ledP=run&&S.conn.c_pled==='fpPLED'&&!S.rot.c_pled;
  const ph=runPhase();
  const ledH=run&&S.conn.c_hdled==='fpHDLED'&&!S.rot.c_hdled&&ph>1&&ph<7&&Math.floor(ph*7)%2;
  ctx.fillStyle='#0d0f12';ctx.beginPath();ctx.arc(x+740,y+84,14,0,7);ctx.fill();
  ctx.strokeStyle=ledP?'#5ad1ff':'#555c66';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+740,y+84,10,0,7);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+740,y+76);ctx.lineTo(x+740,y+84);ctx.stroke();
  ctx.fillStyle='#3a414c';rr(x+732,y+110,16,14,3);ctx.fill();
  ctx.fillStyle=ledH?'#ff5a5a':'#3a1d1d';ctx.beginPath();ctx.arc(x+740,y+140,3.5,0,7);ctx.fill();
  txt('전원',x+740,y+58,9,'#8b9bb0','center');txt('리셋',x+740,y+132,8,'#8b9bb0','center');
  ctx.fillStyle='#3a414c';for(let k=0;k<2;k++)ctx.fillRect(x+734,y+160+k*18,12,10);
  ctx.fillStyle='#1d3e7a';ctx.fillRect(x+736,y+162,8,6);ctx.fillRect(x+736,y+180,8,6);
  // 파워 덮개(슈라우드)
  ctx.fillStyle='rgba(38,44,52,.95)';ctx.fillRect(x+320,y+610,400,210);
  ctx.fillStyle='#0d1014';for(const gx of[370,470,570]){rr(x+gx,y+625,62,24,10);ctx.fill();}
  ctx.fillStyle='#1c2128';rr(x+566,y+664,146,146,6);ctx.fill();ctx.strokeStyle='#3a414c';ctx.lineWidth=2;rr(x+566,y+664,146,146,6);ctx.stroke();
  for(let k=0;k<2;k++){ctx.fillStyle='#2a3038';rr(x+576,y+676+k*62,126,48,4);ctx.fill();ctx.fillStyle='#14181d';ctx.fillRect(x+686,y+688+k*62,10,24);}
  txt('HDD 칸',x+639,y+654,9,'#55606e','center',700);
  ctx.fillStyle='#0d1014';for(let k=0;k<10;k++){rr(x+340+k*20,y+760,10,40,3);ctx.fill();}
  txt('AIRFLOW',x+445,y+712,22,'rgba(255,255,255,.07)','center',900);
  ctx.strokeStyle='#39424e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+60,y+610);ctx.lineTo(x+320,y+610);ctx.stroke();
}
function drawCaseRear(){
  const x=CO.x,y=CO.y;
  if(S.inst.psu){
    ctx.fillStyle='#111';ctx.fillRect(x+24,y+645,32,26);ctx.fillStyle='#777';for(let k=0;k<3;k++)ctx.fillRect(x+30+k*8,y+654,4,9);
    ctx.fillStyle='#111';ctx.fillRect(x+24,y+680,32,24);ctx.fillStyle=S.psuSw?'#d33':'#555';ctx.fillRect(x+28,y+(S.psuSw?682:692),24,10);
    txt(S.psuSw?'I':'O',x+40,y+(S.psuSw?687:697),9,'#fff','center',800);
  }
  if(S.inst.mobo){ctx.fillStyle='#ccc';ctx.fillRect(x+28,y+100,24,12);ctx.fillRect(x+28,y+118,24,12);ctx.fillStyle='#222';ctx.fillRect(x+26,y+190,28,14);txt('HDMI',x+40,y+210,7,'#9aa','center');
    ctx.fillStyle='#3a6';ctx.fillRect(x+30,y+240,8,8);ctx.fillStyle='#c33';ctx.fillRect(x+42,y+240,8,8);}
  if(S.inst.gpu){ctx.fillStyle='#a9b0b9';ctx.fillRect(x+22,y+376,36,62);ctx.fillStyle='#111';ctx.fillRect(x+26,y+384,28,14);txt('HDMI',x+40,y+404,7,'#333','center',700);ctx.fillStyle='#111';ctx.fillRect(x+28,y+412,24,10);ctx.fillRect(x+28,y+426,24,8);}
}
function drawMobo(r){
  const x=r.x,y=r.y;
  ctx.fillStyle='#1c2a22';rr(x,y,MB.w,MB.h,6);ctx.fill();
  ctx.strokeStyle='rgba(120,200,160,.08)';ctx.lineWidth=1;for(let k=0;k<14;k++){ctx.beginPath();ctx.moveTo(x+60+k*22,y+300);ctx.lineTo(x+120+k*18,y+440);ctx.stroke();}
  ctx.fillStyle='#b9a36a';for(const[a,b]of[[12,12],[195,12],[378,12],[12,250],[195,250],[378,250],[12,476],[195,476],[378,476]]){ctx.beginPath();ctx.arc(x+a,y+b,4,0,7);ctx.fill();ctx.fillStyle='#1c2a22';ctx.beginPath();ctx.arc(x+a,y+b,2,0,7);ctx.fill();ctx.fillStyle='#b9a36a';}
  // I/O 덮개·VRM
  ctx.fillStyle='#3a3f47';rr(x+2,y+20,52,200,5);ctx.fill();txt('I/O',x+28,y+120,11,'#8b9bb0','center',800);
  ctx.fillStyle='#454b55';rr(x+160,y+14,50,40,4);ctx.fill();rr(x+62,y+60,40,140,4);ctx.fill();
  ctx.strokeStyle='#2f343b';for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(x+166+k*11,y+18);ctx.lineTo(x+166+k*11,y+50);ctx.stroke();}
  // CPU 소켓
  ctx.fillStyle='#2b2f35';rr(x+110,y+70,80,92,4);ctx.fill();
  ctx.fillStyle='#4b4f55';ctx.fillRect(x+118,y+78,64,76);
  ctx.fillStyle='#6b5d3a';for(let i=0;i<10;i++)for(let j=0;j<12;j++)ctx.fillRect(x+122+i*6,y+82+j*6,2,2);
  ctx.fillStyle='#d4a63a';ctx.beginPath();ctx.moveTo(x+112,y+72);ctx.lineTo(x+124,y+72);ctx.lineTo(x+112,y+84);ctx.fill();
  // 레버
  const lo=S.lever==='open';
  ctx.strokeStyle='#c9ced6';ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();if(lo){ctx.moveTo(x+199,y+162);ctx.lineTo(x+226,y+66);}else{ctx.moveTo(x+199,y+162);ctx.lineTo(x+199,y+70);ctx.lineTo(x+192,y+70);}ctx.stroke();ctx.lineCap='butt';
  if(!lo){ctx.strokeStyle='#8d949e';ctx.lineWidth=2;ctx.strokeRect(x+112,y+72,76,88);}
  txt(lo?'레버 열림':'레버',x+206,y+176,9,'#8b9bb0','center');
  // 램 슬롯
  for(const s of RAMSLOTS){const sx=x+RAMX[s];ctx.fillStyle=s[1]==='2'?'#2c2f35':'#3d424b';ctx.fillRect(sx,y+40,12,224);ctx.fillStyle='#14171b';ctx.fillRect(sx+4,y+44,4,216);
    ctx.fillStyle='#d4a63a';ctx.fillRect(sx+3,y+40+224*.42,6,3);
    const op=S.latch[s];ctx.fillStyle=op?'#ffc247':'#9aa3ad';ctx.save();ctx.translate(sx+6,y+266);if(op)ctx.rotate(.5);ctx.fillRect(-6,-2,12,12);ctx.restore();
    txt(s,sx+6,y+32,9,s[1]==='2'?'#ffc247':'#8b9bb0','center',800);}
  // ATX24, EPS, 팬 헤더
  ctx.fillStyle='#e8e8e8';ctx.fillRect(x+340,y+150,22,110);ctx.fillStyle='#bbb';for(let k=0;k<12;k++){ctx.fillRect(x+343,y+154+k*9,6,6);ctx.fillRect(x+353,y+154+k*9,6,6);}
  txt('ATX 24핀',x+351,y+142,9,'#cfd6dd','center',700);
  for(const ex of[60,110]){ctx.fillStyle='#e8e8e8';ctx.fillRect(x+ex,y+10,46,18);ctx.fillStyle='#bbb';for(let k=0;k<4;k++){ctx.fillRect(x+ex+3+k*11,y+12,7,6);ctx.fillRect(x+ex+3+k*11,y+20,7,6);}}
  txt('CPU 8핀 ×2',x+108,y+4,8,'#cfd6dd','center',700);
  const hdr=(hx,hy,w,h,lab,col)=>{ctx.fillStyle=col||'#d9d9d9';ctx.fillRect(x+hx,y+hy,w,h);ctx.fillStyle='#d4a63a';const n=Math.max(2,Math.round(w/6));for(let k=0;k<n;k++)ctx.fillRect(x+hx+2+k*(w-4)/n,y+hy+h/2-1,2,2);if(lab)txt(lab,x+hx+w/2,y+hy-6,7.5,'#cfd6dd','center',700);};
  hdr(215,20,22,10,'CPU_FAN');hdr(250,470,22,10,'SYS_FAN1');
  ctx.fillStyle='#2f6fd6';ctx.fillRect(x+355,y+380,18,50);txt('USB3',x+364,y+372,8,'#cfd6dd','center',700);
  hdr(20,462,34,16,'HD_AUDIO','#3a3f47');
  // F_PANEL
  ctx.fillStyle='#2a2e34';ctx.fillRect(x+276,y+448,68,34);
  ctx.fillStyle='#d4a63a';for(let r2=0;r2<2;r2++)for(let k=0;k<5;k++){if(r2===1&&k===4)continue;ctx.fillRect(x+283+k*14,y+456+r2*14,3,3);}
  txt('F_PANEL',x+310,y+436,8,'#cfd6dd','center',700);
  if(cam.s>1.2){const lb=[['PLED+',0,0],['PLED−',1,0],['PWR',2,0],['PWR',3,0],['HD+',0,1],['HD−',1,1],['RST',2,1],['RST',3,1]];for(const[t,k,r2]of lb)txt(t,x+284+k*14,y+(r2?487:444),4.4,'#ffd27a','center',700);}
  // M.2
  ctx.fillStyle='#3a3f47';ctx.fillRect(x+60,y+252,14,30);ctx.fillStyle='#b9a36a';ctx.beginPath();ctx.arc(x+200,y+267,4,0,7);ctx.fill();
  txt('M.2',x+136,y+244,9,'#cfd6dd','center',700);
  // PCIe
  ctx.fillStyle='#3d424b';ctx.fillRect(x+40,y+300,180,14);ctx.fillStyle='#14171b';ctx.fillRect(x+44,y+305,172,4);ctx.fillStyle='#9aa3ad';ctx.fillRect(x+221,y+300,10,14);
  txt('PCIe x16',x+130,y+292,9,'#cfd6dd','center',700);
  ctx.fillStyle='#3d424b';ctx.fillRect(x+40,y+380,70,12);ctx.fillRect(x+40,y+430,180,14);
  // 칩셋
  ctx.fillStyle='#454b55';rr(x+250,y+330,72,72,6);ctx.fill();txt('칩셋',x+286,y+366,10,'#8b9bb0','center',700);
  // 디버그 LED
  const ls=ledState();
  ['CPU','DRAM','VGA','BOOT'].forEach((n,k)=>{ctx.fillStyle=ls===n?'#ff3b30':'#3a1d1d';ctx.beginPath();ctx.arc(x+350,y+284+k*14,4,0,7);ctx.fill();txt(n,x+358,y+284+k*14,7,ls===n?'#ffb3ad':'#6e7d91','left',700);});
  txt('CROSSHAIR X870E HERO',x+180,y+468,9,'rgba(255,255,255,.28)','center',800);
}
function drawCPU(r,rot){
  ctx.save();ctx.translate(r.x+r.w/2,r.y+r.h/2);ctx.rotate(rot*Math.PI/2);
  const w=60,h=72;ctx.fillStyle='#1d5c35';ctx.fillRect(-w/2,-h/2,w,h);
  ctx.fillStyle='#c8ccd2';rr(-w/2+7,-h/2+8,w-14,h-16,4);ctx.fill();
  txt('AMD',0,-14,8,'#555','center',900);txt('RYZEN 9',0,-2,7,'#444','center',800);txt('9950X3D2',0,9,6.4,'#444','center',800);
  ctx.fillStyle='#d4a63a';ctx.beginPath();ctx.moveTo(-w/2+1,-h/2+1);ctx.lineTo(-w/2+11,-h/2+1);ctx.lineTo(-w/2+1,-h/2+11);ctx.fill();
  ctx.restore();
  if(S.paste&&partRect('cpu').inst&&!S.inst.cooler){ctx.fillStyle='#c9ccd1';ctx.beginPath();ctx.ellipse(r.x+30,r.y+36,8,7,0,0,7);ctx.fill();}
}
function drawCooler(r){
  const x=r.x,y=r.y,sp=run&&S.conn.c_cpufan?runPhase()*25:0;
  ctx.fillStyle='rgba(0,0,0,.35)';rr(x+6,y+6,170,160,8);ctx.fill();
  ctx.fillStyle='#b6bcc4';rr(x,y,130,160,6);ctx.fill();
  ctx.strokeStyle='#8d949e';ctx.lineWidth=1.5;for(let k=0;k<20;k++){ctx.beginPath();ctx.moveTo(x+4+k*6.3,y+6);ctx.lineTo(x+4+k*6.3,y+154);ctx.stroke();}
  ctx.fillStyle='#c4762f';for(let k=0;k<4;k++)ctx.fillRect(x+20+k*26,y-4,8,12);
  ctx.fillStyle='#202429';rr(x+128,y+4,40,152,6);ctx.fill();
  ctx.fillStyle='#3a414c';for(let k=0;k<9;k++)ctx.fillRect(x+132,y+12+((k*17+sp*20)%140),32,6);
  txt('CPU 쿨러',x+65,y+72,13,'#2b2f35','center',800);txt('NH-D15 G2',x+65,y+90,9,'#3a3f47','center',800);
}
function drawRAM(r,id,inst){
  if(inst){ctx.fillStyle='#22262d';ctx.fillRect(r.x-2,r.y-4,16,232);ctx.fillStyle='#c33b3b';ctx.fillRect(r.x,r.y-2,12,228);ctx.fillStyle='#e35d5d';ctx.fillRect(r.x+3,r.y,3,224);return;}
  const rot=S.rot[id];
  ctx.save();ctx.translate(r.x+r.w/2,r.y+r.h/2);if(rot)ctx.rotate(Math.PI);
  const w=213,h=44;ctx.fillStyle='#1d4d2c';ctx.fillRect(-w/2,-h/2,w,h);
  ctx.fillStyle='#c33b3b';rr(-w/2+4,-h/2+2,w-8,h-14,3);ctx.fill();txt('DDR5-6000 32GB',0,-h/2+16,11,'#fff','center',800);
  ctx.fillStyle='#d4a63a';for(let k=0;k<44;k++)ctx.fillRect(-w/2+6+k*4.6,h/2-9,3,8);
  ctx.fillStyle='#173a4a';ctx.fillRect(-w/2+w*.42-3,h/2-10,6,10);
  ctx.restore();
}
function drawM2(r){ctx.fillStyle='#1d4d2c';ctx.fillRect(r.x,r.y,128,35);ctx.fillStyle='#d4a63a';ctx.fillRect(r.x,r.y+4,6,27);ctx.fillStyle='#22262d';ctx.fillRect(r.x+14,r.y+5,46,25);ctx.fillRect(r.x+66,r.y+5,46,25);txt('SN8100 4TB',r.x+64,r.y+17,9,'#cfd6dd','center',800);}
function drawGPU(r,inst){
  const pw=run&&S.conn.c_pcie8==='gpupwr'&&!(run.d&&run.d.led),sp=pw?runPhase()*18:0;
  if(inst){
    ctx.fillStyle='#a9b0b9';ctx.fillRect(r.x,r.y-10,10,80);
    ctx.fillStyle='#22262d';rr(r.x+10,r.y,520,64,6);ctx.fill();
    ctx.fillStyle='#14171b';ctx.fillRect(r.x+10,r.y+56,520,8);
    ctx.fillStyle=pw?'#76b900':'#3c5a12';ctx.fillRect(r.x+60,r.y+28,380,4);
    txt('GEFORCE RTX 5090',r.x+250,r.y+16,12,'#cfd6dd','center',800);
    ctx.fillStyle='#d4a63a';ctx.fillRect(r.x+92,r.y-4,180,6);
    ctx.fillStyle='#e8e8e8';ctx.fillRect(r.x+372,r.y-16,56,16);ctx.fillStyle='#bbb';for(let k=0;k<6;k++){ctx.fillRect(r.x+376+k*8.6,r.y-14,5,5);ctx.fillRect(r.x+376+k*8.6,r.y-8,5,5);}
    txt('12V-2x6',r.x+400,r.y-24,8,'#cfd6dd','center',700);
    return;
  }
  ctx.fillStyle='#a9b0b9';ctx.fillRect(r.x,r.y,12,r.h);
  ctx.fillStyle='#22262d';rr(r.x+12,r.y,468,r.h-14,10);ctx.fill();
  ctx.fillStyle='#d4a63a';ctx.fillRect(r.x+70,r.y+r.h-14,180,10);
  fanDraw(r.x+140,r.y+88,62,sp);fanDraw(r.x+340,r.y+88,62,sp);
  txt('GEFORCE RTX 5090',r.x+240,r.y+18,12,'#cfd6dd','center',800);
}
function drawPSU(r){
  ctx.fillStyle='#1a1c20';rr(r.x,r.y,240,138,6);ctx.fill();
  ctx.strokeStyle='#33373e';ctx.lineWidth=1;for(let k=0;k<6;k++){ctx.beginPath();ctx.arc(r.x+90,r.y+69,12+k*9,0,7);ctx.stroke();}
  txt('1600W',r.x+190,r.y+50,17,'#e6edf3','center',900);txt('80+ TITANIUM',r.x+190,r.y+72,9,'#cfd6dd','center',800);txt('ATX 3.1',r.x+190,r.y+88,8,'#8b9bb0','center',700);
  ctx.fillStyle='#000';ctx.fillRect(r.x+234,r.y+28,10,80);
}
function drawPaste(r){ctx.fillStyle='#c9ccd1';rr(r.x,r.y,80,26,6);ctx.fill();ctx.fillStyle='#8d949e';ctx.fillRect(r.x+80,r.y+8,20,10);txt('써멀 그리스',r.x+40,r.y+13,10,'#333','center',800);}
function drawPanel(r,inst){
  if(inst){ctx.fillStyle='rgba(120,150,180,.13)';rr(r.x,r.y,r.w,r.h,18);ctx.fill();ctx.strokeStyle='rgba(200,220,240,.35)';ctx.lineWidth=4;ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=30;ctx.beginPath();ctx.moveTo(r.x+120,r.y+r.h);ctx.lineTo(r.x+520,r.y);ctx.stroke();
    ctx.fillStyle='#8d949e';for(const[a,b]of[[30,30],[r.w-30,30],[30,r.h-30],[r.w-30,r.h-30]]){ctx.beginPath();ctx.arc(r.x+a,r.y+b,9,0,7);ctx.fill();}
    txt('측면 패널(강화유리) — 끌면 떼어져요',r.x+r.w/2,r.y+r.h-50,13,'rgba(220,235,250,.5)','center',700);return;}
  ctx.fillStyle='rgba(120,150,180,.18)';rr(r.x,r.y,r.w,r.h,10);ctx.fill();ctx.strokeStyle='rgba(200,220,240,.45)';ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(r.x+40,r.y+r.h);ctx.lineTo(r.x+200,r.y);ctx.stroke();
  txt('측면 패널',r.x+r.w/2,r.y+r.h/2-10,15,'rgba(230,240,250,.75)','center',800);txt('(강화유리)',r.x+r.w/2,r.y+r.h/2+12,11,'rgba(230,240,250,.6)','center',600);
}
function drawPart(id){
  const r=partRect(id);
  switch(id){
    case'mobo':drawMobo(r);break;case'cpu':drawCPU(r,r.inst?0:S.rot.cpu);break;case'cooler':drawCooler(r);break;
    case'ram1':case'ram2':drawRAM(r,id,r.inst);break;case'm2':drawM2(r);break;case'gpu':drawGPU(r,r.inst);break;
    case'psu':drawPSU(r);break;case'paste':drawPaste(r);break;case'panel':drawPanel(r,r.inst);break;
  }
}
function drawFixed(){
  // 모니터
  const x=MO.x+20,y=MO.y+780;
  ctx.fillStyle='#22262d';ctx.fillRect(x+150,y+240,60,30);ctx.fillRect(x+110,y+268,140,10);
  ctx.fillStyle='#111';rr(x,y,360,244,10);ctx.fill();
  ctx.fillStyle='#000';ctx.fillRect(x+10,y+10,340,214);
  drawScreen(x+10,y+10,340,214);
  txt('모니터',x+180,y+236,9,'#6e7d91','center');
  // 콘센트
  const ox=MO.x+420,oy=MO.y+1070;ctx.fillStyle='#e9e4da';rr(ox,oy,50,50,6);ctx.fill();ctx.fillStyle='#555';ctx.beginPath();ctx.arc(ox+17,oy+25,4,0,7);ctx.arc(ox+33,oy+25,4,0,7);ctx.fill();
  txt('콘센트',ox+25,oy-8,9,'#8b9bb0','center');
}
function drawScreen(x,y,w,h){
  const viaGpu=S.conn.c_hdmi==='hdmiGpu'&&S.inst.gpu,viaIgpu=S.conn.c_hdmi==='hdmiMobo';
  const on=run&&(viaGpu||viaIgpu),t=runPhase();
  if(!run){return;}
  if(!on){if(t>1.2){txt(S.conn.c_hdmi?'신호 없음':'케이블 연결 안 됨',x+w/2,y+h/2,14,'#6b7280','center',700);}return;}
  const d=run.d;
  if(d.led){if(t>1.5)txt('신호 없음',x+w/2,y+h/2,14,'#6b7280','center',700);return;}
  if(t<2.4)return;
  if(d.fanerr){ctx.fillStyle='#000';ctx.fillRect(x,y,w,h);txt('CPU Fan Error!',x+14,y+30,13,'#ddd','left',700);txt('Press F1 to Run SETUP',x+14,y+52,12,'#bbb','left',600);return;}
  if(d.noboot){txt('Reboot and Select proper Boot device',x+12,y+30,11,'#ddd','left',600);txt('or Insert Boot Media in selected Boot device',x+12,y+48,11,'#ddd','left',600);return;}
  if(d.overheat&&!d.os){txt('POST…',x+w/2,y+h/2,14,'#ccc','center',700);txt(`CPU ${Math.min(105,40+(t-2.4)*55).toFixed(0)}°C`,x+w-12,y+16,11,'#ff6b6b','right',800);return;}
  if(t<4.2){txt('X870E BIOS',x+w/2,y+h/2-8,18,'#fff','center',900);txt('Press DEL to enter SETUP',x+w/2,y+h/2+16,10,'#aaa','center',600);return;}
  if(t<6){const a=(t*6)%(Math.PI*2);ctx.strokeStyle='#4ea8ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+w/2,y+h/2+20,12,a,a+4);ctx.stroke();txt('Windows 시작 중',x+w/2,y+h/2-14,13,'#fff','center',700);return;}
  const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#0f4c81');g.addColorStop(1,'#3a7bd5');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(x,y+h-18,w,18);
  if(d.ok&&viaGpu){txt('조립 완료!',x+w/2,y+h/2-22,22,'#fff','center',900);txt('Ryzen 9 9950X3D2 · RTX 5090 · 64GB',x+w/2,y+h/2+6,11,'#e6f0ff','center',700);txt('정상적으로 부팅됐어요',x+w/2,y+h/2+24,11,'#e6f0ff','center',600);}
  else if(d.ok||d.igpuOnly){txt('내장 그래픽으로 출력 중',x+w/2,y+h/2-14,16,'#fff','center',900);txt(d.igpuOnly?'그래픽카드가 없어요':'RTX 5090을 쓰려면 그래픽카드 단자에 꽂으세요',x+w/2,y+h/2+12,11,'#ffe28a','center',700);}
  else txt(`CPU 온도 ${Math.min(100,55+(t-6)*12).toFixed(0)} °C`,x+w/2,y+h/2,16,t>8?'#ff6b6b':'#fff','center',800);
}
function cableOf(c){
  const a=anchorPos(c),e=endPos(c),d=CD[c];
  if(held&&held.k==='conn'&&held.id===c){e.x=held.p.x;e.y=held.p.y;}
  const dx=e.x-a.x,dy=e.y-a.y;
  ctx.strokeStyle=d.t==='usb3'?'#1d3f7a':d.t==='fp2'?['#e33','#3a3','#ddd','#33c'][['c_pwrsw','c_rstsw','c_pled','c_hdled'].indexOf(c)]||'#888':'#111';
  ctx.lineWidth=d.thick||2.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+dx*.25,a.y+dy*.05+60,e.x-dx*.25,e.y-dy*.05+60,e.x,e.y);ctx.stroke();
  if(d.t==='atx24'||d.t==='eps8'||d.t==='pcie8'){ctx.strokeStyle='rgba(255,210,80,.25)';ctx.lineWidth=1;ctx.stroke();}
  ctx.lineCap='butt';
  // 커넥터
  ctx.save();ctx.translate(e.x,e.y);
  const w=d.w,h=d.h;ctx.fillStyle=d.col;rr(-w/2,-h/2,w,h,2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;ctx.stroke();
  if(d.lab&&d.t!=='fp2')txt(d.lab,0,0,7,'#ffd27a','center',800);
  if(d.t==='fp2'){
    txt(d.sh,0,.3,5.6,'#fff','center',900);
    if(d.pol){const fl=S.rot[c];txt('+',fl?w/2-3.5:-w/2+3.5,0,7,'#ff8a80','center',900);txt('−',fl?-w/2+3.5:w/2-3.5,0,7,'#8ec5ff','center',900);}
    if(!S.conn[c]&&cam.s>.9)txt(d.lab,0,-h/2-6,6.5,'#fff','center',800);
  }
  if(d.t==='atx24'){ctx.fillStyle='#555';for(let k=0;k<12;k++){ctx.fillRect(-7,-h/2+4+k*4.3,5,3);ctx.fillRect(2,-h/2+4+k*4.3,5,3);}}
  ctx.restore();
}
function glow(r,col){ctx.strokeStyle=col;ctx.lineWidth=3/cam.s+1;ctx.setLineDash([8,6]);ctx.strokeRect(r.x-4,r.y-4,r.w+8,r.h+8);ctx.setLineDash([]);}
function draw(){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0b0f15';ctx.fillRect(0,0,W,H);
  ctx.setTransform(dpr*cam.s,0,0,dpr*cam.s,dpr*cam.x,dpr*cam.y);
  drawMat();drawCaseBack();
  if(S.inst.psu)drawPart('psu');
  const m=partRect('mobo');
  const heldId=held&&held.k==='part'?held.id:null;
  if(m.inst&&heldId!=='mobo'){drawPart('mobo');for(const id of['m2','cpu','ram1','ram2','cooler','gpu'])if(partRect(id).inst)drawPart(id);}
  drawCaseRear();
  drawFixed();
  for(const id of S.order){
    if(id===heldId)continue;const r=partRect(id);
    if(id==='mobo'){if(r.inst)continue;drawPart('mobo');for(const c of['m2','cpu','ram1','ram2','cooler'])if(partRect(c).inst)drawPart(c);continue;}
    if(r.inst)continue;drawPart(id);
  }
  // 케이블
  for(const c of CIDS)if(!(held&&held.k==='conn'&&held.id===c))cableOf(c);
  if(S.inst.panel&&heldId!=='panel')drawPart('panel');
  // 드래그 중 표시
  if(held){
    if(held.k==='part'){
      const t=ptype(held.id);
      for(const s of slots())if(s.acc===t&&!(t==='panel'))glow(s,canInstall(held.id,s)?'rgba(255,120,110,.5)':'rgba(126,231,135,.8)');
      if(held.id==='paste'){const sk=slots()[0];glow(sk,S.inst.cpu&&!S.inst.cooler?'rgba(126,231,135,.8)':'rgba(255,120,110,.5)');}
      const s=held.id!=='paste'&&slotAt(held.id,held.p);
      ctx.globalAlpha=.85;
      const save=S.loose[held.id];S.loose[held.id]={x:held.p.x-held.off.x-MO.x,y:held.p.y-held.off.y-MO.y};
      if(s&&!canInstall(held.id,s)){S.inst[held.id]=s.id;ctx.globalAlpha=.6;drawPart(held.id);S.inst[held.id]=null;ctx.globalAlpha=.4;}
      if(held.id==='mobo'){drawPart('mobo');for(const c of['m2','cpu','ram1','ram2','cooler'])if(partRect(c).inst)drawPart(c);}
      else drawPart(held.id);
      S.loose[held.id]=save;ctx.globalAlpha=1;
    }else{
      const t=CD[held.id].t;
      for(const h of headers())if(h.t===t)glow(h,CIDS.some(c=>S.conn[c]===h.id)?'rgba(255,120,110,.5)':'rgba(126,231,135,.9)');
      cableOf(held.id);
      txt(CD[held.id].nm,held.p.x,held.p.y-30/cam.s,12/cam.s,'#fff','center',800);
    }
  }
  // 힌트 강조
  if(hl){const t=(performance.now()-hl.t0)/1000;if(t>6)hl=null;else{const a=.5+.5*Math.sin(t*6);for(const id of hl.ids){const r=rectOf(id);if(!r)continue;const pd=5/cam.s;ctx.strokeStyle=`rgba(255,194,71,${.45+.55*a})`;ctx.lineWidth=2.5/cam.s;rr(r.x-pd,r.y-pd,r.w+2*pd,r.h+2*pd,4/cam.s);ctx.stroke();}}}
  // 과열 종료
  if(run&&run.d.overheat&&runPhase()>run.d.overheat){run=null;toast('CPU 과열로 전원이 꺼졌어요. ? 버튼에서 원인을 확인해 보세요','bad',5000);}
}
function loop(){if(!open)return;draw();requestAnimationFrame(loop);}

/* ================= 공개 ================= */
function openPC(){
  if(!root){build();loadLocal();}
  open=true;root.classList.add('show');resize();fit();setCloud(cloudState);loadCloud();
  if(location.hash!=='#pc')try{history.replaceState(null,'','#pc');}catch(e){}
  if(!S.savedAt)setTimeout(()=>toast('왼쪽 위 ? 버튼을 누르면 다음에 할 일을 알려 줘요',null,5000),400);
  requestAnimationFrame(loop);
}
function close(){open=false;if(root)root.classList.remove('show');if(location.hash==='#pc')try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}}
window.PCMode={open:openPC,close,isOpen:()=>open};
window.__pc={get S(){return S},off(){run=null;},partRect,slots,headers,endPos,caseInter,moboInter,toS:(x,y)=>({x:x*cam.s+cam.x,y:y*cam.s+cam.y}),steps,diagnose,get run(){return run},fit,get cam(){return cam}};
if(location.hash==='#pc')setTimeout(openPC,0);
})();
