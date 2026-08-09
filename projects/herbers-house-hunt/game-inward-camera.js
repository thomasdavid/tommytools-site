'use strict';

// Expanded inward-facing camera. The architectural floor plan remains the
// source of truth, but the playable world is enlarged and furniture footprints
// are reduced so Herbert has substantially more room to run between objects.
const INWARD_WORLD_SCALE = 1.85;
const INWARD_FURNITURE_SCALE = 0.76;
const INWARD_PIXELS_PER_UNIT = 78;
const INWARD_DEPTH_SCALE = 0.70;
const INWARD_HEIGHT_SCALE = 0.78;
const INWARD_WORLD_W = 19 * INWARD_WORLD_SCALE;
const INWARD_WORLD_H = 14 * INWARD_WORLD_SCALE;
const INWARD_WALL_FADE_DISTANCE = 1.55 * INWARD_WORLD_SCALE;

const inwardCamera = {
  x: 7.62 * INWARD_WORLD_SCALE,
  y: 9.36 * INWARD_WORLD_SCALE,
  targetX: 7.62 * INWARD_WORLD_SCALE,
  targetY: 9.36 * INWARD_WORLD_SCALE
};

function inwardScalePoint(point){
  point.x *= INWARD_WORLD_SCALE;
  point.y *= INWARD_WORLD_SCALE;
}

function inwardScaleDoor(door){
  door.at *= INWARD_WORLD_SCALE;
  door.from *= INWARD_WORLD_SCALE;
  door.to *= INWARD_WORLD_SCALE;
}

function inwardScaleFurniture(item){
  const originalX=item.x,originalY=item.y,originalW=item.w,originalH=item.h;
  const centreX=(originalX+originalW*.5)*INWARD_WORLD_SCALE;
  const centreY=(originalY+originalH*.5)*INWARD_WORLD_SCALE;
  let sizeScale=INWARD_FURNITURE_SCALE;
  if(['wallTv','kitchenOpen','shower'].includes(item.type))sizeScale=.90;
  if(['kitchenBack','kitchenReturn'].includes(item.type))sizeScale=.84;
  if(['plant','bin','chair'].includes(item.type))sizeScale=.82;
  item.w=originalW*INWARD_WORLD_SCALE*sizeScale;
  item.h=originalH*INWARD_WORLD_SCALE*sizeScale;
  item.x=centreX-item.w*.5;
  item.y=centreY-item.h*.5;
  item.height=Math.round(item.height*1.04);
}

if(!globalThis.__herbertInwardCameraScaled){
  for(const points of Object.values(PLAN_FLOORS))for(const point of points)inwardScalePoint(point);
  for(const door of Object.values(PLAN_DOORS))inwardScaleDoor(door);
  for(const wall of wallRects){wall.x*=INWARD_WORLD_SCALE;wall.y*=INWARD_WORLD_SCALE;wall.w*=INWARD_WORLD_SCALE;wall.h*=INWARD_WORLD_SCALE}
  for(const item of obstacles)inwardScaleFurniture(item);
  for(const point of vacuumEntrances)inwardScalePoint(point);
  for(const point of treatSeeds)inwardScalePoint(point);
  globalThis.__herbertInwardCameraScaled=true;
}

// Orthographic inward-facing projection: horizontal room axes stay horizontal
// and vertical on screen rather than forming an isometric diamond.
iso = function(x,y,z=0){
  const depth=y-inwardCamera.y;
  const subtlePerspective=1+clamp(depth/INWARD_WORLD_H,-.12,.12)*.12;
  return {
    x:VIEW_W*.5+(x-inwardCamera.x)*INWARD_PIXELS_PER_UNIT*subtlePerspective,
    y:VIEW_H*.56+depth*INWARD_PIXELS_PER_UNIT*INWARD_DEPTH_SCALE-z*INWARD_HEIGHT_SCALE
  };
};

drawIsoBox = function(rect,height,palette){
  const base=rectCorners(rect,0),top=rectCorners(rect,height);
  ctx.save();
  polygon(base,'rgba(12,18,22,.12)',null);
  polygon([base[3],base[2],top[2],top[3]],palette.y,palette.line,.8);
  polygon([base[1],base[2],top[2],top[1]],palette.x,palette.line,.8);
  polygon(top,palette.top,palette.line,1);
  ctx.restore();
};

function inwardRoomColour(name){
  const colours={
    living:'#d8d1c1',corridor:'#d7d0c2',smallBedroom:'#cdbda8',masterBedroom:'#c7b69e',
    bathroom:'#59656c',ensuite:'#526169',balcony:'#8f6749'
  };
  return colours[name]||'#d8d1c1';
}

function inwardTracePolygon(points){
  ctx.beginPath();
  const first=iso(points[0].x,points[0].y,0);
  ctx.moveTo(first.x,first.y);
  for(let i=1;i<points.length;i++){
    const p=iso(points[i].x,points[i].y,0);ctx.lineTo(p.x,p.y);
  }
  ctx.closePath();
}

function inwardDrawRoomFloor(name,points){
  ctx.save();
  inwardTracePolygon(points);
  ctx.fillStyle=inwardRoomColour(name);ctx.fill();
  ctx.clip();
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
  const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  const tile=1.25*INWARD_WORLD_SCALE;
  ctx.strokeStyle=name==='bathroom'||name==='ensuite'?'rgba(224,236,238,.14)':'rgba(96,82,64,.16)';
  ctx.lineWidth=1;
  for(let x=Math.floor(minX/tile)*tile;x<=maxX;x+=tile){
    const a=iso(x,minY,1),b=iso(x,maxY,1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(let y=Math.floor(minY/tile)*tile;y<=maxY;y+=tile){
    const a=iso(minX,y,1),b=iso(maxX,y,1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  if(name==='balcony'){
    ctx.strokeStyle='rgba(63,42,29,.26)';ctx.lineWidth=1.2;
    for(let y=minY;y<=maxY;y+=.48*INWARD_WORLD_SCALE){const a=iso(minX,y,2),b=iso(maxX,y,2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
  }
  ctx.restore();
  ctx.save();inwardTracePolygon(points);ctx.strokeStyle='rgba(60,49,39,.42)';ctx.lineWidth=1.4;ctx.stroke();ctx.restore();
}

drawFloor = function(){
  const bg=ctx.createLinearGradient(0,0,0,VIEW_H);bg.addColorStop(0,'#23303b');bg.addColorStop(1,'#111923');ctx.fillStyle=bg;ctx.fillRect(-20,-20,VIEW_W+40,VIEW_H+40);
  for(const name of PLAN_ROOM_ORDER)inwardDrawRoomFloor(name,PLAN_FLOORS[name]);
  drawFloorDetails();
};

drawFloorDetails = function(){
  const s=INWARD_WORLD_SCALE;
  drawRug({x:3.15*s,y:3.25*s,w:3.22*s,h:2.32*s},'#a99a57','#d6c987');
  ctx.save();ctx.globalAlpha=.13;
  for(let i=0;i<22;i++){
    const p=iso((.72+(i%6)*1.15)*s,(1.0+Math.floor(i/6)*1.85)*s,2);
    ctx.fillStyle='#fff8dc';ctx.beginPath();ctx.ellipse(p.x,p.y,8,2.1,-.16,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  const cable=[[3.7,6.5],[4.7,7],[5.9,7.55],[7.1,8.1]].map(([x,y])=>iso(x*s,y*s,3));
  ctx.strokeStyle='rgba(23,24,25,.62)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cable[0].x,cable[0].y);for(let i=1;i<cable.length;i++)ctx.lineTo(cable[i].x,cable[i].y);ctx.stroke();
  for(const [x,y,fill] of [[1.22,8.52,'#b83f34'],[1.60,8.54,'#d4d5d0']]){
    const p=iso(x*s,y*s,4);ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(p.x,p.y,9,4.2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#45352c';ctx.beginPath();ctx.ellipse(p.x,p.y,5,2.2,0,0,Math.PI*2);ctx.fill();
  }
  const labels=[['LIVING + KITCHEN',3.8,9.25],['CORRIDOR',10.35,9.72],['SMALL BEDROOM',10.98,4.18],['MASTER BEDROOM',16.52,3.48],['BATHROOM',13.47,13.63],['ENSUITE',17.08,11.72],['BALCONY',13.2,2.3]];
  for(const [text,x,y] of labels)drawRoomLabel(text,x*s,y*s);
};

function inwardDistanceToRect(x,y,rect){
  const nx=clamp(x,rect.x,rect.x+rect.w),ny=clamp(y,rect.y,rect.y+rect.h);
  return Math.hypot(x-nx,y-ny);
}

function inwardWallAlpha(rect){
  const distance=inwardDistanceToRect(cat.x,cat.y,rect);
  const wallMidY=rect.y+rect.h*.5;
  const xOverlap=cat.x>=rect.x-1.05*INWARD_WORLD_SCALE&&cat.x<=rect.x+rect.w+1.05*INWARD_WORLD_SCALE;
  const nearerToCamera=wallMidY>=cat.y-.25*INWARD_WORLD_SCALE;
  if(distance<INWARD_WALL_FADE_DISTANCE&&xOverlap&&nearerToCamera)return .08+distance/INWARD_WALL_FADE_DISTANCE*.30;
  if(distance<INWARD_WALL_FADE_DISTANCE*.72)return .38+distance/(INWARD_WALL_FADE_DISTANCE*.72)*.42;
  return 1;
}

function inwardWallRect(id,x,y,w,h,height=72){return{id,x,y,w,h,height}}
const inwardOuterWalls=[
  inwardWallRect('outer-left',-.10*INWARD_WORLD_SCALE,0,.16*INWARD_WORLD_SCALE,10.76*INWARD_WORLD_SCALE),
  inwardWallRect('outer-window',0,-.10*INWARD_WORLD_SCALE,8.38*INWARD_WORLD_SCALE,.16*INWARD_WORLD_SCALE),
  inwardWallRect('outer-living-bottom',0,10.68*INWARD_WORLD_SCALE,6.72*INWARD_WORLD_SCALE,.16*INWARD_WORLD_SCALE),
  inwardWallRect('outer-bath-left',11.76*INWARD_WORLD_SCALE,10.76*INWARD_WORLD_SCALE,.16*INWARD_WORLD_SCALE,3.24*INWARD_WORLD_SCALE),
  inwardWallRect('outer-bath-bottom',11.84*INWARD_WORLD_SCALE,13.92*INWARD_WORLD_SCALE,3.28*INWARD_WORLD_SCALE,.16*INWARD_WORLD_SCALE),
  inwardWallRect('outer-bath-right',15.04*INWARD_WORLD_SCALE,12.02*INWARD_WORLD_SCALE,.16*INWARD_WORLD_SCALE,1.98*INWARD_WORLD_SCALE),
  inwardWallRect('outer-ensuite-bottom',15.12*INWARD_WORLD_SCALE,11.94*INWARD_WORLD_SCALE,3.88*INWARD_WORLD_SCALE,.16*INWARD_WORLD_SCALE),
  inwardWallRect('outer-right',18.92*INWARD_WORLD_SCALE,2.82*INWARD_WORLD_SCALE,.16*INWARD_WORLD_SCALE,9.20*INWARD_WORLD_SCALE)
];

function inwardDrawWall(rect){
  ctx.save();ctx.globalAlpha=inwardWallAlpha(rect);drawIsoBox(rect,rect.height||70,palettes.wall);ctx.restore();
}

function inwardSegmentDistance(point,a,b){
  const vx=b.x-a.x,vy=b.y-a.y,wx=point.x-a.x,wy=point.y-a.y;
  const t=clamp((wx*vx+wy*vy)/(vx*vx+vy*vy||1),0,1);
  return Math.hypot(point.x-(a.x+t*vx),point.y-(a.y+t*vy));
}

function inwardDrawSlopedWall(a,b,height=56,glass=false){
  const distance=inwardSegmentDistance(cat,a,b),midY=(a.y+b.y)*.5;
  let alpha=1;
  if(distance<INWARD_WALL_FADE_DISTANCE&&midY>=cat.y-.25*INWARD_WORLD_SCALE)alpha=.10+distance/INWARD_WALL_FADE_DISTANCE*.30;
  const p1=iso(a.x,a.y,0),p2=iso(b.x,b.y,0),t1=iso(a.x,a.y,height),t2=iso(b.x,b.y,height);
  ctx.save();ctx.globalAlpha=alpha;
  polygon([p1,p2,t2,t1],glass?'rgba(129,175,186,.30)':'#c5b9aa',glass?'#687c81':'#8d8070',2);
  ctx.strokeStyle=glass?'#6b7f84':'#f0e9dd';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(t1.x,t1.y);ctx.lineTo(t2.x,t2.y);ctx.stroke();
  if(glass){for(let i=1;i<7;i++){const t=i/7,base={x:lerp(p1.x,p2.x,t),y:lerp(p1.y,p2.y,t)},top={x:lerp(t1.x,t2.x,t),y:lerp(t1.y,t2.y,t)};ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(top.x,top.y);ctx.stroke()}}
  ctx.restore();
}

function inwardDrawWindows(){
  const s=INWARD_WORLD_SCALE;
  for(const [start,length] of [[.20,2.46],[2.76,2.46],[5.32,2.72]])drawWindow(start*s,-.12*s,length*s,'north',false);
  inwardDrawSlopedWall({x:8.38*s,y:0},{x:19*s,y:2.82*s},30,true);
}

function inwardDrawDoorLeaves(){
  const leaves=[
    [PLAN_DOORS.livingBalcony.at,(PLAN_DOORS.livingBalcony.from+PLAN_DOORS.livingBalcony.to)*.5,'vertical',1],
    [(PLAN_DOORS.balconyMaster.from+PLAN_DOORS.balconyMaster.to)*.5,PLAN_DOORS.balconyMaster.at,'horizontal',-1],
    [(PLAN_DOORS.smallBedroom.from+PLAN_DOORS.smallBedroom.to)*.5,PLAN_DOORS.smallBedroom.at,'horizontal',1],
    [PLAN_DOORS.masterBedroom.at,(PLAN_DOORS.masterBedroom.from+PLAN_DOORS.masterBedroom.to)*.5,'vertical',-1],
    [(PLAN_DOORS.bathroom.from+PLAN_DOORS.bathroom.to)*.5,PLAN_DOORS.bathroom.at,'horizontal',-1],
    [(PLAN_DOORS.ensuite.from+PLAN_DOORS.ensuite.to)*.5,PLAN_DOORS.ensuite.at,'horizontal',1]
  ];
  for(const [x,y,orientation,swing] of leaves){
    const p=iso(x,y,3);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(orientation==='horizontal'?0:Math.PI/2);ctx.fillStyle='#704323';ctx.fillRect(0,-31*swing,5,31*swing);ctx.strokeStyle='#3f2616';ctx.lineWidth=1.4;ctx.strokeRect(0,-31*swing,5,31*swing);ctx.restore();
  }
}

drawWalls = function(){};

function inwardDrawWorld(){
  drawFloor();
  const farWindowWall=inwardOuterWalls.find(wall=>wall.id==='outer-window');
  if(farWindowWall)inwardDrawWall(farWindowWall);
  inwardDrawWindows();
  const drawables=[];
  for(const wall of [...inwardOuterWalls.filter(item=>item.id!=='outer-window'),...wallRects])drawables.push({depth:wall.y+wall.h+.02,draw:()=>inwardDrawWall(wall)});
  for(const item of obstacles)drawables.push({depth:item.y+item.h,draw:()=>drawFurniture(item)});
  for(const treat of treats)if(treat.found&&treat.reveal>0)drawables.push({depth:treat.y+.02,draw:()=>drawTreat(treat)});
  for(const fly of flies)if(fly.alive)drawables.push({depth:fly.y+.03,draw:()=>drawFly(fly)});
  if(vacuum.active)drawables.push({depth:vacuum.y+.02,draw:drawVacuum});
  const surface=surfaceById(cat.surfaceId);
  drawables.push({depth:surface?surface.y+surface.h+.12:cat.y+.05,draw:drawCat});
  drawables.sort((a,b)=>a.depth-b.depth);for(const drawable of drawables)drawable.draw();
  inwardDrawDoorLeaves();
  drawEffects();
  if(state==='playing'&&vacuum.active&&vacuum.state==='chase'&&dist(vacuum,cat)<2.4*INWARD_WORLD_SCALE&&cat.jumpCooldown<=0&&!cat.surfaceId){
    const p=iso(cat.x,cat.y,68+cat.jumpHeight);ctx.save();ctx.globalAlpha=.72+.22*Math.sin(elapsed*7);ctx.fillStyle='#fff4c4';ctx.font='900 13px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('JUMP!',p.x,p.y);ctx.restore();
  }else if(state==='playing'&&cat.pounceCooldown<=0&&flies.some(f=>f.alive&&dist(f,cat)<1.3*INWARD_WORLD_SCALE)){
    const p=iso(cat.x,cat.y,60+cat.jumpHeight);ctx.save();ctx.globalAlpha=.72+.22*Math.sin(elapsed*6);ctx.fillStyle='#fff4c4';ctx.font='900 13px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('POUNCE!',p.x,p.y);ctx.restore();
  }
  const vignette=ctx.createRadialGradient(VIEW_W/2,VIEW_H/2,260,VIEW_W/2,VIEW_H/2,760);vignette.addColorStop(.62,'rgba(3,10,16,0)');vignette.addColorStop(1,'rgba(3,10,16,.26)');ctx.fillStyle=vignette;ctx.fillRect(0,0,VIEW_W,VIEW_H);
}

drawWorld = inwardDrawWorld;

randomFreePoint = function(r=.28){
  for(let i=0;i<520;i++){
    const p={x:.45*INWARD_WORLD_SCALE+Math.random()*(INWARD_WORLD_W-.9*INWARD_WORLD_SCALE),y:.45*INWARD_WORLD_SCALE+Math.random()*(INWARD_WORLD_H-.9*INWARD_WORLD_SCALE)};
    if(!pointBlocked(p.x,p.y,r)&&dist(p,cat)>1.25*INWARD_WORLD_SCALE&&(!vacuum.active||dist(p,vacuum)>.9*INWARD_WORLD_SCALE))return p;
  }
  return {x:7.6*INWARD_WORLD_SCALE,y:9.4*INWARD_WORLD_SCALE};
};

const inwardBaseMakeFly=makeFly;
makeFly = function(index){const fly=inwardBaseMakeFly(index);fly.speed*=1.24;return fly};

updateFlies = function(dt){
  for(const fly of flies){
    if(!fly.alive){
      fly.respawn-=dt;
      if(fly.respawn<=0){const p=randomFreePoint(.10);fly.x=p.x;fly.y=p.y;fly.target=randomFreePoint(.08);fly.phase=Math.random()*Math.PI*2;fly.turnTimer=randomBetween(.24,.72);fly.alive=true}
      continue;
    }
    fly.phase+=dt*15;fly.turnTimer-=dt;fly.burstTimer=Math.max(0,fly.burstTimer-dt);
    if(fly.turnTimer<=0||dist(fly,fly.target)<.28*INWARD_WORLD_SCALE){fly.target=randomFreePoint(.08);fly.turnTimer=randomBetween(.22,.78);if(Math.random()<.36){fly.burstTimer=randomBetween(.22,.55);fly.burstScale=randomBetween(1.35,1.82)}}
    let desired=normalize(fly.target.x-fly.x,fly.target.y-fly.y);const catDistance=dist(fly,cat);
    if(catDistance<2.15*INWARD_WORLD_SCALE){const flee=normalize(fly.x-cat.x,fly.y-cat.y);desired=normalize(desired.x*.18+flee.x*1.65,desired.y*.18+flee.y*1.65)}
    const side={x:-desired.y,y:desired.x},zig=Math.sin(fly.phase*1.37)*.34+Math.sin(fly.phase*.61)*.18,move=normalize(desired.x+side.x*zig,desired.y+side.y*zig,desired);
    const speed=fly.speed*(fly.burstTimer>0?fly.burstScale:1);const nx=fly.x+move.x*speed*dt,ny=fly.y+move.y*speed*dt;
    if(!pointBlocked(nx,fly.y,.08))fly.x=nx;else{fly.target=randomFreePoint(.08);fly.turnTimer=.05}
    if(!pointBlocked(fly.x,ny,.08))fly.y=ny;else{fly.target=randomFreePoint(.08);fly.turnTimer=.05}
    fly.z=43+Math.sin(fly.phase*.72)*8+Math.sin(fly.phase*1.9)*2;
  }
};

findPath = function(start,target,radius){
  const cell=.52,cols=Math.ceil(INWARD_WORLD_W/cell),rows=Math.ceil(INWARD_WORLD_H/cell);
  const toCell=p=>({x:clamp(Math.floor(p.x/cell),0,cols-1),y:clamp(Math.floor(p.y/cell),0,rows-1)}),centre=(x,y)=>({x:(x+.5)*cell,y:(y+.5)*cell});
  const blocked=(x,y)=>{const p=centre(x,y);return pointBlocked(p.x,p.y,radius)};
  function nearestFree(c){if(!blocked(c.x,c.y))return c;for(let ring=1;ring<13;ring++)for(let oy=-ring;oy<=ring;oy++)for(let ox=-ring;ox<=ring;ox++){if(Math.max(Math.abs(ox),Math.abs(oy))!==ring)continue;const x=c.x+ox,y=c.y+oy;if(x>=0&&y>=0&&x<cols&&y<rows&&!blocked(x,y))return{x,y}}return c}
  const s=nearestFree(toCell(start)),g=nearestFree(toCell(target)),key=(x,y)=>y*cols+x,startKey=key(s.x,s.y),goalKey=key(g.x,g.y);
  const open=[startKey],came=new Map(),gScore=new Map([[startKey,0]]),fScore=new Map([[startKey,Math.hypot(g.x-s.x,g.y-s.y)]]),openSet=new Set(open),dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  let loops=0;
  while(open.length&&loops++<12000){
    let bestIndex=0,bestF=Infinity;for(let i=0;i<open.length;i++){const f=fScore.get(open[i])??Infinity;if(f<bestF){bestF=f;bestIndex=i}}
    const current=open.splice(bestIndex,1)[0];openSet.delete(current);
    if(current===goalKey){const path=[];let cur=current;while(cur!==startKey){const x=cur%cols,y=Math.floor(cur/cols);path.push(centre(x,y));cur=came.get(cur);if(cur===undefined)break}path.reverse();return path}
    const cx=current%cols,cy=Math.floor(current/cols);
    for(const [dx,dy] of dirs){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=cols||ny>=rows||blocked(nx,ny))continue;if(dx&&dy&&(blocked(cx+dx,cy)||blocked(cx,cy+dy)))continue;const nk=key(nx,ny),tentative=(gScore.get(current)??Infinity)+(dx&&dy?1.414:1);if(tentative<(gScore.get(nk)??Infinity)){came.set(nk,current);gScore.set(nk,tentative);fScore.set(nk,tentative+Math.hypot(g.x-nx,g.y-ny));if(!openSet.has(nk)){open.push(nk);openSet.add(nk)}}}
  }
  return [{x:target.x,y:target.y}];
};

function inwardClampCamera(){
  const halfW=VIEW_W/(2*INWARD_PIXELS_PER_UNIT),halfH=VIEW_H/(2*INWARD_PIXELS_PER_UNIT*INWARD_DEPTH_SCALE);
  inwardCamera.x=clamp(inwardCamera.x,Math.min(halfW,INWARD_WORLD_W*.5),Math.max(INWARD_WORLD_W-halfW,INWARD_WORLD_W*.5));
  inwardCamera.y=clamp(inwardCamera.y,Math.min(halfH,INWARD_WORLD_H*.5),Math.max(INWARD_WORLD_H-halfH,INWARD_WORLD_H*.5));
}

const inwardBaseUpdate=update;
update = function(dt){
  inwardBaseUpdate(dt);
  inwardCamera.targetX=cat.x+cat.facing.x*.65*INWARD_WORLD_SCALE;
  inwardCamera.targetY=cat.y+cat.facing.y*.45*INWARD_WORLD_SCALE;
  const follow=1-Math.exp(-Math.max(0,dt)*5.2);
  inwardCamera.x=lerp(inwardCamera.x,inwardCamera.targetX,follow);inwardCamera.y=lerp(inwardCamera.y,inwardCamera.targetY,follow);inwardClampCamera();
};

const inwardBaseResetGame=resetGame;
resetGame = function(){
  inwardBaseResetGame();cat.x=7.62*INWARD_WORLD_SCALE;cat.y=9.36*INWARD_WORLD_SCALE;cat.facing={x:1,y:-1};cat.surfaceId=null;cat.jumpHeight=0;cat.jumpDuration=.82;
  inwardCamera.x=cat.x;inwardCamera.y=cat.y;inwardCamera.targetX=cat.x;inwardCamera.targetY=cat.y;inwardClampCamera();
  flies=Array.from({length:5},(_,index)=>makeFly(index));treats=makeTreats();vacuum.active=false;vacuum.state='hidden';vacuum.spawnTimer=randomBetween(3.8,7.2);vacuum.path=[];vacuum.retreatTarget=null;updateHud(true);
};

showMenu = function(){
  state='menu';overlayAction='start';overlayEyebrow.textContent='Expanded inward-camera edition';overlayTitle.innerHTML="Herbert's<br>House Hunt";
  overlayCopy.textContent='The camera now follows Herbert from an inward-facing room view. The apartment is almost twice as large, furniture is more widely spaced, and foreground walls fade whenever they would hide Herbert.';
  controlsRow.hidden=false;resultLine.hidden=true;overlayButton.textContent='Start 60-second hunt';overlay.classList.remove('hidden');
};

const inwardPixelCanvas=document.createElement('canvas');inwardPixelCanvas.width=600;inwardPixelCanvas.height=360;const inwardPixelCtx=inwardPixelCanvas.getContext('2d');inwardPixelCtx.imageSmoothingEnabled=false;
render = function(){
  ctx.clearRect(0,0,VIEW_W,VIEW_H);ctx.save();if(shake>0&&!reducedMotion)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawWorld();ctx.restore();
  inwardPixelCtx.clearRect(0,0,inwardPixelCanvas.width,inwardPixelCanvas.height);inwardPixelCtx.imageSmoothingEnabled=false;inwardPixelCtx.drawImage(canvas,0,0,VIEW_W,VIEW_H,0,0,inwardPixelCanvas.width,inwardPixelCanvas.height);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,VIEW_W,VIEW_H);ctx.imageSmoothingEnabled=false;ctx.drawImage(inwardPixelCanvas,0,0,inwardPixelCanvas.width,inwardPixelCanvas.height,0,0,VIEW_W,VIEW_H);ctx.restore();
};

canvas.style.imageRendering='pixelated';document.documentElement.classList.add('herbert-inward-camera');
const inwardStyle=document.createElement('style');inwardStyle.textContent=`
.herbert-inward-camera .intro p{max-width:900px}
.herbert-inward-camera .game-stage:after{content:"FOLLOW CAMERA · WALLS FADE WHEN OCCLUDED";position:absolute;left:16px;bottom:14px;padding:6px 9px;background:rgba(12,20,30,.72);border:1px solid rgba(240,210,145,.42);color:#f0d291;font:800 9px ui-monospace,monospace;letter-spacing:.08em;pointer-events:none;z-index:3}
@media(max-width:760px){.herbert-inward-camera .game-stage:after{display:none}}
`;document.head.appendChild(inwardStyle);

resetGame();showMenu();
