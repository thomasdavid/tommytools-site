'use strict';

function circleRectBlocked(x,y,r,rect){
  const nx=clamp(x,rect.x,rect.x+rect.w),ny=clamp(y,rect.y,rect.y+rect.h);
  return Math.hypot(x-nx,y-ny)<r;
}

function pointBlocked(x,y,r,options={}){
  if(x<r||y<r||x>COLS-r||y>ROWS-r)return true;
  if(wallRects.some(item=>circleRectBlocked(x,y,r,item)))return true;
  return obstacles.some(item=>{
    if(options.ignoreClimbable&&item.climbable)return false;
    if(options.ignoreId&&item.id===options.ignoreId)return false;
    return circleRectBlocked(x,y,r,item);
  });
}

function moveEntity(entity,dx,dy){
  const nextX=entity.x+dx;
  if(!pointBlocked(nextX,entity.y,entity.radius))entity.x=nextX;
  const nextY=entity.y+dy;
  if(!pointBlocked(entity.x,nextY,entity.radius))entity.y=nextY;
}

function surfaceById(id){return id?obstacles.find(item=>item.id===id&&item.climbable)||null:null}
function surfaceHeight(id){const surface=surfaceById(id);return surface?surface.height+8:0}

function surfaceContains(surface,x,y,margin=.08){
  return x>=surface.x+margin&&x<=surface.x+surface.w-margin&&y>=surface.y+margin&&y<=surface.y+surface.h-margin;
}

function moveCatOnSurface(dx,dy){
  const surface=surfaceById(cat.surfaceId);
  if(!surface){cat.surfaceId=null;return}
  const margin=Math.min(.22,Math.max(.08,Math.min(surface.w,surface.h)*.20));
  cat.x=clamp(cat.x+dx,surface.x+margin,surface.x+surface.w-margin);
  cat.y=clamp(cat.y+dy,surface.y+margin,surface.y+surface.h-margin);
}

function moveCatGround(dx,dy){
  if(cat.surfaceId){moveCatOnSurface(dx,dy);return}
  const nextX=cat.x+dx;
  if(!pointBlocked(nextX,cat.y,cat.radius))cat.x=nextX;
  const nextY=cat.y+dy;
  if(!pointBlocked(cat.x,nextY,cat.radius))cat.y=nextY;
}

function moveCatAirborne(dx,dy){
  const nextX=cat.x+dx;
  if(!pointBlocked(nextX,cat.y,cat.radius,{ignoreClimbable:true}))cat.x=nextX;
  const nextY=cat.y+dy;
  if(!pointBlocked(cat.x,nextY,cat.radius,{ignoreClimbable:true}))cat.y=nextY;
}

function landCat(){
  const candidates=obstacles.filter(item=>item.climbable&&surfaceContains(item,cat.x,cat.y,.06)).sort((a,b)=>b.height-a.height);
  cat.surfaceId=candidates.length?candidates[0].id:null;
  cat.jumpHeight=surfaceHeight(cat.surfaceId);
  if(cat.surfaceId){
    showMessage(`Up on the ${friendlySurfaceName(cat.surfaceId)}!`,1.05);
    tone(392,.06,'triangle',.018);tone(523,.08,'triangle',.015,.05);
  }else{
    for(let i=0;i<4;i++)spawnDust(cat.x,cat.y,'#e8d1aa');
  }
}

function friendlySurfaceName(id){
  const names={sofa:'sofa',coffee:'coffee table',catTower:'cat tower',dining:'dining table',island:'kitchen island',hallConsole:'hall table',bed:'bed',nightstand:'bedside table',bath:'bath',vanity:'vanity'};
  return names[id]||'furniture';
}

function randomFreePoint(r=.28){
  for(let i=0;i<220;i++){
    const p={x:.62+Math.random()*(COLS-1.24),y:.62+Math.random()*(ROWS-1.24)};
    if(!pointBlocked(p.x,p.y,r)&&dist(p,cat)>1.25&&(!vacuum.active||dist(p,vacuum)>.9))return p;
  }
  return {x:5.7,y:5.2};
}

function makeFly(index){
  const p=randomFreePoint(.10);
  return {
    id:index,x:p.x,y:p.y,z:38+Math.random()*15,target:randomFreePoint(.08),phase:Math.random()*Math.PI*2,
    speed:1.06+Math.random()*.52,alive:true,respawn:0,turnTimer:randomBetween(.28,.88),burstTimer:0,burstScale:1
  };
}

function makeTreats(){
  return treatSeeds.map((spot,index)=>({id:index,x:spot.x,y:spot.y,found:false,reveal:0,spin:Math.random()*Math.PI*2}));
}

function resetGame(){
  score=0;fliesCaught=0;treatsFound=0;lives=MAX_LIVES;timeLeft=ROUND_SECONDS;combo=0;comboTimer=0;shake=0;runSaved=false;currentRank=null;
  cat.x=2.10;cat.y=9.25;cat.facing={x:1,y:-1};cat.vx=0;cat.vy=0;cat.pounceTimer=0;cat.pounceCooldown=0;cat.invulnerable=0;cat.walkPhase=0;
  cat.jumpTimer=0;cat.jumpCooldown=0;cat.jumpHeight=0;cat.jumpStartZ=0;cat.surfaceId=null;
  vacuum.active=false;vacuum.state='hidden';vacuum.spawnTimer=randomBetween(3.2,6.5);vacuum.path=[];vacuum.pathTimer=0;vacuum.spin=0;vacuum.stuckTimer=0;vacuum.retreatTarget=null;
  flies=Array.from({length:5},(_,i)=>makeFly(i));treats=makeTreats();particles=[];floaters=[];messageTimer=0;entitiesReady=true;
  updateHud(true);
}

function showMenu(){
  state='menu';overlayAction='start';
  overlayEyebrow.textContent='A Tommy Tools game';
  overlayTitle.innerHTML="Herbert's<br>House Hunt";
  overlayCopy.textContent='Guide Herbert through the living room, hallway, bedroom and bathroom. Catch flies, uncover hidden treats and jump clear when the vacuum charges.';
  controlsRow.hidden=false;resultLine.hidden=true;overlayButton.textContent='Start 60-second hunt';overlay.classList.remove('hidden');
}

function startGame(){
  ensureAudio();resetGame();state='playing';overlay.classList.add('hidden');canvas.focus({preventScroll:true});tone(392,.08,'sine',.035);tone(523,.12,'sine',.03,.08);
}

function showPause(){
  overlayAction='resume';overlayEyebrow.textContent='The house is quiet';overlayTitle.textContent='Paused';overlayCopy.textContent='Herbert is holding his position. Resume when you are ready to continue the hunt.';controlsRow.hidden=true;resultLine.hidden=true;overlayButton.textContent='Resume game';overlay.classList.remove('hidden');
}

function togglePause(){
  if(state==='playing'){state='paused';showPause()}
  else if(state==='paused'){state='playing';overlay.classList.add('hidden');lastFrame=performance.now();canvas.focus({preventScroll:true})}
}

function endGame(){
  if(state==='gameover')return;
  state='gameover';
  const previousBest=bestScore;
  const rank=score>0?recordLeagueScore():null;
  overlayAction='restart';
  overlayEyebrow.textContent=score>previousBest?'New league leader':rank?`League position ${rank}`:'Hunt complete';
  overlayTitle.textContent=lives<=0?'Vacuumed!':'Time is up';
  overlayCopy.textContent=lives<=0?'The vacuum landed its third hit. Every fly and hidden treat still counts in Herbert’s league table.':'Herbert explored the house for the full minute. Your score has been added to this browser’s league table.';
  controlsRow.hidden=true;resultLine.hidden=false;resultScore.textContent=score.toLocaleString();resultFlies.textContent=String(fliesCaught);resultTreats.textContent=String(treatsFound);resultRank.textContent=rank?`#${rank}`:'—';overlayButton.textContent='Play again';overlay.classList.remove('hidden');
  tone(330,.11,'triangle',.04);tone(247,.18,'triangle',.035,.12);tone(196,.28,'triangle',.03,.28);
}

function showMessage(text,duration=1.2){
  liveMessage.textContent=text;liveMessage.classList.add('visible');messageTimer=duration;
}

function ensureAudio(){
  if(!audioContext){
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(AudioCtx)audioContext=new AudioCtx();
  }
  if(audioContext?.state==='suspended')audioContext.resume();
}

function tone(frequency,duration,type='sine',gain=.025,delay=0){
  if(!soundOn||!audioContext)return;
  const start=audioContext.currentTime+delay;
  const oscillator=audioContext.createOscillator();const amp=audioContext.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(Math.max(.0001,gain),start+.015);amp.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(amp);amp.connect(audioContext.destination);oscillator.start(start);oscillator.stop(start+duration+.03);
}

function updateHud(force=false){
  const scoreText=score.toLocaleString();if(force||scoreValue.textContent!==scoreText)scoreValue.textContent=scoreText;
  const timeText=String(Math.max(0,Math.ceil(timeLeft)));if(force||timeValue.textContent!==timeText)timeValue.textContent=timeText;
  const heartText='❤'.repeat(lives)+'♡'.repeat(MAX_LIVES-lives);if(force||hearts.textContent!==heartText)hearts.textContent=heartText;
  const treatText=String(treatsFound);if(force||treatValue.textContent!==treatText)treatValue.textContent=treatText;
  comboValue.textContent='×'+Math.max(2,combo);comboChip.classList.toggle('visible',combo>=2&&comboTimer>0);
  const danger=vacuum.active&&(vacuum.state==='alert'||vacuum.state==='chase');
  dangerBanner.classList.toggle('visible',danger);
  dangerBanner.textContent=vacuum.state==='alert'?'Vacuum incoming':'Vacuum chase';
  jumpButton.classList.toggle('cooling',cat.jumpCooldown>0);
  pounceButton.classList.toggle('cooling',cat.pounceCooldown>0);
}

function getMoveInput(){
  let sx=0,sy=0;
  if(keys.has('ArrowLeft')||keys.has('KeyA'))sx-=1;
  if(keys.has('ArrowRight')||keys.has('KeyD'))sx+=1;
  if(keys.has('ArrowUp')||keys.has('KeyW'))sy-=1;
  if(keys.has('ArrowDown')||keys.has('KeyS'))sy+=1;
  sx+=touchVector.x;sy+=touchVector.y;
  const screen=normalize(sx,sy,{x:0,y:0});
  if(Math.hypot(sx,sy)<.08)return {x:0,y:0};
  return normalize(screen.y+screen.x,screen.y-screen.x,{x:0,y:0});
}

function triggerPounce(){
  if(state!=='playing'||cat.pounceCooldown>0||cat.jumpTimer>0)return;
  const input=getMoveInput();
  const direction=Math.hypot(input.x,input.y)>.1?input:cat.facing;
  cat.pounceDir=normalize(direction.x,direction.y,cat.facing);cat.pounceTimer=.36;cat.pounceCooldown=.66;
  tone(185,.06,'triangle',.02);tone(246,.07,'triangle',.015,.045);
  for(let i=0;i<4;i++)spawnDust(cat.x,cat.y,'#e8d1aa');
}

function triggerJump(){
  if(state!=='playing'||cat.jumpCooldown>0||cat.jumpTimer>0)return;
  const input=getMoveInput();
  const direction=Math.hypot(input.x,input.y)>.1?input:cat.facing;
  cat.jumpDir=normalize(direction.x,direction.y,cat.facing);
  cat.jumpStartZ=surfaceHeight(cat.surfaceId);
  cat.surfaceId=null;
  cat.jumpTimer=cat.jumpDuration;cat.jumpCooldown=.82;cat.jumpHeight=cat.jumpStartZ;cat.pounceTimer=0;
  tone(294,.06,'triangle',.022);tone(440,.10,'sine',.018,.045);
  for(let i=0;i<5;i++)spawnDust(cat.x,cat.y,'#f0d9b6');
}

function updateCat(dt){
  cat.pounceCooldown=Math.max(0,cat.pounceCooldown-dt);cat.jumpCooldown=Math.max(0,cat.jumpCooldown-dt);cat.invulnerable=Math.max(0,cat.invulnerable-dt);

  if(cat.jumpTimer>0){
    cat.jumpTimer=Math.max(0,cat.jumpTimer-dt);
    const progress=1-cat.jumpTimer/cat.jumpDuration;
    cat.jumpHeight=cat.jumpStartZ+Math.sin(Math.PI*progress)*58;
    const direction=getMoveInput();
    const steer=Math.hypot(direction.x,direction.y)>.1?normalize(cat.jumpDir.x*.72+direction.x*.52,cat.jumpDir.y*.72+direction.y*.52,cat.jumpDir):cat.jumpDir;
    cat.facing=steer;cat.vx=steer.x*3.72;cat.vy=steer.y*3.72;cat.walkPhase+=dt*14;
    moveCatAirborne(cat.vx*dt,cat.vy*dt);
    if(cat.jumpTimer<=0)landCat();
    return;
  }

  cat.pounceTimer=Math.max(0,cat.pounceTimer-dt);
  let direction,speed;
  if(cat.pounceTimer>0){direction=cat.pounceDir;speed=4.70}else{direction=getMoveInput();speed=2.62}
  cat.vx=direction.x*speed;cat.vy=direction.y*speed;
  if(Math.hypot(direction.x,direction.y)>.1){cat.facing=normalize(direction.x,direction.y,cat.facing);cat.walkPhase+=dt*(cat.pounceTimer>0?18:10)}
  moveCatGround(cat.vx*dt,cat.vy*dt);
  cat.jumpHeight=surfaceHeight(cat.surfaceId);
  if(cat.pounceTimer>0)checkPounceTargets();
}

function checkPounceTargets(){
  const catchPoint={x:cat.x+cat.pounceDir.x*.40,y:cat.y+cat.pounceDir.y*.40};
  for(const fly of flies){
    if(fly.alive&&dist(catchPoint,fly)<.70)catchFly(fly);
  }
  if(!cat.surfaceId){
    for(const treat of treats){
      if(!treat.found&&dist(catchPoint,treat)<.58)findTreat(treat);
    }
  }
}

function catchFly(fly){
  fly.alive=false;fly.respawn=.62+Math.random()*.42;fliesCaught++;
  combo=comboTimer>0?Math.min(5,combo+1):1;comboTimer=3.6;
  const points=100*combo;score+=points;
  const pos=iso(fly.x,fly.y,fly.z);floaters.push({x:pos.x,y:pos.y,text:'+'+points,life:1,maxLife:1,colour:combo>=3?'#ffd56c':'#fff2bd'});
  for(let i=0;i<12;i++)spawnParticle(fly.x,fly.y,fly.z,i%2?'#ffd56c':'#35281c');
  tone(660,.08,'sine',.035);tone(880,.11,'sine',.028,.065);if(combo>=3)tone(1100,.11,'sine',.02,.13);
  showMessage(combo>=2?combo+'× combo!':'Fly caught!');
}

function findTreat(treat){
  treat.found=true;treat.reveal=1.45;treatsFound++;
  const points=250;score+=points;
  const pos=iso(treat.x,treat.y,12);floaters.push({x:pos.x,y:pos.y,text:'+250 treat!',life:1.25,maxLife:1.25,colour:'#ffdf78'});
  for(let i=0;i<16;i++)spawnParticle(treat.x,treat.y,9,i%3?'#f2a046':'#fff1bd');
  tone(523,.08,'triangle',.03);tone(659,.10,'triangle',.026,.07);tone(784,.14,'triangle',.022,.15);
  showMessage('Hidden treat found!',1.4);
}

function updateFlies(dt){
  for(const fly of flies){
    if(!fly.alive){
      fly.respawn-=dt;
      if(fly.respawn<=0){const p=randomFreePoint(.10);fly.x=p.x;fly.y=p.y;fly.target=randomFreePoint(.08);fly.phase=Math.random()*Math.PI*2;fly.turnTimer=randomBetween(.24,.72);fly.alive=true}
      continue;
    }
    fly.phase+=dt*15;
    fly.turnTimer-=dt;fly.burstTimer=Math.max(0,fly.burstTimer-dt);
    if(fly.turnTimer<=0||dist(fly,fly.target)<.26){
      fly.target=randomFreePoint(.08);fly.turnTimer=randomBetween(.22,.78);
      if(Math.random()<.34){fly.burstTimer=randomBetween(.22,.55);fly.burstScale=randomBetween(1.35,1.82)}
    }
    let desired=normalize(fly.target.x-fly.x,fly.target.y-fly.y);
    const catDistance=dist(fly,cat);
    if(catDistance<2.15){const flee=normalize(fly.x-cat.x,fly.y-cat.y);desired=normalize(desired.x*.18+flee.x*1.65,desired.y*.18+flee.y*1.65)}
    const side={x:-desired.y,y:desired.x};
    const zig=Math.sin(fly.phase*1.37)*.34+Math.sin(fly.phase*.61)*.18;
    const move=normalize(desired.x+side.x*zig,desired.y+side.y*zig,desired);
    const speed=fly.speed*(fly.burstTimer>0?fly.burstScale:1);
    fly.x+=move.x*speed*dt;fly.y+=move.y*speed*dt;
    if(fly.x<.24||fly.x>COLS-.24){fly.x=clamp(fly.x,.24,COLS-.24);fly.target=randomFreePoint(.08);fly.turnTimer=.08}
    if(fly.y<.24||fly.y>ROWS-.24){fly.y=clamp(fly.y,.24,ROWS-.24);fly.target=randomFreePoint(.08);fly.turnTimer=.08}
    fly.z=43+Math.sin(fly.phase*.72)*8+Math.sin(fly.phase*1.9)*2;
  }
}

function updateTreats(dt){
  for(const treat of treats){if(treat.reveal>0){treat.reveal=Math.max(0,treat.reveal-dt);treat.spin+=dt*5}}
}

function hasLineOfSight(a,b,r=.18){
  const d=dist(a,b),steps=Math.ceil(d/.17);
  for(let i=1;i<steps;i++){
    const t=i/steps,x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t);
    if(pointBlocked(x,y,r))return false;
  }
  return true;
}

function pickVacuumEntrance(requireDistance=true){
  const candidates=vacuumEntrances.filter(point=>!requireDistance||dist(point,cat)>3.25);
  const pool=candidates.length?candidates:vacuumEntrances;
  return pool[Math.floor(Math.random()*pool.length)];
}

function spawnVacuum(){
  const entrance=pickVacuumEntrance(true);
  vacuum.x=entrance.x;vacuum.y=entrance.y;vacuum.active=true;vacuum.state='alert';vacuum.stateTimer=randomBetween(.68,.96);vacuum.path=[];vacuum.pathTimer=0;vacuum.stuckTimer=0;vacuum.retreatTarget=null;
  vacuum.facing=normalize(cat.x-vacuum.x,cat.y-vacuum.y,{x:-1,y:1});
  tone(520,.08,'square',.018);tone(520,.08,'square',.018,.15);showMessage('The vacuum has entered!',1.15);
}

function startVacuumRetreat(){
  vacuum.state='retreat';vacuum.stateTimer=8;
  vacuum.retreatTarget=vacuumEntrances.reduce((best,point)=>dist(vacuum,point)<dist(vacuum,best)?point:best,vacuumEntrances[0]);
  vacuum.path=[];vacuum.pathTimer=0;
}

function hideVacuum(){
  vacuum.active=false;vacuum.state='hidden';vacuum.spawnTimer=randomBetween(3.6,8.2);vacuum.path=[];vacuum.retreatTarget=null;
}

function catSafeFromVacuum(){return cat.jumpTimer>0||Boolean(cat.surfaceId)}

function updateVacuum(dt){
  vacuum.spin+=dt*(vacuum.state==='chase'?11:5);
  if(!vacuum.active){
    vacuum.spawnTimer-=dt;
    if(vacuum.spawnTimer<=0)spawnVacuum();
    return;
  }

  vacuum.stateTimer-=dt;vacuum.pathTimer-=dt;
  if(vacuum.state==='alert'){
    vacuum.facing=normalize(cat.x-vacuum.x,cat.y-vacuum.y,vacuum.facing);
    if(vacuum.stateTimer<=0){vacuum.state='chase';vacuum.stateTimer=randomBetween(6.0,9.5);vacuum.pathTimer=0;tone(180,.18,'sawtooth',.02)}
    return;
  }

  if(vacuum.state==='chase'&&vacuum.stateTimer<=0)startVacuumRetreat();
  if(vacuum.state==='retreat'&&vacuum.stateTimer<=0){hideVacuum();return}

  const target=vacuum.state==='retreat'?vacuum.retreatTarget:{x:cat.x,y:cat.y};
  if(vacuum.state==='retreat'&&target&&dist(vacuum,target)<.34){hideVacuum();return}

  if(vacuum.pathTimer<=0||vacuum.path.length===0){
    vacuum.path=findPath(vacuum,target,vacuum.radius);vacuum.pathTimer=vacuum.state==='chase'?.27:.65;
  }

  while(vacuum.path.length&&dist(vacuum,vacuum.path[0])<.16)vacuum.path.shift();
  const waypoint=vacuum.path[0]||target;
  const direction=normalize(waypoint.x-vacuum.x,waypoint.y-vacuum.y,vacuum.facing);
  vacuum.facing=direction;
  const speed=vacuum.state==='chase'?2.38:1.62;
  vacuum.lastX=vacuum.x;vacuum.lastY=vacuum.y;moveEntity(vacuum,direction.x*speed*dt,direction.y*speed*dt);
  const moved=Math.hypot(vacuum.x-vacuum.lastX,vacuum.y-vacuum.lastY);
  vacuum.stuckTimer=moved<.001?vacuum.stuckTimer+dt:0;
  if(vacuum.stuckTimer>.42){vacuum.path=[];vacuum.pathTimer=0;vacuum.stuckTimer=0}

  if(vacuum.state==='chase'&&!catSafeFromVacuum()&&cat.invulnerable<=0&&dist(vacuum,cat)<vacuum.radius+cat.radius+.06)hitCat();
}

function hitCat(){
  lives=Math.max(0,lives-1);combo=0;comboTimer=0;cat.invulnerable=1.45;shake=reducedMotion?2:13;
  const away=normalize(cat.x-vacuum.x,cat.y-vacuum.y,cat.facing);
  for(let i=0;i<7;i++)moveCatGround(away.x*.10,away.y*.10);
  startVacuumRetreat();
  for(let i=0;i<15;i++)spawnParticle(cat.x,cat.y,24,i%2?'#df7e2b':'#fff0d5');
  tone(120,.22,'sawtooth',.04);tone(85,.28,'square',.025,.05);showMessage(`Vacuum hit ${MAX_LIVES-lives} of ${MAX_LIVES}`,1.5);
  if(lives<=0)endGame();
}

function findPath(start,target,radius){
  const cell=.4,cols=Math.floor(COLS/cell),rows=Math.floor(ROWS/cell);
  const toCell=p=>({x:clamp(Math.floor(p.x/cell),0,cols-1),y:clamp(Math.floor(p.y/cell),0,rows-1)});
  const centre=(x,y)=>({x:(x+.5)*cell,y:(y+.5)*cell});
  const blocked=(x,y)=>{const p=centre(x,y);return pointBlocked(p.x,p.y,radius)};
  function nearestFree(c){
    if(!blocked(c.x,c.y))return c;
    for(let ring=1;ring<9;ring++)for(let oy=-ring;oy<=ring;oy++)for(let ox=-ring;ox<=ring;ox++){
      if(Math.max(Math.abs(ox),Math.abs(oy))!==ring)continue;
      const x=c.x+ox,y=c.y+oy;if(x>=0&&y>=0&&x<cols&&y<rows&&!blocked(x,y))return{x,y};
    }
    return c;
  }
  const s=nearestFree(toCell(start)),g=nearestFree(toCell(target));
  const key=(x,y)=>y*cols+x,startKey=key(s.x,s.y),goalKey=key(g.x,g.y);
  const open=[startKey],came=new Map(),gScore=new Map([[startKey,0]]),fScore=new Map([[startKey,Math.hypot(g.x-s.x,g.y-s.y)]]),openSet=new Set(open);
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  let loops=0;
  while(open.length&&loops++<2200){
    let bestIndex=0,bestF=Infinity;
    for(let i=0;i<open.length;i++){const f=fScore.get(open[i])??Infinity;if(f<bestF){bestF=f;bestIndex=i}}
    const current=open.splice(bestIndex,1)[0];openSet.delete(current);
    if(current===goalKey){
      const path=[];let cur=current;
      while(cur!==startKey){const x=cur%cols,y=Math.floor(cur/cols);path.push(centre(x,y));cur=came.get(cur);if(cur===undefined)break}
      path.reverse();return path;
    }
    const cx=current%cols,cy=Math.floor(current/cols);
    for(const [dx,dy] of dirs){
      const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=cols||ny>=rows||blocked(nx,ny))continue;
      if(dx&&dy&&(blocked(cx+dx,cy)||blocked(cx,cy+dy)))continue;
      const nk=key(nx,ny),tentative=(gScore.get(current)??Infinity)+(dx&&dy?1.414:1);
      if(tentative<(gScore.get(nk)??Infinity)){
        came.set(nk,current);gScore.set(nk,tentative);fScore.set(nk,tentative+Math.hypot(g.x-nx,g.y-ny));
        if(!openSet.has(nk)){open.push(nk);openSet.add(nk)}
      }
    }
  }
  return [{x:target.x,y:target.y}];
}

function spawnDust(x,y,colour){
  particles.push({x,y,z:3,vx:(Math.random()-.5)*.55,vy:(Math.random()-.5)*.55,vz:10+Math.random()*10,life:.45,maxLife:.45,colour,size:4+Math.random()*5,gravity:35});
}

function spawnParticle(x,y,z,colour){
  const angle=Math.random()*Math.PI*2,speed=.3+Math.random()*.8;
  particles.push({x,y,z,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,vz:24+Math.random()*36,life:.55+Math.random()*.35,maxLife:.9,colour,size:2+Math.random()*3,gravity:78});
}

function updateEffects(dt){
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=p.gravity*dt;p.life-=dt});
  particles=particles.filter(p=>p.life>0);
  floaters.forEach(f=>{f.y-=38*dt;f.life-=dt});floaters=floaters.filter(f=>f.life>0);
  if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0)liveMessage.classList.remove('visible')}
  shake=Math.max(0,shake-dt*30);
}

function update(dt){
  elapsed+=dt;
  if(state!=='playing'){updateEffects(Math.min(dt,.03));return}
  timeLeft-=dt;if(timeLeft<=0){timeLeft=0;endGame();return}
  if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=0}
  updateCat(dt);updateFlies(dt);updateTreats(dt);updateVacuum(dt);updateEffects(dt);updateHud();
}
