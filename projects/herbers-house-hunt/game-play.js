'use strict';

  function circleRectBlocked(x,y,r,rect){
    const nx=clamp(x,rect.x,rect.x+rect.w),ny=clamp(y,rect.y,rect.y+rect.h);
    return Math.hypot(x-nx,y-ny)<r;
  }

  function pointBlocked(x,y,r){
    if(x<r||y<r||x>COLS-r||y>ROWS-r)return true;
    return obstacles.some(item=>circleRectBlocked(x,y,r,item));
  }

  function moveEntity(entity,dx,dy){
    const nextX=entity.x+dx;
    if(!pointBlocked(nextX,entity.y,entity.radius))entity.x=nextX;
    const nextY=entity.y+dy;
    if(!pointBlocked(entity.x,nextY,entity.radius))entity.y=nextY;
  }

  function randomFreePoint(r=.28){
    for(let i=0;i<160;i++){
      const p={x:.65+Math.random()*(COLS-1.3),y:.65+Math.random()*(ROWS-1.3)};
      if(!pointBlocked(p.x,p.y,r)&&dist(p,cat)>1.3&&dist(p,vacuum)>.9)return p;
    }
    return {x:5.7,y:4.7};
  }

  function makeFly(index){
    const p=randomFreePoint(.12);
    return {id:index,x:p.x,y:p.y,z:38+Math.random()*12,target:randomFreePoint(.1),phase:Math.random()*Math.PI*2,speed:.72+Math.random()*.25,alive:true,respawn:0};
  }

  function resetGame(){
    score=0;fliesCaught=0;lives=MAX_LIVES;timeLeft=ROUND_SECONDS;combo=0;comboTimer=0;shake=0;
    cat.x=2.15;cat.y=7.75;cat.facing={x:1,y:-1};cat.vx=0;cat.vy=0;cat.pounceTimer=0;cat.pounceCooldown=0;cat.invulnerable=0;cat.walkPhase=0;
    vacuum.x=9.95;vacuum.y=8.7;vacuum.facing={x:-1,y:-1};vacuum.state='patrol';vacuum.stateTimer=0;vacuum.patrolIndex=1;vacuum.path=[];vacuum.pathTimer=0;vacuum.spin=0;vacuum.stuckTimer=0;
    flies=Array.from({length:4},(_,i)=>makeFly(i));particles=[];floaters=[];messageTimer=0;entitiesReady=true;
    updateHud(true);
  }

  function showMenu(){
    state='menu';overlayAction='start';
    overlayEyebrow.textContent='A Tommy Tools game';
    overlayTitle.innerHTML="Herber's<br>House Hunt";
    overlayCopy.textContent='Guide Herber the ginger cat around the house. Pounce on flies for points, build a combo and do not let the vacuum catch you.';
    controlsRow.hidden=false;resultLine.hidden=true;overlayButton.textContent='Start hunting';overlay.classList.remove('hidden');
  }

  function startGame(){
    ensureAudio();resetGame();state='playing';overlay.classList.add('hidden');canvas.focus({preventScroll:true});tone(392,.08,'sine',.035);tone(523,.12,'sine',.03,.08);
  }

  function showPause(){
    overlayAction='resume';overlayEyebrow.textContent='The house is quiet';overlayTitle.textContent='Paused';overlayCopy.textContent='Herber is holding his position. Resume when you are ready to continue the hunt.';controlsRow.hidden=true;resultLine.hidden=true;overlayButton.textContent='Resume game';overlay.classList.remove('hidden');
  }

  function togglePause(){
    if(state==='playing'){state='paused';showPause()}
    else if(state==='paused'){state='playing';overlay.classList.add('hidden');lastFrame=performance.now();canvas.focus({preventScroll:true})}
  }

  function endGame(){
    if(state==='gameover')return;
    state='gameover';
    const previousBest=bestScore;saveBest(score);
    overlayAction='restart';overlayEyebrow.textContent=score>previousBest?'New house record':'Hunt complete';overlayTitle.textContent=lives<=0?'Vacuumed!':'Time is up';
    overlayCopy.textContent=lives<=0?'The vacuum finally cornered Herber, but every fly still counted.':'Herber defended the house until the final second.';
    controlsRow.hidden=true;resultLine.hidden=false;resultScore.textContent=score.toLocaleString();resultFlies.textContent=String(fliesCaught);resultBest.textContent=bestScore.toLocaleString();overlayButton.textContent='Play again';overlay.classList.remove('hidden');
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
    comboValue.textContent='×'+Math.max(2,combo);comboChip.classList.toggle('visible',combo>=2&&comboTimer>0);
    dangerBanner.classList.toggle('visible',vacuum.state==='alert'||vacuum.state==='chase');
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
    if(state!=='playing'||cat.pounceCooldown>0)return;
    const input=getMoveInput();
    const direction=Math.hypot(input.x,input.y)>.1?input:cat.facing;
    cat.pounceDir=normalize(direction.x,direction.y,cat.facing);cat.pounceTimer=.36;cat.pounceCooldown=.68;
    tone(185,.06,'triangle',.02);tone(246,.07,'triangle',.015,.045);
    for(let i=0;i<4;i++)spawnDust(cat.x,cat.y,'#e8d1aa');
  }

  function updateCat(dt){
    cat.pounceTimer=Math.max(0,cat.pounceTimer-dt);cat.pounceCooldown=Math.max(0,cat.pounceCooldown-dt);cat.invulnerable=Math.max(0,cat.invulnerable-dt);
    let direction,speed;
    if(cat.pounceTimer>0){direction=cat.pounceDir;speed=4.65}else{direction=getMoveInput();speed=2.55}
    cat.vx=direction.x*speed;cat.vy=direction.y*speed;
    if(Math.hypot(direction.x,direction.y)>.1){cat.facing=normalize(direction.x,direction.y,cat.facing);cat.walkPhase+=dt*(cat.pounceTimer>0?18:10)}
    moveEntity(cat,cat.vx*dt,cat.vy*dt);
    if(cat.pounceTimer>0)checkFlyCatches();
  }

  function checkFlyCatches(){
    const catchPoint={x:cat.x+cat.pounceDir.x*.40,y:cat.y+cat.pounceDir.y*.40};
    for(const fly of flies){
      if(!fly.alive)continue;
      if(dist(catchPoint,fly)<.72){catchFly(fly)}
    }
  }

  function catchFly(fly){
    fly.alive=false;fly.respawn=.75+Math.random()*.45;fliesCaught++;
    combo=comboTimer>0?Math.min(5,combo+1):1;comboTimer=4.0;
    const points=100*combo;score+=points;timeLeft=Math.min(ROUND_SECONDS+8,timeLeft+1.25);
    const pos=iso(fly.x,fly.y,fly.z);floaters.push({x:pos.x,y:pos.y,text:'+'+points,life:1,maxLife:1,colour:combo>=3?'#ffd56c':'#fff2bd'});
    for(let i=0;i<12;i++)spawnParticle(fly.x,fly.y,fly.z,i%2?'#ffd56c':'#35281c');
    tone(660,.08,'sine',.035);tone(880,.11,'sine',.028,.065);if(combo>=3)tone(1100,.11,'sine',.02,.13);
    showMessage(combo>=2?combo+'× combo!':'Fly caught!');
  }

  function updateFlies(dt){
    for(const fly of flies){
      if(!fly.alive){
        fly.respawn-=dt;
        if(fly.respawn<=0){const p=randomFreePoint(.12);fly.x=p.x;fly.y=p.y;fly.target=randomFreePoint(.1);fly.phase=Math.random()*Math.PI*2;fly.alive=true}
        continue;
      }
      fly.phase+=dt*11;
      if(dist(fly,fly.target)<.35||Math.random()<dt*.18)fly.target=randomFreePoint(.1);
      let desired=normalize(fly.target.x-fly.x,fly.target.y-fly.y);
      const catDistance=dist(fly,cat);
      if(catDistance<1.75){const flee=normalize(fly.x-cat.x,fly.y-cat.y);desired=normalize(desired.x*.25+flee.x*1.4,desired.y*.25+flee.y*1.4)}
      const side={x:-desired.y,y:desired.x};
      fly.x+=clamp(desired.x+side.x*Math.sin(fly.phase)*.18,-1,1)*fly.speed*dt;
      fly.y+=clamp(desired.y+side.y*Math.sin(fly.phase)*.18,-1,1)*fly.speed*dt;
      fly.x=clamp(fly.x,.25,COLS-.25);fly.y=clamp(fly.y,.25,ROWS-.25);
      fly.z=42+Math.sin(fly.phase*.7)*7;
    }
  }

  function hasLineOfSight(a,b,r=.18){
    const d=dist(a,b),steps=Math.ceil(d/.18);
    for(let i=1;i<steps;i++){
      const t=i/steps,x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t);
      if(pointBlocked(x,y,r))return false;
    }
    return true;
  }

  function nearestPatrolIndex(){
    let best=0,bestD=Infinity;
    patrolPoints.forEach((p,i)=>{const d=dist(vacuum,p);if(d<bestD){bestD=d;best=i}});return best;
  }

  function updateVacuum(dt){
    vacuum.spin+=dt*(vacuum.state==='chase'?9:4);
    vacuum.stateTimer-=dt;vacuum.pathTimer-=dt;
    const catDistance=dist(vacuum,cat);

    if(vacuum.state==='patrol'&&catDistance<4.25&&hasLineOfSight(vacuum,cat,.25)){
      vacuum.state='alert';vacuum.stateTimer=.62;vacuum.path=[];tone(520,.08,'square',.018);tone(520,.08,'square',.018,.15);
    }else if(vacuum.state==='alert'&&vacuum.stateTimer<=0){
      vacuum.state='chase';vacuum.stateTimer=5.2;vacuum.pathTimer=0;tone(180,.18,'sawtooth',.02);
    }else if(vacuum.state==='chase'&&(vacuum.stateTimer<=0||catDistance>7.3)){
      vacuum.state='cooldown';vacuum.stateTimer=1.6;vacuum.patrolIndex=nearestPatrolIndex();vacuum.pathTimer=0;
    }else if(vacuum.state==='cooldown'&&vacuum.stateTimer<=0){
      vacuum.state='patrol';vacuum.pathTimer=0;
    }

    if(vacuum.state==='alert')return;

    let target;
    if(vacuum.state==='chase')target={x:cat.x,y:cat.y};
    else target=patrolPoints[vacuum.patrolIndex];

    if(vacuum.state==='patrol'&&dist(vacuum,target)<.35){vacuum.patrolIndex=(vacuum.patrolIndex+1)%patrolPoints.length;target=patrolPoints[vacuum.patrolIndex];vacuum.pathTimer=0}
    if(vacuum.state==='cooldown'&&dist(vacuum,target)<.4){vacuum.state='patrol';vacuum.patrolIndex=(vacuum.patrolIndex+1)%patrolPoints.length;target=patrolPoints[vacuum.patrolIndex];vacuum.pathTimer=0}

    if(vacuum.pathTimer<=0||vacuum.path.length===0){
      vacuum.path=findPath(vacuum,target,vacuum.radius);vacuum.pathTimer=vacuum.state==='chase'?.34:.8;
    }

    while(vacuum.path.length&&dist(vacuum,vacuum.path[0])<.18)vacuum.path.shift();
    const waypoint=vacuum.path[0]||target;
    const direction=normalize(waypoint.x-vacuum.x,waypoint.y-vacuum.y,vacuum.facing);
    vacuum.facing=direction;
    const speed=vacuum.state==='chase'?2.12:vacuum.state==='cooldown'?1.5:1.18;
    vacuum.lastX=vacuum.x;vacuum.lastY=vacuum.y;moveEntity(vacuum,direction.x*speed*dt,direction.y*speed*dt);
    const moved=Math.hypot(vacuum.x-vacuum.lastX,vacuum.y-vacuum.lastY);
    vacuum.stuckTimer=moved<.001?vacuum.stuckTimer+dt:0;
    if(vacuum.stuckTimer>.45){vacuum.path=[];vacuum.pathTimer=0;vacuum.stuckTimer=0}

    if(cat.invulnerable<=0&&dist(vacuum,cat)<vacuum.radius+cat.radius+.05)hitCat();
  }

  function hitCat(){
    lives=Math.max(0,lives-1);combo=0;comboTimer=0;cat.invulnerable=1.45;shake=reducedMotion?2:13;
    const away=normalize(cat.x-vacuum.x,cat.y-vacuum.y,cat.facing);
    for(let i=0;i<7;i++)moveEntity(cat,away.x*.11,away.y*.11);
    vacuum.state='cooldown';vacuum.stateTimer=1.2;vacuum.patrolIndex=nearestPatrolIndex();vacuum.path=[];vacuum.pathTimer=0;
    for(let i=0;i<15;i++)spawnParticle(cat.x,cat.y,24,i%2?'#df7e2b':'#fff0d5');
    tone(120,.22,'sawtooth',.04);tone(85,.28,'square',.025,.05);showMessage('Ouch! Avoid the vacuum',1.5);
    if(lives<=0)endGame();
  }

  function findPath(start,target,radius){
    const cell=.5,cols=Math.floor(COLS/cell),rows=Math.floor(ROWS/cell);
    const toCell=p=>({x:clamp(Math.floor(p.x/cell),0,cols-1),y:clamp(Math.floor(p.y/cell),0,rows-1)});
    const centre=(x,y)=>({x:(x+.5)*cell,y:(y+.5)*cell});
    const blocked=(x,y)=>{const p=centre(x,y);return pointBlocked(p.x,p.y,radius)};
    function nearestFree(c){
      if(!blocked(c.x,c.y))return c;
      for(let ring=1;ring<7;ring++)for(let oy=-ring;oy<=ring;oy++)for(let ox=-ring;ox<=ring;ox++){
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
    while(open.length&&loops++<900){
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
    updateCat(dt);updateFlies(dt);updateVacuum(dt);updateEffects(dt);updateHud();
  }
