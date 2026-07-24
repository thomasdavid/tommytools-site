'use strict';

function buildHerbertSprites(){
  const sprites={};
  for(const direction of ['north','south','east','west']){
    const sprite=document.createElement('canvas');sprite.width=112;sprite.height=112;
    const g=sprite.getContext('2d');g.translate(56,62);
    if(direction==='east')paintHerbertSide(g,false);
    else if(direction==='west')paintHerbertSide(g,true);
    else if(direction==='south')paintHerbertFront(g);
    else paintHerbertBack(g);
    sprites[direction]=sprite;
  }
  return sprites;
}

function paintHerbertSide(g,mirror){
  g.save();if(mirror)g.scale(-1,1);
  g.lineCap='round';g.lineJoin='round';
  g.strokeStyle='#9d4717';g.lineWidth=10;g.beginPath();g.moveTo(-25,7);g.bezierCurveTo(-43,-10,-47,15,-33,25);g.stroke();
  g.strokeStyle='#f09a43';g.lineWidth=6;g.beginPath();g.moveTo(-25,7);g.bezierCurveTo(-41,-8,-43,14,-32,23);g.stroke();
  g.fillStyle='#d97824';g.beginPath();g.ellipse(-5,5,28,17,-.04,0,Math.PI*2);g.fill();
  g.fillStyle='#f4a654';g.beginPath();g.ellipse(1,10,18,9,0,0,Math.PI*2);g.fill();
  g.strokeStyle='#9d4717';g.lineWidth=4;for(const x of [-17,-8,1]){g.beginPath();g.moveTo(x,-8);g.lineTo(x+5,0);g.stroke()}
  g.fillStyle='#dc7d29';g.beginPath();g.arc(22,-6,16,0,Math.PI*2);g.fill();
  g.fillStyle='#9d4717';g.beginPath();g.moveTo(12,-18);g.lineTo(16,-34);g.lineTo(23,-19);g.fill();g.beginPath();g.moveTo(25,-20);g.lineTo(34,-31);g.lineTo(36,-14);g.fill();
  g.fillStyle='#f2a65c';g.beginPath();g.moveTo(15,-20);g.lineTo(17,-29);g.lineTo(21,-20);g.fill();g.beginPath();g.moveTo(28,-21);g.lineTo(33,-27);g.lineTo(33,-16);g.fill();
  g.fillStyle='#fff1d5';g.beginPath();g.ellipse(28,1,10,8,0,0,Math.PI*2);g.fill();
  g.fillStyle='#263a2f';g.beginPath();g.ellipse(20,-9,2.6,3.8,0,0,Math.PI*2);g.ellipse(29,-8,2.6,3.8,0,0,Math.PI*2);g.fill();
  g.fillStyle='#f0c65c';g.beginPath();g.ellipse(20,-9,1,2.6,0,0,Math.PI*2);g.ellipse(29,-8,1,2.6,0,0,Math.PI*2);g.fill();
  g.fillStyle='#7c3d2d';g.beginPath();g.moveTo(29,-1);g.lineTo(34,-1);g.lineTo(31.5,3);g.closePath();g.fill();
  g.strokeStyle='rgba(97,56,38,.75)';g.lineWidth=1.2;for(const side of [-1,1])for(let i=0;i<2;i++){g.beginPath();g.moveTo(31,2+i*3);g.lineTo(31+side*(14+i*2),i*3);g.stroke()}
  g.fillStyle='#f2a150';g.beginPath();g.ellipse(12,20,9,5,0,0,Math.PI*2);g.ellipse(-14,20,9,5,0,0,Math.PI*2);g.fill();
  g.restore();
}

function paintHerbertFront(g){
  g.lineCap='round';g.lineJoin='round';
  g.strokeStyle='#9d4717';g.lineWidth=9;g.beginPath();g.moveTo(-18,15);g.bezierCurveTo(-40,8,-38,30,-22,32);g.stroke();
  g.strokeStyle='#f09a43';g.lineWidth=5;g.beginPath();g.moveTo(-18,15);g.bezierCurveTo(-37,10,-34,28,-22,30);g.stroke();
  g.fillStyle='#d97824';g.beginPath();g.ellipse(0,10,22,27,0,0,Math.PI*2);g.fill();
  g.fillStyle='#fff1d5';g.beginPath();g.ellipse(0,14,13,19,0,0,Math.PI*2);g.fill();
  g.fillStyle='#dc7d29';g.beginPath();g.arc(0,-16,20,0,Math.PI*2);g.fill();
  g.fillStyle='#9d4717';g.beginPath();g.moveTo(-16,-27);g.lineTo(-12,-45);g.lineTo(-3,-29);g.fill();g.beginPath();g.moveTo(7,-30);g.lineTo(15,-45);g.lineTo(18,-25);g.fill();
  g.fillStyle='#f2a65c';g.beginPath();g.moveTo(-13,-29);g.lineTo(-11,-40);g.lineTo(-6,-30);g.fill();g.beginPath();g.moveTo(10,-31);g.lineTo(14,-40);g.lineTo(15,-27);g.fill();
  g.strokeStyle='#9d4717';g.lineWidth=4;for(const x of [-8,0,8]){g.beginPath();g.moveTo(x,-31);g.lineTo(x*.72,-22);g.stroke()}
  g.fillStyle='#263a2f';g.beginPath();g.ellipse(-7,-18,3,4.3,0,0,Math.PI*2);g.ellipse(7,-18,3,4.3,0,0,Math.PI*2);g.fill();
  g.fillStyle='#f0c65c';g.beginPath();g.ellipse(-7,-18,1.1,3,0,0,Math.PI*2);g.ellipse(7,-18,1.1,3,0,0,Math.PI*2);g.fill();
  g.fillStyle='#fff1d5';g.beginPath();g.ellipse(0,-7,12,9,0,0,Math.PI*2);g.fill();
  g.fillStyle='#7c3d2d';g.beginPath();g.moveTo(-3,-9);g.lineTo(3,-9);g.lineTo(0,-5);g.closePath();g.fill();
  g.strokeStyle='rgba(97,56,38,.75)';g.lineWidth=1.2;for(const side of [-1,1])for(let i=0;i<2;i++){g.beginPath();g.moveTo(side*3,-4+i*3);g.lineTo(side*(18+i*2),-6+i*4);g.stroke()}
  g.fillStyle='#f2a150';g.beginPath();g.ellipse(-10,32,9,5,0,0,Math.PI*2);g.ellipse(10,32,9,5,0,0,Math.PI*2);g.fill();
}

function paintHerbertBack(g){
  g.lineCap='round';g.lineJoin='round';
  g.strokeStyle='#9d4717';g.lineWidth=10;g.beginPath();g.moveTo(18,15);g.bezierCurveTo(41,4,42,28,24,34);g.stroke();
  g.strokeStyle='#f09a43';g.lineWidth=6;g.beginPath();g.moveTo(18,15);g.bezierCurveTo(38,6,38,27,24,31);g.stroke();
  g.fillStyle='#d97824';g.beginPath();g.ellipse(0,11,23,28,0,0,Math.PI*2);g.fill();
  g.strokeStyle='#9d4717';g.lineWidth=5;for(let y=-1;y<20;y+=9){g.beginPath();g.moveTo(-12,y);g.quadraticCurveTo(0,y+7,12,y);g.stroke()}
  g.fillStyle='#dc7d29';g.beginPath();g.arc(0,-17,19,0,Math.PI*2);g.fill();
  g.fillStyle='#9d4717';g.beginPath();g.moveTo(-16,-28);g.lineTo(-12,-45);g.lineTo(-3,-30);g.fill();g.beginPath();g.moveTo(6,-30);g.lineTo(14,-45);g.lineTo(18,-26);g.fill();
  g.fillStyle='#f2a65c';g.beginPath();g.moveTo(-13,-30);g.lineTo(-11,-40);g.lineTo(-6,-31);g.fill();g.beginPath();g.moveTo(10,-31);g.lineTo(14,-40);g.lineTo(15,-28);g.fill();
  g.strokeStyle='#9d4717';g.lineWidth=4;for(const x of [-8,0,8]){g.beginPath();g.moveTo(x,-30);g.lineTo(x*.7,-21);g.stroke()}
  g.fillStyle='#f2a150';g.beginPath();g.ellipse(-10,33,9,5,0,0,Math.PI*2);g.ellipse(10,33,9,5,0,0,Math.PI*2);g.fill();
}

function projectDirection(direction){
  const a=iso(direction.x,direction.y),b=iso(0,0);return normalize(a.x-b.x,a.y-b.y,{x:1,y:0});
}

function herbertDirection(){
  const projected=projectDirection(cat.facing);
  if(Math.abs(projected.x)>Math.abs(projected.y))return projected.x>=0?'east':'west';
  return projected.y>=0?'south':'north';
}

function drawCat(){
  if(!herbertSprites)herbertSprites=buildHerbertSprites();
  const ground=iso(cat.x,cat.y,0),p=iso(cat.x,cat.y,cat.jumpHeight);
  const blink=cat.invulnerable>0&&Math.floor(cat.invulnerable*12)%2===0;
  ctx.save();
  ctx.globalAlpha=blink?.38:1;
  const shadowScale=cat.jumpTimer>0?clamp(1-cat.jumpHeight/110,.45,1):1;
  ctx.fillStyle='rgba(29,25,20,.25)';ctx.beginPath();ctx.ellipse(ground.x,ground.y+5,22*shadowScale,8*shadowScale,0,0,Math.PI*2);ctx.fill();
  ctx.translate(p.x,p.y+2);
  const bob=cat.jumpTimer>0?0:Math.sin(cat.walkPhase)*1.7;
  const pounce=cat.pounceTimer>0?1.18:1;
  ctx.translate(0,bob*.35);
  ctx.scale(pounce,1/pounce*.99);
  const sprite=herbertSprites[herbertDirection()];
  ctx.drawImage(sprite,-45,-73,90,90);
  ctx.restore();
}

function drawVacuum(){
  if(!vacuum.active)return;
  const p=iso(vacuum.x,vacuum.y,0),projected=projectDirection(vacuum.facing),angle=Math.atan2(projected.y,projected.x);
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle='rgba(25,25,25,.26)';ctx.beginPath();ctx.ellipse(0,7,23,9,0,0,Math.PI*2);ctx.fill();
  ctx.rotate(angle);
  if(vacuum.state==='alert'||vacuum.state==='chase'){
    ctx.save();ctx.rotate(-angle);ctx.strokeStyle=vacuum.state==='chase'?'rgba(255,69,57,.68)':'rgba(255,185,71,.58)';ctx.lineWidth=3;ctx.setLineDash([7,6]);ctx.beginPath();ctx.ellipse(0,0,37,18,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  const body=ctx.createLinearGradient(-22,-12,22,12);body.addColorStop(0,'#5c6870');body.addColorStop(.55,'#2e3940');body.addColorStop(1,'#172329');ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,0,24,14,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#101a1f';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#707d84';ctx.beginPath();ctx.ellipse(-4,-3,13,6.5,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#172127';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-4,-3,7.5,0,Math.PI*2);ctx.stroke();
  ctx.save();ctx.translate(-4,-3);ctx.rotate(vacuum.spin);ctx.strokeStyle='#b8c0c3';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.rotate(Math.PI*2/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(7,0);ctx.stroke()}ctx.restore();
  ctx.fillStyle=vacuum.state==='chase'?'#ff493d':vacuum.state==='alert'?'#ffbc47':'#79d4a0';ctx.beginPath();ctx.arc(11,-5,4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#dce4e5';ctx.font='900 7px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('VAC',2,5);
  ctx.restore();
}

function drawFly(fly){
  if(!fly.alive)return;
  const ground=iso(fly.x,fly.y,0),p=iso(fly.x,fly.y,fly.z);
  ctx.save();ctx.fillStyle='rgba(25,20,15,.2)';ctx.beginPath();ctx.ellipse(ground.x,ground.y+1,6,2.5,0,0,Math.PI*2);ctx.fill();
  ctx.translate(p.x,p.y);const wing=Math.sin(fly.phase)*.52;
  ctx.fillStyle='rgba(235,248,250,.78)';ctx.beginPath();ctx.ellipse(-5,-3,7,3,-.55-wing,0,Math.PI*2);ctx.ellipse(5,-3,7,3,.55+wing,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#211b17';ctx.beginPath();ctx.ellipse(0,0,5,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#5b4532';ctx.beginPath();ctx.arc(0,-5,4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d5b25d';ctx.fillRect(-4,-1,8,2);ctx.restore();
}

function drawTreat(treat){
  if(!treat.found||treat.reveal<=0)return;
  const life=clamp(treat.reveal/1.45,0,1),p=iso(treat.x,treat.y,12+Math.sin(treat.spin)*4);
  ctx.save();ctx.globalAlpha=Math.min(1,life*1.8);ctx.translate(p.x,p.y);ctx.rotate(Math.sin(treat.spin)*.12);
  ctx.fillStyle='#d77b32';ctx.beginPath();ctx.ellipse(0,0,13,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f5c37b';ctx.beginPath();ctx.ellipse(-3,-2,7,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7f3d1d';ctx.beginPath();ctx.arc(5,-1,1.5,0,Math.PI*2);ctx.arc(1,2,1.2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=`rgba(255,230,126,${life})`;ctx.lineWidth=2;for(let i=0;i<4;i++){const a=treat.spin+i*Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(a)*17,Math.sin(a)*10);ctx.lineTo(Math.cos(a)*23,Math.sin(a)*14);ctx.stroke()}
  ctx.restore();
}

function drawEffects(){
  for(const particle of particles){
    const p=iso(particle.x,particle.y,Math.max(0,particle.z));const alpha=clamp(particle.life/particle.maxLife,0,1);
    ctx.globalAlpha=alpha;ctx.fillStyle=particle.colour;ctx.beginPath();ctx.arc(p.x,p.y,particle.size*alpha,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  for(const floater of floaters){ctx.globalAlpha=clamp(floater.life/floater.maxLife,0,1);ctx.fillStyle=floater.colour;ctx.font='950 20px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='rgba(45,28,17,.55)';ctx.lineWidth=4;ctx.strokeText(floater.text,floater.x,floater.y);ctx.fillText(floater.text,floater.x,floater.y)}ctx.globalAlpha=1;
}

function drawWorld(){
  drawFloor();drawWalls();
  const drawables=[];
  for(const wall of wallRects)drawables.push({depth:wall.x+wall.w+wall.y+wall.h,draw:()=>drawInteriorWall(wall)});
  for(const item of obstacles)drawables.push({depth:item.x+item.w+item.y+item.h,draw:()=>drawFurniture(item)});
  for(const treat of treats)if(treat.found&&treat.reveal>0)drawables.push({depth:treat.x+treat.y+.03,draw:()=>drawTreat(treat)});
  for(const fly of flies)if(fly.alive)drawables.push({depth:fly.x+fly.y+.05,draw:()=>drawFly(fly)});
  if(vacuum.active)drawables.push({depth:vacuum.x+vacuum.y,draw:drawVacuum});
  const surface=surfaceById(cat.surfaceId);
  const catDepth=surface?surface.x+surface.w+surface.y+surface.h+.3:cat.x+cat.y+.02;
  drawables.push({depth:catDepth,draw:drawCat});
  drawables.sort((a,b)=>a.depth-b.depth);drawables.forEach(item=>item.draw());
  drawEffects();

  if(state==='playing'&&vacuum.active&&vacuum.state==='chase'&&dist(vacuum,cat)<2.4&&cat.jumpCooldown<=0&&!cat.surfaceId){
    const p=iso(cat.x,cat.y,66+cat.jumpHeight);ctx.save();ctx.globalAlpha=.72+.22*Math.sin(elapsed*7);ctx.fillStyle='#fff4c4';ctx.font='900 12px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('JUMP!',p.x,p.y);ctx.restore();
  }else if(state==='playing'&&cat.pounceCooldown<=0&&flies.some(f=>f.alive&&dist(f,cat)<1.3)){
    const p=iso(cat.x,cat.y,58+cat.jumpHeight);ctx.save();ctx.globalAlpha=.72+.22*Math.sin(elapsed*6);ctx.fillStyle='#fff4c4';ctx.font='900 12px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('POUNCE!',p.x,p.y);ctx.restore();
  }

  const vignette=ctx.createRadialGradient(VIEW_W/2,VIEW_H/2,230,VIEW_W/2,VIEW_H/2,700);vignette.addColorStop(.55,'rgba(4,19,27,0)');vignette.addColorStop(1,'rgba(4,19,27,.26)');ctx.fillStyle=vignette;ctx.fillRect(0,0,VIEW_W,VIEW_H);
}

function render(){
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  ctx.save();
  if(shake>0&&!reducedMotion)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  drawWorld();ctx.restore();
}

function loop(now){
  const dt=Math.min(.033,(now-lastFrame)/1000||0);lastFrame=now;
  if(!entitiesReady)resetGame();update(dt);render();requestAnimationFrame(loop);
}

function setJoystickFromEvent(event){
  const rect=joystick.getBoundingClientRect();const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  let dx=event.clientX-cx,dy=event.clientY-cy;const max=rect.width*.31,length=Math.hypot(dx,dy);
  if(length>max){dx=dx/length*max;dy=dy/length*max}
  touchVector={x:dx/max,y:dy/max};joystickKnob.style.transform=`translate(${dx}px,${dy}px)`;
}

function releaseJoystick(){joystickPointer=null;touchVector={x:0,y:0};joystickKnob.style.transform='translate(0,0)'}

overlayButton.addEventListener('click',()=>{
  if(overlayAction==='start'||overlayAction==='restart')startGame();else if(overlayAction==='resume')togglePause();
});

soundButton.addEventListener('click',()=>{
  soundOn=!soundOn;soundButton.textContent=soundOn?'♪':'×';soundButton.setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');if(soundOn){ensureAudio();tone(523,.08,'sine',.025)}
});
pauseButton.addEventListener('click',togglePause);
fullscreenButton.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await gameCard.requestFullscreen()}catch{}
});
document.addEventListener('fullscreenchange',()=>{fullscreenButton.textContent=document.fullscreenElement?'↙':'⛶';fullscreenButton.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen')});

joystick.addEventListener('pointerdown',event=>{joystickPointer=event.pointerId;joystick.setPointerCapture(event.pointerId);setJoystickFromEvent(event)});
joystick.addEventListener('pointermove',event=>{if(event.pointerId===joystickPointer)setJoystickFromEvent(event)});
joystick.addEventListener('pointerup',event=>{if(event.pointerId===joystickPointer)releaseJoystick()});
joystick.addEventListener('pointercancel',releaseJoystick);
pounceButton.addEventListener('pointerdown',event=>{event.preventDefault();triggerPounce()});
jumpButton.addEventListener('pointerdown',event=>{event.preventDefault();triggerJump()});

window.addEventListener('keydown',event=>{
  const controlled=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space','KeyJ','ShiftLeft','ShiftRight','KeyP','Escape'];
  if(controlled.includes(event.code))event.preventDefault();
  keys.add(event.code);
  if(!event.repeat&&event.code==='Space'){
    if(state==='menu'||state==='gameover')startGame();else if(state==='paused')togglePause();else triggerPounce();
  }
  if(!event.repeat&&(event.code==='KeyJ'||event.code==='ShiftLeft'||event.code==='ShiftRight')&&state==='playing')triggerJump();
  if(!event.repeat&&(event.code==='KeyP'||event.code==='Escape')&&(state==='playing'||state==='paused'))togglePause();
},{passive:false});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>{keys.clear();releaseJoystick();if(state==='playing')togglePause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')togglePause()});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));

herbertSprites=buildHerbertSprites();renderLeague();resetGame();showMenu();requestAnimationFrame(loop);
