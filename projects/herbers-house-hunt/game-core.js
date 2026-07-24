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
  const resultBest = document.getElementById('resultBest');
  const scoreValue = document.getElementById('scoreValue');
  const comboChip = document.getElementById('comboChip');
  const comboValue = document.getElementById('comboValue');
  const hearts = document.getElementById('hearts');
  const timeValue = document.getElementById('timeValue');
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

  const VIEW_W = 1200;
  const VIEW_H = 720;
  const TILE_W = 92;
  const TILE_H = 46;
  const ORIGIN_X = 600;
  const ORIGIN_Y = 104;
  const COLS = 12;
  const ROWS = 10;
  const ROUND_SECONDS = 90;
  const MAX_LIVES = 3;
  const STORAGE_KEY = 'herber-house-hunt-best-v1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const palettes = {
    sofa:{top:'#527f83',x:'#365f65',y:'#2c5056',line:'#24464b'},
    wood:{top:'#c99458',x:'#9c673c',y:'#825330',line:'#6d4529'},
    darkWood:{top:'#795640',x:'#5f4131',y:'#493225',line:'#3b281f'},
    kitchen:{top:'#d8d8cc',x:'#a8aaa2',y:'#8e918a',line:'#74776f'},
    shelf:{top:'#916b4c',x:'#735038',y:'#5e402e',line:'#493123'},
    tower:{top:'#d3a86e',x:'#a67842',y:'#865d32',line:'#6f4c2b'}
  };

  const obstacles = [
    {id:'sofa',type:'sofa',x:1.05,y:1.05,w:3.25,h:.95,height:35,palette:palettes.sofa},
    {id:'coffee',type:'table',x:1.85,y:2.62,w:1.95,h:1.05,height:21,palette:palettes.wood},
    {id:'shelf',type:'shelf',x:.35,y:4.18,w:.72,h:2.45,height:72,palette:palettes.shelf},
    {id:'catTower',type:'tower',x:4.75,y:.58,w:.72,h:.72,height:70,palette:palettes.tower},
    {id:'dining',type:'dining',x:7.25,y:1.25,w:2.35,h:1.95,height:33,palette:palettes.darkWood},
    {id:'island',type:'island',x:6.62,y:5.42,w:2.95,h:1.12,height:47,palette:palettes.kitchen},
    {id:'cabinet',type:'cabinet',x:10.45,y:4.12,w:.78,h:2.48,height:66,palette:palettes.kitchen},
    {id:'plant',type:'plant',x:10.15,y:8.12,w:.72,h:.72,height:55,palette:palettes.wood}
  ];

  const patrolPoints = [
    {x:10.1,y:8.65},{x:9.75,y:7.15},{x:5.2,y:8.45},{x:1.45,y:8.25},
    {x:1.35,y:6.95},{x:4.9,y:5.15},{x:5.75,y:2.35},{x:6.55,y:.85},{x:10.2,y:.8},{x:10.1,y:3.45}
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
  let lives = MAX_LIVES;
  let timeLeft = ROUND_SECONDS;
  let combo = 0;
  let comboTimer = 0;
  let bestScore = loadBest();
  let shake = 0;
  let messageTimer = 0;
  let entitiesReady = false;

  const cat = {
    x:2.15,y:7.75,radius:.28,
    facing:{x:1,y:-1},
    vx:0,vy:0,
    pounceTimer:0,pounceCooldown:0,pounceDir:{x:1,y:-1},
    invulnerable:0,walkPhase:0
  };

  const vacuum = {
    x:9.95,y:8.7,radius:.38,
    facing:{x:-1,y:-1},
    state:'patrol',stateTimer:0,
    patrolIndex:1,path:[],pathTimer:0,
    spin:0,stuckTimer:0,lastX:9.95,lastY:8.7
  };

  let flies = [];
  let particles = [];
  let floaters = [];

  function loadBest(){
    try{return Math.max(0,Number.parseInt(localStorage.getItem(STORAGE_KEY) || '0',10) || 0)}catch{return 0}
  }

  function saveBest(value){
    bestScore = Math.max(bestScore,value);
    try{localStorage.setItem(STORAGE_KEY,String(bestScore))}catch{}
    pageBest.textContent = bestScore.toLocaleString();
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

  function floorColour(x,y){
    const alternate=(x+y)%2===0;
    if(y>=5 && x>=6)return alternate?'#ced8d4':'#c4d0cd';
    if(y>=5)return alternate?'#d7b585':'#cfaa78';
    if(x>=6)return alternate?'#d9c4a0':'#d1b993';
    return alternate?'#caa578':'#c39b6d';
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

    const southA=iso(0,ROWS),southB=iso(COLS,ROWS),southAd={x:southA.x,y:southA.y+18},southBd={x:southB.x,y:southB.y+18};
    polygon([southA,southB,southBd,southAd],'#7c634d','#5c4a3c',1);
    const eastA=iso(COLS,0),eastB=iso(COLS,ROWS),eastAd={x:eastA.x,y:eastA.y+18},eastBd={x:eastB.x,y:eastB.y+18};
    polygon([eastA,eastB,eastBd,eastAd],'#6e5947','#554538',1);

    drawRug({x:1.18,y:2.18,w:3.92,h:2.34},'#d86b49','#f1c784');
    drawRug({x:7.05,y:.86,w:3.05,h:2.95},'#567d78','#d6e0d4');
    drawRug({x:2.05,y:7.0,w:2.35,h:1.65},'#8d6a84','#d9bacf');

    drawFloorDetails();
  }

  function drawRug(rect,fill,accent){
    const p=rectCorners(rect,1);
    polygon(p,fill,'rgba(69,49,38,.25)',1);
    const inner={x:rect.x+.16,y:rect.y+.16,w:rect.w-.32,h:rect.h-.32};
    polygon(rectCorners(inner,1.6),'rgba(255,255,255,.08)',accent,1.3);
  }

