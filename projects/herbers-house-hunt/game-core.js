'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayEyebrow = document.getElementById('overlayEyebrow');
const overlayTitle = document.getElementById('overlayTitle');
const overlayCopy = document.getElementById('overlayCopy');
const overlayButton = document.getElementById('overlayButton');
const controlsRow = document.getElementById('controlsRow');
const resultLine = document.getElementById('resultLine');
const resultScore = document.getElementById('resultScore');
const resultFlies = document.getElementById('resultFlies');
const resultTreats = document.getElementById('resultTreats');
const resultRank = document.getElementById('resultRank');
const scoreValue = document.getElementById('scoreValue');
const comboChip = document.getElementById('comboChip');
const comboValue = document.getElementById('comboValue');
const hearts = document.getElementById('hearts');
const timeValue = document.getElementById('timeValue');
const treatValue = document.getElementById('treatValue');
const pageBest = document.getElementById('pageBest');
const dangerBanner = document.getElementById('dangerBanner');
const liveMessage = document.getElementById('liveMessage');
const soundButton = document.getElementById('soundButton');
const pauseButton = document.getElementById('pauseButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const gameCard = document.getElementById('gameCard');
const joystick = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystickKnob');
const pounceButton = document.getElementById('pounceButton');
const jumpButton = document.getElementById('jumpButton');
const leagueRows = document.getElementById('leagueRows');
const leagueEmpty = document.getElementById('leagueEmpty');

const VIEW_W = 1200;
const VIEW_H = 720;
const TILE_W = 72;
const TILE_H = 36;
const ORIGIN_X = 600;
const ORIGIN_Y = 82;
const COLS = 16;
const ROWS = 12;
const ROUND_SECONDS = 60;
const MAX_LIVES = 3;
const LEAGUE_KEY = 'herbert-house-hunt-league-v2';
const OLD_BEST_KEY = 'herber-house-hunt-best-v1';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const palettes = {
  sofa:{top:'#527f83',x:'#365f65',y:'#2c5056',line:'#24464b'},
  wood:{top:'#c99458',x:'#9c673c',y:'#825330',line:'#6d4529'},
  darkWood:{top:'#795640',x:'#5f4131',y:'#493225',line:'#3b281f'},
  kitchen:{top:'#d8d8cc',x:'#a8aaa2',y:'#8e918a',line:'#74776f'},
  shelf:{top:'#916b4c',x:'#735038',y:'#5e402e',line:'#493123'},
  tower:{top:'#d3a86e',x:'#a67842',y:'#865d32',line:'#6f4c2b'},
  bedroom:{top:'#c9aa91',x:'#9e806c',y:'#876b5b',line:'#705748'},
  bathroom:{top:'#cfdadc',x:'#9eafb2',y:'#87999d',line:'#6f8185'},
  wall:{top:'#f3eadc',x:'#c8baa6',y:'#b9aa96',line:'#988a79'}
};

const wallRects = [
  {id:'mainHallNorth',x:9.92,y:0,w:.16,h:4.15,height:66},
  {id:'mainHallSouth',x:9.92,y:5.48,w:.16,h:6.52,height:66},
  {id:'hallEastNorth',x:11.92,y:0,w:.16,h:2.20,height:66},
  {id:'hallEastMiddle',x:11.92,y:3.75,w:.16,h:4.35,height:66},
  {id:'hallEastSouth',x:11.92,y:9.46,w:.16,h:2.54,height:66},
  {id:'bedBathWall',x:12,y:5.92,w:4,h:.16,height:66}
];

const obstacles = [
  {id:'sofa',type:'sofa',x:.95,y:.95,w:3.25,h:1.02,height:35,palette:palettes.sofa,climbable:true},
  {id:'coffee',type:'table',x:1.75,y:2.70,w:1.95,h:1.05,height:21,palette:palettes.wood,climbable:true},
  {id:'shelf',type:'shelf',x:.30,y:4.25,w:.72,h:2.35,height:72,palette:palettes.shelf},
  {id:'catTower',type:'tower',x:4.72,y:.55,w:.82,h:.82,height:69,palette:palettes.tower,climbable:true},
  {id:'dining',type:'dining',x:6.45,y:1.15,w:2.28,h:1.90,height:33,palette:palettes.darkWood,climbable:true},
  {id:'island',type:'island',x:6.30,y:7.22,w:2.92,h:1.12,height:47,palette:palettes.kitchen,climbable:true},
  {id:'cabinet',type:'cabinet',x:8.92,y:8.55,w:.72,h:2.52,height:66,palette:palettes.kitchen},
  {id:'plant',type:'plant',x:.72,y:10.18,w:.72,h:.72,height:55,palette:palettes.wood},
  {id:'hallConsole',type:'console',x:10.18,y:6.12,w:.48,h:1.34,height:34,palette:palettes.wood,climbable:true},
  {id:'bed',type:'bed',x:12.82,y:.48,w:2.40,h:2.18,height:29,palette:palettes.bedroom,climbable:true},
  {id:'nightstand',type:'table',x:13.62,y:3.52,w:.70,h:.70,height:25,palette:palettes.wood,climbable:true},
  {id:'wardrobe',type:'wardrobe',x:15.02,y:3.58,w:.64,h:1.76,height:74,palette:palettes.bedroom},
  {id:'bath',type:'bath',x:12.82,y:6.58,w:2.28,h:1.38,height:35,palette:palettes.bathroom,climbable:true},
  {id:'vanity',type:'vanity',x:15.02,y:6.62,w:.64,h:1.86,height:47,palette:palettes.bathroom,climbable:true},
  {id:'toilet',type:'toilet',x:13.42,y:9.25,w:.75,h:.92,height:39,palette:palettes.bathroom},
  {id:'laundry',type:'cabinet',x:15.02,y:9.55,w:.66,h:1.72,height:58,palette:palettes.bathroom}
];

const vacuumEntrances = [
  {x:1.90,y:11.20},
  {x:8.15,y:11.25},
  {x:10.86,y:.62},
  {x:14.40,y:5.35},
  {x:14.50,y:11.20}
];

const treatSeeds = [
  {x:1.45,y:7.45},{x:3.90,y:4.65},{x:5.35,y:9.70},{x:7.85,y:4.72},
  {x:10.82,y:2.72},{x:10.82,y:8.62},{x:13.62,y:4.45},{x:14.52,y:10.55}
];

const keys = new Set();
let touchVector = {x:0,y:0};
let joystickPointer = null;
let audioContext = null;
let soundOn = true;
let state = 'menu';
let overlayAction = 'start';
let lastFrame = performance.now();
let elapsed = 0;
let score = 0;
let fliesCaught = 0;
let treatsFound = 0;
let lives = MAX_LIVES;
let timeLeft = ROUND_SECONDS;
let combo = 0;
let comboTimer = 0;
let shake = 0;
let messageTimer = 0;
let entitiesReady = false;
let runSaved = false;
let currentRank = null;
let league = loadLeague();
let bestScore = league.length ? league[0].score : 0;

const cat = {
  x:2.10,y:9.25,radius:.28,
  facing:{x:1,y:-1},
  vx:0,vy:0,
  pounceTimer:0,pounceCooldown:0,pounceDir:{x:1,y:-1},
  jumpTimer:0,jumpDuration:.62,jumpCooldown:0,jumpDir:{x:1,y:-1},
  jumpStartZ:0,jumpHeight:0,surfaceId:null,
  invulnerable:0,walkPhase:0
};

const vacuum = {
  active:false,x:10.86,y:.62,radius:.38,
  facing:{x:-1,y:1},
  state:'hidden',stateTimer:0,spawnTimer:4,
  path:[],pathTimer:0,spin:0,stuckTimer:0,
  lastX:10.86,lastY:.62,retreatTarget:null
};

let flies = [];
let treats = [];
let particles = [];
let floaters = [];
let herbertSprites = null;

function sanitizeLeagueEntry(entry){
  const scoreValue = Math.max(0,Number.parseInt(entry?.score,10)||0);
  return {
    id:String(entry?.id||`${Date.now()}-${Math.random()}`),
    score:scoreValue,
    flies:Math.max(0,Number.parseInt(entry?.flies,10)||0),
    treats:Math.max(0,Number.parseInt(entry?.treats,10)||0),
    at:String(entry?.at||new Date().toISOString())
  };
}

function loadLeague(){
  let entries=[];
  try{
    const parsed=JSON.parse(localStorage.getItem(LEAGUE_KEY)||'[]');
    if(Array.isArray(parsed))entries=parsed.map(sanitizeLeagueEntry).filter(entry=>entry.score>0);
  }catch{}
  if(entries.length===0){
    try{
      const oldBest=Math.max(0,Number.parseInt(localStorage.getItem(OLD_BEST_KEY)||'0',10)||0);
      if(oldBest>0)entries.push({id:'legacy-best',score:oldBest,flies:0,treats:0,at:new Date().toISOString()});
    }catch{}
  }
  return entries.sort((a,b)=>b.score-a.score).slice(0,10);
}

function saveLeague(){
  try{localStorage.setItem(LEAGUE_KEY,JSON.stringify(league))}catch{}
}

function recordLeagueScore(){
  if(runSaved)return currentRank;
  const entry={id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,score,flies:fliesCaught,treats:treatsFound,at:new Date().toISOString()};
  league=[...league,entry].sort((a,b)=>b.score-a.score||String(a.at).localeCompare(String(b.at))).slice(0,10);
  currentRank=league.findIndex(item=>item.id===entry.id)+1;
  if(currentRank===0)currentRank=null;
  runSaved=true;
  bestScore=league.length?league[0].score:0;
  saveLeague();
  renderLeague();
  return currentRank;
}

function formatLeagueDate(value){
  try{return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(new Date(value))}catch{return '—'}
}

function renderLeague(){
  if(!leagueRows)return;
  leagueRows.textContent='';
  leagueEmpty.hidden=league.length>0;
  league.forEach((entry,index)=>{
    const row=document.createElement('tr');
    if(index===0)row.className='league-leader';
    row.innerHTML=`<td><span class="rank-badge">${index+1}</span></td><td><strong>${entry.score.toLocaleString()}</strong></td><td>${entry.flies}</td><td>${entry.treats}</td><td>${formatLeagueDate(entry.at)}</td>`;
    leagueRows.appendChild(row);
  });
  pageBest.textContent=bestScore.toLocaleString();
}

function iso(x,y,z=0){
  return {x:ORIGIN_X+(x-y)*TILE_W/2,y:ORIGIN_Y+(x+y)*TILE_H/2-z};
}

function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function lerp(a,b,t){return a+(b-a)*t}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function normalize(x,y,fallback={x:1,y:0}){
  const length=Math.hypot(x,y);
  return length>0.0001?{x:x/length,y:y/length}:{x:fallback.x,y:fallback.y};
}
function randomBetween(min,max){return min+Math.random()*(max-min)}

function polygon(points,fill,stroke=null,lineWidth=1){
  ctx.beginPath();
  ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()}
}

function rectCorners(rect,z=0){
  return [iso(rect.x,rect.y,z),iso(rect.x+rect.w,rect.y,z),iso(rect.x+rect.w,rect.y+rect.h,z),iso(rect.x,rect.y+rect.h,z)];
}

function drawIsoBox(rect,height,palette){
  const base=rectCorners(rect,0);
  const top=rectCorners(rect,height);
  polygon([base[1],base[2],top[2],top[1]],palette.x,palette.line,.8);
  polygon([base[3],base[2],top[2],top[3]],palette.y,palette.line,.8);
  polygon(top,palette.top,palette.line,1);
}

function roomAt(x,y){
  if(x>=12&&y<6)return 'bedroom';
  if(x>=12&&y>=6)return 'bathroom';
  if(x>=10)return 'hallway';
  if(x>=6&&y>=6)return 'kitchen';
  if(x>=6)return 'dining';
  return 'living';
}

function floorColour(x,y){
  const alternate=(x+y)%2===0;
  const room=roomAt(x,y);
  if(room==='bedroom')return alternate?'#d9c3b4':'#cfb5a5';
  if(room==='bathroom')return alternate?'#d5e0e1':'#c8d5d7';
  if(room==='hallway')return alternate?'#b88d62':'#ae8158';
  if(room==='kitchen')return alternate?'#cad5d2':'#bfcdca';
  if(room==='dining')return alternate?'#d8c39f':'#ceb78e';
  return alternate?'#cba679':'#c19a6c';
}

function drawFloor(){
  const bg=ctx.createLinearGradient(0,0,0,VIEW_H);
  bg.addColorStop(0,'#21495f');
  bg.addColorStop(1,'#102b3a');
  ctx.fillStyle=bg;
  ctx.fillRect(-30,-30,VIEW_W+60,VIEW_H+60);

  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      const points=[iso(x,y),iso(x+1,y),iso(x+1,y+1),iso(x,y+1)];
      polygon(points,floorColour(x,y),'rgba(72,68,58,.16)',.65);
    }
  }

  const southA=iso(0,ROWS),southB=iso(COLS,ROWS),southAd={x:southA.x,y:southA.y+16},southBd={x:southB.x,y:southB.y+16};
  polygon([southA,southB,southBd,southAd],'#7c634d','#5c4a3c',1);
  const eastA=iso(COLS,0),eastB=iso(COLS,ROWS),eastAd={x:eastA.x,y:eastA.y+16},eastBd={x:eastB.x,y:eastB.y+16};
  polygon([eastA,eastB,eastBd,eastAd],'#6e5947','#554538',1);

  drawRug({x:1.12,y:2.16,w:3.92,h:2.34},'#d86b49','#f1c784');
  drawRug({x:6.22,y:.72,w:3.05,h:3.18},'#567d78','#d6e0d4');
  drawRug({x:10.25,y:.85,w:1.32,h:9.90},'#7d5671','#d6b4ca');
  drawRug({x:12.48,y:3.10,w:2.28,h:1.34},'#8f6a84','#dfbfd3');
  drawRug({x:13.00,y:8.18,w:1.62,h:.86},'#6b98a2','#d7ecef');

  drawFloorDetails();
}

function drawRug(rect,fill,accent){
  const p=rectCorners(rect,1);
  polygon(p,fill,'rgba(69,49,38,.25)',1);
  const inner={x:rect.x+.16,y:rect.y+.16,w:rect.w-.32,h:rect.h-.32};
  polygon(rectCorners(inner,1.6),'rgba(255,255,255,.08)',accent,1.3);
}
