'use strict';

  function drawCat(){
    const p=iso(cat.x,cat.y,0),projected=projectDirection(cat.facing),angle=Math.atan2(projected.y,projected.x);
    const blink=cat.invulnerable>0&&Math.floor(cat.invulnerable*12)%2===0;
    if(blink)ctx.globalAlpha=.38;
    ctx.save();ctx.translate(p.x,p.y+2);
    ctx.fillStyle='rgba(29,25,20,.25)';ctx.beginPath();ctx.ellipse(0,6,23,9,0,0,Math.PI*2);ctx.fill();
    ctx.rotate(angle);
    const leap=cat.pounceTimer>0?1.22:1;const bob=Math.sin(cat.walkPhase)*2;
    ctx.translate(0,bob*.3);ctx.scale(leap,1/leap*.98);

    ctx.strokeStyle='#9d4717';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-18,0);ctx.bezierCurveTo(-32,-13,-37,11,-25,17);ctx.stroke();
    ctx.strokeStyle='#f09a43';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-18,0);ctx.bezierCurveTo(-31,-11,-34,10,-24,15);ctx.stroke();

    ctx.fillStyle='#d97824';ctx.beginPath();ctx.ellipse(-2,0,23,14,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f4a654';ctx.beginPath();ctx.ellipse(2,4,15,8,0,0,Math.PI*2);ctx.fill();

    ctx.strokeStyle='#9d4717';ctx.lineWidth=3;for(const stripeX of [-12,-4,4]){ctx.beginPath();ctx.moveTo(stripeX,-10);ctx.lineTo(stripeX+4,-3);ctx.stroke()}

    ctx.fillStyle='#dc7d29';ctx.beginPath();ctx.arc(18,-1,13,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#9d4717';ctx.beginPath();ctx.moveTo(11,-10);ctx.lineTo(14,-23);ctx.lineTo(21,-11);ctx.fill();ctx.beginPath();ctx.moveTo(22,-11);ctx.lineTo(28,-21);ctx.lineTo(30,-7);ctx.fill();
    ctx.fillStyle='#f2a65c';ctx.beginPath();ctx.moveTo(13,-11);ctx.lineTo(15,-19);ctx.lineTo(19,-11);ctx.fill();ctx.beginPath();ctx.moveTo(24,-11);ctx.lineTo(27,-18);ctx.lineTo(28,-8);ctx.fill();
    ctx.fillStyle='#fff1d5';ctx.beginPath();ctx.ellipse(23,4,8,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#263a2f';ctx.beginPath();ctx.ellipse(16,-3,2.3,3.2,0,0,Math.PI*2);ctx.ellipse(24,-3,2.3,3.2,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f0c65c';ctx.beginPath();ctx.ellipse(16,-3,1,2.2,0,0,Math.PI*2);ctx.ellipse(24,-3,1,2.2,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#7c3d2d';ctx.beginPath();ctx.moveTo(22,2);ctx.lineTo(26,2);ctx.lineTo(24,5);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(97,56,38,.7)';ctx.lineWidth=1;for(const side of [-1,1]){for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(24,4+i*2);ctx.lineTo(24+side*(12+i*2),2+i*3);ctx.stroke()}}

    const pawOffset=Math.sin(cat.walkPhase)*3;ctx.fillStyle='#f2a150';ctx.beginPath();ctx.ellipse(9,11+pawOffset*.25,7,4,0,0,Math.PI*2);ctx.ellipse(-10,11-pawOffset*.25,7,4,0,0,Math.PI*2);ctx.fill();
    ctx.restore();ctx.globalAlpha=1;
  }

  function projectDirection(direction){
    const a=iso(direction.x,direction.y),b=iso(0,0);return normalize(a.x-b.x,a.y-b.y,{x:1,y:0});
  }

  function drawVacuum(){
    const p=iso(vacuum.x,vacuum.y,0),projected=projectDirection(vacuum.facing),angle=Math.atan2(projected.y,projected.x);
    ctx.save();ctx.translate(p.x,p.y);
    ctx.fillStyle='rgba(25,25,25,.26)';ctx.beginPath();ctx.ellipse(0,7,25,10,0,0,Math.PI*2);ctx.fill();
    ctx.rotate(angle);
    if(vacuum.state==='alert'||vacuum.state==='chase'){
      ctx.save();ctx.rotate(-angle);ctx.strokeStyle=vacuum.state==='chase'?'rgba(255,69,57,.65)':'rgba(255,185,71,.55)';ctx.lineWidth=3;ctx.setLineDash([7,6]);ctx.beginPath();ctx.ellipse(0,0,39,19,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    const body=ctx.createLinearGradient(-22,-12,22,12);body.addColorStop(0,'#5c6870');body.addColorStop(.55,'#2e3940');body.addColorStop(1,'#172329');ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,0,25,15,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#101a1f';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#707d84';ctx.beginPath();ctx.ellipse(-4,-3,14,7,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#172127';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-4,-3,8,0,Math.PI*2);ctx.stroke();
    ctx.save();ctx.translate(-4,-3);ctx.rotate(vacuum.spin);ctx.strokeStyle='#b8c0c3';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.rotate(Math.PI*2/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(7,0);ctx.stroke()}ctx.restore();
    ctx.fillStyle=vacuum.state==='chase'?'#ff493d':vacuum.state==='alert'?'#ffbc47':'#79d4a0';ctx.beginPath();ctx.arc(12,-5,4.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#dce4e5';ctx.font='900 7px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('VAC',2,5);
    ctx.restore();
  }

  function drawFly(fly){
    if(!fly.alive)return;
    const ground=iso(fly.x,fly.y,0),p=iso(fly.x,fly.y,fly.z);
    ctx.save();ctx.fillStyle='rgba(25,20,15,.2)';ctx.beginPath();ctx.ellipse(ground.x,ground.y+1,7,3,0,0,Math.PI*2);ctx.fill();
    ctx.translate(p.x,p.y);const wing=Math.sin(fly.phase)*.45;
    ctx.fillStyle='rgba(235,248,250,.74)';ctx.beginPath();ctx.ellipse(-5,-3,7,3,-.55-wing,0,Math.PI*2);ctx.ellipse(5,-3,7,3,.55+wing,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#211b17';ctx.beginPath();ctx.ellipse(0,0,5,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#5b4532';ctx.beginPath();ctx.arc(0,-5,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d5b25d';ctx.fillRect(-4,-1,8,2);
    ctx.restore();
  }

  function drawEffects(){
    for(const particle of particles){
      const p=iso(particle.x,particle.y,Math.max(0,particle.z));const alpha=clamp(particle.life/particle.maxLife,0,1);
      ctx.globalAlpha=alpha;ctx.fillStyle=particle.colour;ctx.beginPath();ctx.arc(p.x,p.y,particle.size*alpha,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    for(const floater of floaters){ctx.globalAlpha=clamp(floater.life/floater.maxLife,0,1);ctx.fillStyle=floater.colour;ctx.font='950 22px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.strokeStyle='rgba(45,28,17,.55)';ctx.lineWidth=4;ctx.strokeText(floater.text,floater.x,floater.y);ctx.fillText(floater.text,floater.x,floater.y)}ctx.globalAlpha=1;
  }

  function drawWorld(){
    drawFloor();drawWalls();
    const drawables=[];
    for(const item of obstacles)drawables.push({depth:item.x+item.w+item.y+item.h,draw:()=>drawFurniture(item)});
    for(const fly of flies)if(fly.alive)drawables.push({depth:fly.x+fly.y+.05,draw:()=>drawFly(fly)});
    drawables.push({depth:vacuum.x+vacuum.y,draw:drawVacuum});
    drawables.push({depth:cat.x+cat.y+.02,draw:drawCat});
    drawables.sort((a,b)=>a.depth-b.depth);drawables.forEach(item=>item.draw());
    drawEffects();

    if(state==='playing'&&cat.pounceCooldown<=0&&flies.some(f=>f.alive&&dist(f,cat)<1.3)){
      const p=iso(cat.x,cat.y,54);ctx.save();ctx.globalAlpha=.72+.22*Math.sin(elapsed*6);ctx.fillStyle='#fff4c4';ctx.font='900 12px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('POUNCE!',p.x,p.y);ctx.restore();
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

  window.addEventListener('keydown',event=>{
    const controlled=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space','KeyP','Escape'];
    if(controlled.includes(event.code))event.preventDefault();
    keys.add(event.code);
    if(!event.repeat&&event.code==='Space'){
      if(state==='menu'||state==='gameover')startGame();else if(state==='paused')togglePause();else triggerPounce();
    }
    if(!event.repeat&&(event.code==='KeyP'||event.code==='Escape')&&(state==='playing'||state==='paused'))togglePause();
  },{passive:false});
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>{keys.clear();releaseJoystick();if(state==='playing')togglePause()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')togglePause()});
  canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));

  pageBest.textContent=bestScore.toLocaleString();resetGame();showMenu();requestAnimationFrame(loop);
