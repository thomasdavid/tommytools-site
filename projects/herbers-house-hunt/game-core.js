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
const TILE_W = 62;
const TILE_H = 31;
const ORIGIN_X = 600;
const ORIGIN_Y = 78;
const COLS = 19;
const ROWS = 14;
const ROUND_SECONDS = 60;
const MAX_LIVES = 3;
const LEAGUE_KEY = 'herbert-house-hunt-league-v3';
const OLD_LEAGUE_KEYS = ['herbert-house-hunt-league-v2','herber-house-hunt-best-v1'];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const palettes = {
  sofa:{top:'#d8d4cd',x:'#aaa69f',y:'#918e88',line:'#77736e'},
  wood:{top:'#aa7245',x:'#805132',y:'#674027',line:'#4d2f1f'},
  darkWood:{top:'#24282a',x:'#171a1c',y:'#0f1112',line:'#070809'},
  kitchen:{top:'#eee9de',x:'#c8c1b5',y:'#aaa399',line:'#88827a'},
  counter:{top:'#252829',x:'#17191a',y:'#101112',line:'#080909'},
  shelf:{top:'#25292b',x:'#171a1c',y:'#101214',line:'#070809'},
  tower:{top:'#c69a64',x:'#966c3e',y:'#78532f',line:'#604225'},
  bedroom:{top:'#c9aa91',x:'#9e806c',y:'#876b5b',line:'#705748'},
  bathroom:{top:'#cfdadc',x:'#9eafb2',y:'#87999d',line:'#6f8185'},
  wall:{top:'#f3eee4',x:'#d3c8b9',y:'#c1b4a4',line:'#978a7a'},
  black:{top:'#34393c',x:'#22272a',y:'#171b1d',line:'#0e1112'}
};

// The main room is deliberately a little larger than the real apartment so the
// chase routes remain readable, but the relative placement follows the photos:
// kitchen at the back-left, divider shelf in the centre, sofa/TV in the living
// zone and the round table beside the long window wall.
const wallRects = [
  {id:'mainHallNorth',x:11.92,y:0,w:.18,h:9.02,height:70},
  {id:'mainHallSouth',x:11.92,y:10.62,w:.18,h:3.38,height:70},
  {id:'hallEastNorth',x:13.92,y:0,w:.18,h:2.20,height:70},
  {id:'hallEastMiddle',x:13.92,y:3.82,w:.18,h:5.18,height:70},
  {id:'hallEastSouth',x:13.92,y:10.62,w:.18,h:3.38,height:70},
  {id:'bedBathWall',x:14,y:6.92,w:5,h:.18,height:70}
];

const obstacles = [
  // Real L-shaped kitchen. Both counter runs can be jumped onto.
  {id:'kitchenBack',type:'kitchenBack',x:.72,y:.48,w:5.62,h:.88,height:45,palette:palettes.kitchen,climbable:true},
  {id:'island',type:'kitchenReturn',x:5.48,y:.48,w:1.05,h:3.20,height:45,palette:palettes.kitchen,climbable:true},
  {id:'kitchenOpen',type:'kitchenOpen',x:.20,y:.52,w:.48,h:1.72,height:74,palette:palettes.kitchen},
  {id:'kitchenBin',type:'bin',x:.50,y:2.24,w:.64,h:.64,height:39,palette:palettes.black},

  // Central black shelving divider and the exercise equipment seen below it.
  {id:'shelf',type:'shelf',x:6.18,y:4.05,w:.78,h:4.05,height:78,palette:palettes.shelf,climbable:true},
  {id:'gymRack',type:'gymRack',x:4.95,y:8.28,w:2.05,h:.62,height:22,palette:palettes.black},
  {id:'catTower',type:'tower',x:4.20,y:9.15,w:.70,h:.70,height:55,palette:palettes.tower,climbable:true},
  {id:'catCube',type:'catCube',x:5.25,y:9.28,w:.82,h:.82,height:42,palette:palettes.black,climbable:true},

  // Living and dining zone.
  {id:'sofa',type:'sofa',x:8.25,y:4.00,w:3.15,h:1.16,height:40,palette:palettes.sofa,climbable:true},
  {id:'tvUnit',type:'tvUnit',x:8.00,y:.48,w:3.45,h:.68,height:27,palette:palettes.wood},
  {id:'dining',type:'dining',x:8.45,y:8.65,w:2.20,h:2.20,height:34,palette:palettes.darkWood,climbable:true},
  {id:'chairA',type:'chair',x:8.10,y:7.78,w:.66,h:.66,height:25,palette:palettes.black},
  {id:'chairB',type:'chair',x:9.10,y:11.08,w:.66,h:.66,height:25,palette:palettes.black},
  {id:'chairC',type:'chair',x:10.70,y:7.70,w:.66,h:.66,height:25,palette:palettes.black},
  {id:'keyboardDesk',type:'keyboard',x:.72,y:10.70,w:2.35,h:.68,height:30,palette:palettes.black},
  {id:'tripodLamp',type:'tripod',x:7.25,y:1.18,w:.55,h:.55,height:66,palette:palettes.black},
  {id:'plant',type:'plant',x:11.05,y:1.40,w:.66,h:.66,height:53,palette:palettes.wood},

  // Hallway, bedroom and bathroom remain connected to the main room.
  {id:'hallConsole',type:'console',x:12.18,y:5.05,w:.42,h:1.18,height:32,palette:palettes.wood,climbable:true},
  {id:'bed',type:'bed',x:15.42,y:.55,w:3.05,h:2.62,height:30,palette:palettes.bedroom,climbable:true},
  {id:'nightstand',type:'nightstand',x:18.18,y:3.70,w:.58,h:.58,height:24,palette:palettes.wood,climbable:true},
  {id:'wardrobe',type:'wardrobe',x:14.42,y:5.12,w:1.00,h:1.55,height:74,palette:palettes.bedroom},
  {id:'bath',type:'bath',x:14.55,y:7.62,w:2.95,h:1.45,height:35,palette:palettes.bathroom,climbable:true},
  {id:'vanity',type:'vanity',x:18.05,y:7.82,w:.66,h:1.70,height:47,palette:palettes.bathroom,climbable:true},
  {id:'toilet',type:'toilet',x:14.92,y:11.28,w:.74,h:.90,height:39,palette:palettes.bathroom},
  {id:'laundry',type:'cabinet',x:17.92,y:11.02,w:.76,h:2.12,height:59,palette:palettes.bathroom}
];

const vacuumEntrances = [
  {x:1.55,y:13.15},{x:10.95,y:12.70},{x:12.88,y:.62},{x:13.10,y:9.78},{x:17.15,y:4.65},{x:16.50,y:13.18}
];

const treatSeeds = [
  {x:1.55,y:4.28},{x:3.62,y:8.05},{x:5.15,y:11.75},{x:7.55,y:2.92},
  {x:8.67,y:7.57},{x:10.88,y:3.10},{x:12.82,y:7.02},{x:15.42,y:4.32},
  {x:17.35,y:5.55},{x:15.92,y:10.20},{x:17.20,y:12.72},{x:10.78,y:12.05}
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
let bestScore = 0;
let shake = 0;
let messageTimer = 0;
let entitiesReady = false;
let runSaved = false;
let currentRank = null;
let league = loadLeague();
bestScore = league.length ? league[0].score : 0;

const cat = {
  x:2.10,y:9.25,radius:.28,
  facing:{x:1,y:-1},vx:0,vy:0,
  pounceTimer:0,pounceCooldown:0,pounceDir:{x:1,y:-1},
  jumpTimer:0,jumpDuration:.62,jumpCooldown:0,jumpDir:{x:1,y:-1},
  jumpStartZ:0,jumpHeight:0,surfaceId:null,
  invulnerable:0,walkPhase:0
};

const vacuum = {
  active:false,x:12.88,y:.62,radius:.38,
  facing:{x:-1,y:1},state:'hidden',stateTimer:0,spawnTimer:4,
  path:[],pathTimer:0,spin:0,stuckTimer:0,lastX:12.88,lastY:.62,retreatTarget:null
};

let flies = [];
let treats = [];
let particles = [];
let floaters = [];
let herbertSprites = null;

function sanitizeLeagueEntry(entry){
  return {
    id:String(entry?.id||`${Date.now()}-${Math.random()}`),
    score:Math.max(0,Number.parseInt(entry?.score,10)||0),
    flies:Math.max(0,Number.parseInt(entry?.flies,10)||0),
    treats:Math.max(0,Number.parseInt(entry?.treats,10)||0),
    at:String(entry?.at||new Date().toISOString())
  };
}

function loadLeague(){
  let entries=[];
  try{
    const current=JSON.parse(localStorage.getItem(LEAGUE_KEY)||'[]');
    if(Array.isArray(current))entries=current.map(sanitizeLeagueEntry);
  }catch{}
  if(entries.length===0){
    try{
      const previous=JSON.parse(localStorage.getItem(OLD_LEAGUE_KEYS[0])||'[]');
      if(Array.isArray(previous))entries=previous.map(sanitizeLeagueEntry);
    }catch{}
  }
  if(entries.length===0){
    try{
      const oldBest=Math.max(0,Number.parseInt(localStorage.getItem(OLD_LEAGUE_KEYS[1])||'0',10)||0);
      if(oldBest>0)entries.push({id:'legacy-best',score:oldBest,flies:0,treats:0,at:new Date().toISOString()});
    }catch{}
  }
  return entries.filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score).slice(0,10);
}

function saveLeague(){try{localStorage.setItem(LEAGUE_KEY,JSON.stringify(league))}catch{}}

function recordLeagueScore(){
  if(runSaved)return currentRank;
  const entry={id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,score,flies:fliesCaught,treats:treatsFound,at:new Date().toISOString()};
  league=[...league,entry].sort((a,b)=>b.score-a.score||String(a.at).localeCompare(String(b.at))).slice(0,10);
  currentRank=league.findIndex(item=>item.id===entry.id)+1;
  if(currentRank===0)currentRank=null;
  runSaved=true;bestScore=league.length?league[0].score:0;saveLeague();renderLeague();return currentRank;
}

function formatLeagueDate(value){
  try{return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(new Date(value))}catch{return '—'}
}

function renderLeague(){
  if(!leagueRows)return;
  leagueRows.textContent='';leagueEmpty.hidden=league.length>0;
  league.forEach((entry,index)=>{
    const row=document.createElement('tr');if(index===0)row.className='league-leader';
    row.innerHTML=`<td><span class="rank-badge">${index+1}</span></td><td><strong>${entry.score.toLocaleString()}</strong></td><td>${entry.flies}</td><td>${entry.treats}</td><td>${formatLeagueDate(entry.at)}</td>`;
    leagueRows.appendChild(row);
  });
  pageBest.textContent=bestScore.toLocaleString();
}

function iso(x,y,z=0){return {x:ORIGIN_X+(x-y)*TILE_W/2,y:ORIGIN_Y+(x+y)*TILE_H/2-z}}
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function lerp(a,b,t){return a+(b-a)*t}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function normalize(x,y,fallback={x:1,y:0}){const length=Math.hypot(x,y);return length>.0001?{x:x/length,y:y/length}:{x:fallback.x,y:fallback.y}}
function randomBetween(min,max){return min+Math.random()*(max-min)}

function polygon(points,fill,stroke=null,lineWidth=1){
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()}
}

function rectCorners(rect,z=0){return [iso(rect.x,rect.y,z),iso(rect.x+rect.w,rect.y,z),iso(rect.x+rect.w,rect.y+rect.h,z),iso(rect.x,rect.y+rect.h,z)]}

function drawIsoBox(rect,height,palette){
  const base=rectCorners(rect,0),top=rectCorners(rect,height);
  polygon([base[1],base[2],top[2],top[1]],palette.x,palette.line,.8);
  polygon([base[3],base[2],top[2],top[3]],palette.y,palette.line,.8);
  polygon(top,palette.top,palette.line,1);
}

function roomAt(x,y){
  if(x>=14&&y<7)return 'bedroom';
  if(x>=14)return 'bathroom';
  if(x>=12)return 'hallway';
  if(x<6.8&&y<4.1)return 'kitchen';
  if(x>=8&&y>=7.2)return 'dining';
  return 'living';
}

function floorColour(x,y){
  const alternate=(x+y)%2===0,room=roomAt(x+.5,y+.5);
  if(room==='bedroom')return alternate?'#c9a27b':'#bd936b';
  if(room==='bathroom')return alternate?'#ced9da':'#c2ced0';
  if(room==='hallway')return alternate?'#d2cabd':'#c8bfb1';
  return alternate?'#ded9cf':'#d5d0c5';
}

function drawFloor(){
  const bg=ctx.createLinearGradient(0,0,0,VIEW_H);bg.addColorStop(0,'#21495f');bg.addColorStop(1,'#102b3a');ctx.fillStyle=bg;ctx.fillRect(-30,-30,VIEW_W+60,VIEW_H+60);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)polygon([iso(x,y),iso(x+1,y),iso(x+1,y+1),iso(x,y+1)],floorColour(x,y),'rgba(82,76,67,.17)',.62);
  const southA=iso(0,ROWS),southB=iso(COLS,ROWS),southAd={x:southA.x,y:southA.y+15},southBd={x:southB.x,y:southB.y+15};polygon([southA,southB,southBd,southAd],'#776354','#55473d',1);
  const eastA=iso(COLS,0),eastB=iso(COLS,ROWS),eastAd={x:eastA.x,y:eastA.y+15},eastBd={x:eastB.x,y:eastB.y+15};polygon([eastA,eastB,eastBd,eastAd],'#6c5a4d','#50443b',1);
  drawRug({x:6.82,y:3.52,w:5.05,h:4.58},'#a69250','#d3bd72');
  drawRug({x:12.22,y:.72,w:1.40,h:12.35},'#8a6b61','#d0b2a7');
  drawRug({x:14.52,y:3.55,w:3.45,h:2.05},'#8d6d61','#d7b9ac');
  drawRug({x:14.72,y:10.20,w:2.90,h:1.55},'#72949a','#cfe1e3');
  drawFloorDetails();
}

function drawRug(rect,fill,accent){
  polygon(rectCorners(rect,1.2),fill,'rgba(69,49,38,.25)',1);
  const inner={x:rect.x+.15,y:rect.y+.15,w:rect.w-.30,h:rect.h-.30};polygon(rectCorners(inner,1.8),'rgba(255,255,255,.07)',accent,1.15);
}
