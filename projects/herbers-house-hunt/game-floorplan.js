'use strict';

// Floor-plan revision based on the annotated apartment drawing. The existing
// game systems (scoring, flies, vacuum, jump/pounce and league table) remain in
// place; this module replaces the navigable geometry and the room rendering.

const PLAN_FLOORS = {
  living:[{x:0,y:0},{x:8.38,y:0},{x:8.38,y:8.18},{x:6.72,y:8.18},{x:6.72,y:10.76},{x:0,y:10.76}],
  corridor:[{x:6.72,y:8.18},{x:13.72,y:8.18},{x:13.72,y:10.76},{x:15.12,y:10.76},{x:15.12,y:10.55},{x:15.52,y:10.55},{x:15.52,y:10.76},{x:6.72,y:10.76}],
  smallBedroom:[{x:8.38,y:2.82},{x:13.72,y:2.82},{x:13.72,y:8.18},{x:8.38,y:8.18}],
  masterBedroom:[{x:13.72,y:2.82},{x:19,y:2.82},{x:19,y:10.55},{x:15.12,y:10.55},{x:15.12,y:10.76},{x:13.72,y:10.76}],
  bathroom:[{x:11.84,y:10.76},{x:15.12,y:10.76},{x:15.12,y:14},{x:11.84,y:14}],
  ensuite:[{x:15.12,y:10.55},{x:19,y:10.55},{x:19,y:12.02},{x:15.12,y:12.02}],
  balcony:[{x:8.38,y:0},{x:19,y:2.82},{x:8.38,y:2.82}]
};

const PLAN_ROOM_ORDER = ['living','corridor','smallBedroom','masterBedroom','bathroom','ensuite','balcony'];
const PLAN_DOORS = {
  livingBalcony:{axis:'v',at:8.38,from:1.18,to:2.70},
  balconyMaster:{axis:'h',at:2.82,from:14.72,to:16.55},
  livingHall:{axis:'h',at:8.18,from:6.94,to:7.92},
  smallBedroom:{axis:'h',at:8.18,from:8.72,to:10.26},
  masterBedroom:{axis:'v',at:13.72,from:8.96,to:10.10},
  bathroom:{axis:'h',at:10.76,from:12.48,to:14.18},
  ensuite:{axis:'h',at:10.55,from:15.44,to:16.42},
  entrance:{axis:'h',at:10.76,from:7.16,to:8.18}
};

function planPointInPolygon(x,y,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    const crosses=((a.y>y)!==(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y||1e-9)+a.x);
    if(crosses)inside=!inside;
  }
  return inside;
}

function planInsideFloor(x,y){return PLAN_ROOM_ORDER.some(name=>planPointInPolygon(x,y,PLAN_FLOORS[name]))}
function planCircleInsideFloor(x,y,r){
  const samples=[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.72,r*.72],[r*.72,-r*.72],[-r*.72,r*.72],[-r*.72,-r*.72]];
  return samples.every(([dx,dy])=>planInsideFloor(x+dx,y+dy));
}

function planWallRect(id,x,y,w,h,height=64){return{id,x,y,w,h,height}}
function planPushHorizontal(target,id,y,x1,x2,gaps=[]){
  let cursor=x1;
  for(const [a,b] of [...gaps].sort((left,right)=>left[0]-right[0])){
    if(a>cursor)target.push(planWallRect(`${id}-${cursor.toFixed(2)}`,cursor,y,a-cursor,.16));
    cursor=Math.max(cursor,b);
  }
  if(cursor<x2)target.push(planWallRect(`${id}-${cursor.toFixed(2)}`,cursor,y,x2-cursor,.16));
}
function planPushVertical(target,id,x,y1,y2,gaps=[]){
  let cursor=y1;
  for(const [a,b] of [...gaps].sort((left,right)=>left[0]-right[0])){
    if(a>cursor)target.push(planWallRect(`${id}-${cursor.toFixed(2)}`,x,cursor,.16,a-cursor));
    cursor=Math.max(cursor,b);
  }
  if(cursor<y2)target.push(planWallRect(`${id}-${cursor.toFixed(2)}`,x,cursor,.16,y2-cursor));
}

const planInteriorWalls=[];
planPushVertical(planInteriorWalls,'living-east',8.30,2.82,8.18,[]);
planPushHorizontal(planInteriorWalls,'living-hall',8.10,6.72,8.38,[[PLAN_DOORS.livingHall.from,PLAN_DOORS.livingHall.to]]);
planPushHorizontal(planInteriorWalls,'small-bottom',8.10,8.38,13.72,[[PLAN_DOORS.smallBedroom.from,PLAN_DOORS.smallBedroom.to]]);
planPushVertical(planInteriorWalls,'small-master',13.64,2.82,8.18,[]);
planPushVertical(planInteriorWalls,'master-hall',13.64,8.18,10.55,[[PLAN_DOORS.masterBedroom.from,PLAN_DOORS.masterBedroom.to]]);
planPushVertical(planInteriorWalls,'hall-left',6.64,8.18,10.76,[]);
planPushHorizontal(planInteriorWalls,'hall-bottom',10.68,6.72,11.84,[[PLAN_DOORS.entrance.from,PLAN_DOORS.entrance.to]]);
planPushHorizontal(planInteriorWalls,'bath-top',10.68,11.84,15.12,[[PLAN_DOORS.bathroom.from,PLAN_DOORS.bathroom.to]]);
planPushVertical(planInteriorWalls,'bath-ensuite',15.04,10.76,12.02,[]);
planPushHorizontal(planInteriorWalls,'ensuite-top',10.47,15.12,19,[[PLAN_DOORS.ensuite.from,PLAN_DOORS.ensuite.to]]);
planPushVertical(planInteriorWalls,'balcony-living',8.30,0,2.82,[[PLAN_DOORS.livingBalcony.from,PLAN_DOORS.livingBalcony.to]]);
planPushHorizontal(planInteriorWalls,'balcony-rooms',2.74,8.38,19,[[PLAN_DOORS.balconyMaster.from,PLAN_DOORS.balconyMaster.to]]);
wallRects.splice(0,wallRects.length,...planInteriorWalls);

obstacles.splice(0,obstacles.length,
  {id:'wallTv',type:'wallTv',x:.20,y:1.12,w:.62,h:2.35,height:66,palette:palettes.black},
  {id:'sofa',type:'planSofa',x:3.58,y:.42,w:1.72,h:2.72,height:39,palette:palettes.sofa,climbable:true},
  {id:'dining',type:'dining',x:5.48,y:.92,w:1.92,h:1.92,height:34,palette:palettes.darkWood,climbable:true},
  {id:'chairA',type:'chair',x:5.03,y:.88,w:.56,h:.56,height:24,palette:palettes.black},
  {id:'chairB',type:'chair',x:7.34,y:1.18,w:.56,h:.56,height:24,palette:palettes.black},
  {id:'chairC',type:'chair',x:5.92,y:2.75,w:.56,h:.56,height:24,palette:palettes.black},
  {id:'shelf',type:'planShelf',x:.45,y:4.48,w:3.05,h:.72,height:74,palette:palettes.shelf,climbable:true},
  {id:'synth',type:'planSynth',x:7.50,y:3.92,w:.68,h:2.38,height:35,palette:palettes.black},
  {id:'gymRack',type:'gymRack',x:3.90,y:5.55,w:1.85,h:.58,height:20,palette:palettes.black},
  {id:'catTower',type:'tower',x:5.55,y:5.50,w:.66,h:.66,height:53,palette:palettes.tower,climbable:true},
  {id:'kitchenBack',type:'kitchenBack',x:.78,y:9.84,w:4.55,h:.78,height:45,palette:palettes.kitchen,climbable:true},
  {id:'island',type:'kitchenReturn',x:.18,y:6.70,w:.80,h:3.18,height:45,palette:palettes.kitchen,climbable:true},
  {id:'kitchenOpen',type:'kitchenOpen',x:.18,y:8.00,w:.50,h:1.60,height:72,palette:palettes.kitchen},
  {id:'kitchenBin',type:'bin',x:1.12,y:8.80,w:.58,h:.58,height:38,palette:palettes.black},
  {id:'smallWardrobe',type:'wardrobe',x:8.64,y:3.86,w:.66,h:2.36,height:70,palette:palettes.bedroom},
  {id:'bunkBed',type:'bunkBed',x:10.28,y:5.55,w:3.12,h:2.30,height:58,palette:palettes.bedroom,climbable:true},
  {id:'smallDresser',type:'cabinet',x:13.02,y:3.30,w:.52,h:1.10,height:48,palette:palettes.bedroom},
  {id:'masterDresser',type:'wardrobe',x:13.83,y:4.78,w:.62,h:2.70,height:67,palette:palettes.bedroom},
  {id:'bed',type:'bed',x:15.48,y:4.65,w:3.12,h:2.95,height:30,palette:palettes.bedroom,climbable:true},
  {id:'nightstand',type:'nightstand',x:17.92,y:7.82,w:.58,h:.58,height:24,palette:palettes.wood,climbable:true},
  {id:'bath',type:'bath',x:12.03,y:12.22,w:2.62,h:1.30,height:35,palette:palettes.bathroom,climbable:true},
  {id:'toilet',type:'toilet',x:12.05,y:11.05,w:.72,h:.84,height:39,palette:palettes.bathroom},
  {id:'vanity',type:'vanity',x:14.20,y:11.04,w:.68,h:1.15,height:47,palette:palettes.bathroom,climbable:true},
  {id:'shower',type:'shower',x:16.55,y:10.76,w:1.98,h:1.05,height:57,palette:palettes.bathroom},
  {id:'ensuiteVanity',type:'vanity',x:15.34,y:10.78,w:.66,h:.95,height:45,palette:palettes.bathroom,climbable:true},
  {id:'balconyTable',type:'balconyTable',x:13.18,y:1.35,w:1.15,h:.72,height:28,palette:palettes.darkWood,climbable:true},
  {id:'balconyPlant',type:'plant',x:17.52,y:2.02,w:.55,h:.55,height:46,palette:palettes.wood}
);

vacuumEntrances.splice(0,vacuumEntrances.length,
  {x:2.10,y:9.42},{x:7.45,y:9.18},{x:9.18,y:7.62},{x:12.72,y:9.62},
  {x:18.25,y:8.92},{x:13.20,y:11.82},{x:17.25,y:10.04},{x:10.00,y:2.25}
);

treatSeeds.splice(0,treatSeeds.length,
  {x:1.42,y:3.72},{x:3.15,y:6.15},{x:5.25,y:8.82},{x:7.58,y:2.92},
  {x:7.72,y:9.54},{x:9.58,y:4.28},{x:11.86,y:7.98},{x:12.40,y:9.40},
  {x:15.02,y:3.72},{x:17.48,y:8.92},{x:13.36,y:12.08},{x:16.42,y:11.64},
  {x:15.20,y:2.16}
);

roomAt = function(x,y){
  if(planPointInPolygon(x,y,PLAN_FLOORS.balcony))return 'balcony';
  if(planPointInPolygon(x,y,PLAN_FLOORS.ensuite))return 'ensuite';
  if(planPointInPolygon(x,y,PLAN_FLOORS.bathroom))return 'bathroom';
  if(planPointInPolygon(x,y,PLAN_FLOORS.masterBedroom))return 'masterBedroom';
  if(planPointInPolygon(x,y,PLAN_FLOORS.smallBedroom))return 'smallBedroom';
  if(planPointInPolygon(x,y,PLAN_FLOORS.corridor))return 'corridor';
  return 'living';
};

pointBlocked = function(x,y,r,options={}){
  if(!planCircleInsideFloor(x,y,r))return true;
  if(wallRects.some(item=>circleRectBlocked(x,y,r,item)))return true;
  return obstacles.some(item=>{
    if(options.ignoreClimbable&&item.climbable)return false;
    if(options.ignoreId&&item.id===options.ignoreId)return false;
    return circleRectBlocked(x,y,r,item);
  });
};

friendlySurfaceName = function(id){
  const names={
    sofa:'sofa',dining:'round dining table',shelf:'black shelving unit',
    kitchenBack:'kitchen counter',island:'kitchen counter',bunkBed:'bunk bed',
    bed:'master bed',bath:'bath',vanity:'bathroom vanity',ensuiteVanity:'ensuite vanity',
    balconyTable:'balcony table',catTower:'scratching post'
  };
  return names[id]||'furniture';
};

const planBaseDrawFurniture=drawFurniture;
drawFurniture = function(item){
  if(item.type==='wallTv')return drawPlanWallTv(item);
  if(item.type==='planSofa')return drawPlanSofa(item);
  if(item.type==='planShelf')return drawPlanShelf(item);
  if(item.type==='planSynth')return drawPlanSynth(item);
  if(item.type==='bunkBed')return drawPlanBunkBed(item);
  if(item.type==='shower')return drawPlanShower(item);
  if(item.type==='balconyTable')return drawPlanBalconyTable(item);
  return planBaseDrawFurniture(item);
};

function drawPlanWallTv(item){
  drawIsoBox({x:item.x,y:item.y,w:.34,h:item.h},19,{top:'#5e3f28',x:'#40291c',y:'#322016',line:'#1d130d'});
  const a=iso(item.x+.18,item.y+.16,26),b=iso(item.x+.18,item.y+item.h-.16,26);
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2-34);ctx.rotate(angle);ctx.fillStyle='#080a0b';ctx.fillRect(-len/2,-27,len,54);ctx.strokeStyle='#303538';ctx.lineWidth=3;ctx.strokeRect(-len/2,-27,len,54);ctx.fillStyle='rgba(86,126,143,.14)';ctx.fillRect(-len/2+4,-23,len-8,46);ctx.restore();
}

function drawPlanSofa(item){
  drawIsoBox(item,24,item.palette);
  drawIsoBox({x:item.x+.04,y:item.y+.08,w:.30,h:item.h-.16},51,{top:'#e1ddd6',x:'#b7b2aa',y:'#9e9992',line:'#7e7972'});
  drawIsoBox({x:item.x+item.w-.34,y:item.y+.08,w:.30,h:item.h-.16},38,item.palette);
  for(let i=0;i<4;i++){
    const cushion={x:item.x+.42,y:item.y+.28+i*.56,w:item.w-.54,h:.46};
    polygon(rectCorners(cushion,30),i===2?'#aaa79f':'#dcd8d0','rgba(100,95,88,.42)',.8);
  }
  drawJumpableRim(item);
}

function drawPlanShelf(item){
  const base=rectCorners(item,0),top=rectCorners(item,item.height);ctx.strokeStyle='#111416';ctx.lineWidth=4.5;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(base[i].x,base[i].y);ctx.lineTo(top[i].x,top[i].y);ctx.stroke()}
  for(const z of [10,28,47,66,77])polygon(rectCorners({x:item.x-.04,y:item.y-.06,w:item.w+.08,h:item.h+.12},z),'#23272a','#090b0c',1);
  for(let i=0;i<9;i++){const p=iso(item.x+.28+i*.30,item.y+.18,70+(i%3));ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.12+i*.025);ctx.fillStyle=['#7c4e38','#4e7279','#b38b4c','#4e5e48'][i%4];ctx.fillRect(-11,-3,23,6);ctx.restore()}
  const tank={x:item.x+1.02,y:item.y+.12,w:.88,h:.45};drawIsoBox(tank,50,{top:'rgba(158,196,194,.32)',x:'rgba(92,137,139,.31)',y:'rgba(70,111,115,.30)',line:'#34494b'});
  for(let i=0;i<7;i++){const p=iso(item.x+.28+i*.38,item.y+.42,31);ctx.fillStyle=['#365a42','#6d3d32','#4b6e62','#71542c'][i%4];ctx.fillRect(p.x-2.5,p.y-15,5,15);ctx.beginPath();ctx.arc(p.x,p.y-15,2.5,0,Math.PI*2);ctx.fill()}
  for(let i=0;i<8;i++){const p=iso(item.x+.20+i*.35,item.y+.25,13);ctx.fillStyle=['#a05e45','#4e7984','#c3a04e','#6e5a7b'][i%4];ctx.fillRect(p.x-3,p.y-20,6,20)}
  drawJumpableRim(item);
}

function drawPlanSynth(item){
  drawIsoBox(item,item.height,item.palette);
  const board={x:item.x+.08,y:item.y+.14,w:item.w-.16,h:item.h-.28};polygon(rectCorners(board,item.height+2),'#bb732c','#633817',1);
  for(let i=0;i<18;i++){
    const y=board.y+.08+i*(board.h-.16)/18,a=iso(board.x+.04,y,item.height+3),b=iso(board.x+board.w-.04,y,item.height+3);
    ctx.strokeStyle=i%3===0?'#17191b':'#e5dcc8';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
}

function drawPlanBunkBed(item){
  drawIsoBox({x:item.x,y:item.y,w:item.w,h:.22},10,{top:'#9b673d',x:'#754a2d',y:'#5e3b25',line:'#432919'});
  for(const z of [22,55]){
    const mattress={x:item.x+.10,y:item.y+.12,w:item.w-.20,h:item.h-.28};
    drawIsoBox(mattress,z,{top:z>30?'#70835e':'#a35e3d',x:'#786b58',y:'#655848',line:'#4c4137'});
    polygon(rectCorners({x:item.x+.18,y:item.y+.18,w:.76,h:item.h-.40},z+2),'#f0eadf','#bfb4a6',1);
  }
  for(const [x,y] of [[item.x,item.y],[item.x+item.w,item.y],[item.x,item.y+item.h],[item.x+item.w,item.y+item.h]]){
    const a=iso(x,y,0),b=iso(x,y,item.height);ctx.strokeStyle='#714522';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  const railA=iso(item.x+.18,item.y+item.h,51),railB=iso(item.x+item.w-.18,item.y+item.h,51);ctx.strokeStyle='#714522';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(railA.x,railA.y);ctx.lineTo(railB.x,railB.y);ctx.stroke();
  drawJumpableRim(item);
}

function drawPlanShower(item){
  drawIsoBox(item,8,{top:'#364247',x:'#222c30',y:'#182125',line:'#0f1518'});
  const corners=rectCorners(item,item.height);ctx.save();ctx.globalAlpha=.48;polygon([corners[0],corners[1],iso(item.x+item.w,item.y,item.height+item.height-2),iso(item.x,item.y,item.height+item.height-2)],'#b8dfe5','#769ba2',1);ctx.restore();
  const head=iso(item.x+item.w*.70,item.y+.16,item.height+34);ctx.strokeStyle='#bdc9ca';ctx.lineWidth=2;ctx.beginPath();ctx.arc(head.x,head.y,8,Math.PI,Math.PI*2);ctx.stroke();
}

function drawPlanBalconyTable(item){
  const c=iso(item.x+item.w*.5,item.y+item.h*.5,item.height);ctx.fillStyle='#2b2f31';ctx.beginPath();ctx.ellipse(c.x,c.y,18,8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#101214';ctx.lineWidth=2;ctx.stroke();
  const b=iso(item.x+item.w*.5,item.y+item.h*.5,0);ctx.strokeStyle='#303538';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();drawJumpableRim(item);
}

function planScreenPolygon(points,z=0){return points.map(point=>iso(point.x,point.y,z))}
function planClip(points){const screen=planScreenPolygon(points);ctx.beginPath();ctx.moveTo(screen[0].x,screen[0].y);for(let i=1;i<screen.length;i++)ctx.lineTo(screen[i].x,screen[i].y);ctx.closePath();ctx.clip()}
function planDrawTiledRoom(name,baseA,baseB,line){
  const poly=PLAN_FLOORS[name];ctx.save();planClip(poly);
  const minX=Math.floor(Math.min(...poly.map(point=>point.x))),maxX=Math.ceil(Math.max(...poly.map(point=>point.x)));
  const minY=Math.floor(Math.min(...poly.map(point=>point.y))),maxY=Math.ceil(Math.max(...poly.map(point=>point.y)));
  for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++)polygon([iso(x,y),iso(x+1,y),iso(x+1,y+1),iso(x,y+1)],(x+y)%2===0?baseA:baseB,line,.65);
  ctx.restore();polygon(planScreenPolygon(poly,1),null,'rgba(61,51,43,.34)',1.1);
}
function planDrawBalcony(){
  const poly=PLAN_FLOORS.balcony;ctx.save();planClip(poly);ctx.fillStyle='#7f5137';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  for(let y=0;y<3.1;y+=.34){const a=iso(8.2,y,1),b=iso(19.2,y,1);ctx.strokeStyle=y%0.68<.2?'#a87554':'#6b432f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
  ctx.restore();polygon(planScreenPolygon(poly,1),null,'rgba(54,37,27,.55)',1.2);
}

drawFloor = function(){
  const bg=ctx.createLinearGradient(0,0,0,VIEW_H);bg.addColorStop(0,'#151b2b');bg.addColorStop(1,'#080d18');ctx.fillStyle=bg;ctx.fillRect(-20,-20,VIEW_W+40,VIEW_H+40);
  planDrawTiledRoom('living','#e8dfce','#ddd1bd','rgba(111,99,82,.22)');
  planDrawTiledRoom('corridor','#e3d8c5','#d8ccb8','rgba(111,99,82,.22)');
  planDrawTiledRoom('smallBedroom','#d8c9b4','#cfbea8','rgba(93,75,60,.18)');
  planDrawTiledRoom('masterBedroom','#d9cbb9','#cfbfaa','rgba(93,75,60,.18)');
  planDrawTiledRoom('bathroom','#465158','#3a454b','rgba(215,229,231,.12)');
  planDrawTiledRoom('ensuite','#4c565c','#3f494f','rgba(215,229,231,.12)');
  planDrawBalcony();drawFloorDetails();
};

drawFloorDetails = function(){
  drawRug({x:3.15,y:3.25,w:3.22,h:2.32},'#a99a57','#d6c987');
  ctx.save();ctx.globalAlpha=.14;for(let i=0;i<18;i++){const p=iso(.65+(i%6)*1.15,1.0+Math.floor(i/6)*1.9,2);ctx.fillStyle='#fffbe9';ctx.beginPath();ctx.ellipse(p.x,p.y,7,2,-.25,0,Math.PI*2);ctx.fill()}ctx.restore();
  const cable=[{x:3.7,y:6.5},{x:4.7,y:7.0},{x:5.9,y:7.55},{x:7.1,y:8.1}].map(point=>iso(point.x,point.y,3));ctx.strokeStyle='rgba(23,24,25,.62)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cable[0].x,cable[0].y);for(let i=1;i<cable.length;i++)ctx.lineTo(cable[i].x,cable[i].y);ctx.stroke();
  for(const [x,y,fill] of [[1.22,8.52,'#b83f34'],[1.60,8.54,'#d4d5d0']]){const p=iso(x,y,4);ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(p.x,p.y,8,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#45352c';ctx.beginPath();ctx.ellipse(p.x,p.y,4.7,2.1,0,0,Math.PI*2);ctx.fill()}
  drawRoomLabel('OPEN-PLAN LIVING + KITCHEN',3.80,9.25);drawRoomLabel('CORRIDOR',10.35,9.72);drawRoomLabel('SMALL BEDROOM',10.98,4.18);drawRoomLabel('MASTER BEDROOM',16.52,3.48);drawRoomLabel('BATHROOM',13.47,13.63);drawRoomLabel('ENSUITE',17.08,11.72);drawRoomLabel('BALCONY',13.20,2.30);drawPlanClosedEntranceDoor();
};

function drawPlanClosedEntranceDoor(){
  const a=iso(PLAN_DOORS.entrance.from,10.69,3),b=iso(PLAN_DOORS.entrance.to,10.69,3),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2-23);ctx.rotate(angle);ctx.fillStyle='#704323';ctx.fillRect(-len/2,-22,len,44);ctx.strokeStyle='#3f2616';ctx.lineWidth=2;ctx.strokeRect(-len/2,-22,len,44);ctx.fillStyle='#c8b26e';ctx.beginPath();ctx.arc(len*.32,0,2.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawPlanWindowWall(){for(const [start,length] of [[.20,2.46],[2.76,2.46],[5.32,2.72]])drawWindow(start,-.12,length,'north',false)}
function drawPlanBalconyRail(){
  const a=iso(8.38,0,21),b=iso(19,2.82,21),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2);ctx.rotate(angle);ctx.fillStyle='rgba(134,181,191,.24)';ctx.fillRect(-len/2,-17,len,34);ctx.strokeStyle='#66787d';ctx.lineWidth=3;ctx.strokeRect(-len/2,-17,len,34);for(let x=-len/2;x<=len/2;x+=38){ctx.beginPath();ctx.moveTo(x,-17);ctx.lineTo(x,17);ctx.stroke()}ctx.restore();
}

drawWalls = function(){
  drawIsoBox({x:-.16,y:0,w:.20,h:10.76},72,palettes.wall);drawIsoBox({x:0,y:10.68,w:6.72,h:.20},72,palettes.wall);drawIsoBox({x:8.30,y:0,w:.20,h:1.18},72,palettes.wall);drawIsoBox({x:8.30,y:2.70,w:.20,h:.12},72,palettes.wall);drawIsoBox({x:19-.16,y:2.82,w:.20,h:9.20},72,palettes.wall);drawIsoBox({x:15.12,y:11.94,w:3.88,h:.20},72,palettes.wall);drawIsoBox({x:11.84,y:13.92,w:3.28,h:.20},72,palettes.wall);drawIsoBox({x:11.76,y:10.76,w:.20,h:3.24},72,palettes.wall);
  drawPlanWindowWall();drawPlanBalconyRail();drawPlanWallDetails();
};

function drawPlanWallDetails(){
  const cow=iso(2.85,10.72,53);ctx.save();ctx.translate(cow.x,cow.y);ctx.rotate(Math.atan2(TILE_H/2,-TILE_W/2));ctx.strokeStyle='#bd3346';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-25,2);ctx.lineTo(-18,-10);ctx.lineTo(14,-10);ctx.lineTo(25,-2);ctx.lineTo(17,9);ctx.lineTo(-15,9);ctx.closePath();ctx.stroke();for(let x=-12;x<14;x+=9){ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,-8);ctx.lineTo(x,7);ctx.stroke()}ctx.restore();
  drawPlanDoorLeaf(8.38,2.05,'vertical',1);drawPlanDoorLeaf(15.55,2.82,'horizontal',-1);drawPlanDoorLeaf(9.42,8.18,'horizontal',1);drawPlanDoorLeaf(13.72,9.55,'vertical',-1);drawPlanDoorLeaf(13.25,10.76,'horizontal',-1);drawPlanDoorLeaf(15.88,10.55,'horizontal',1);
}
function drawPlanDoorLeaf(x,y,orientation,swing){
  const p=iso(x,y,3);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(orientation==='horizontal'?Math.atan2(TILE_H/2,TILE_W/2):Math.atan2(TILE_H/2,-TILE_W/2));ctx.fillStyle='#704323';ctx.fillRect(0,-34*swing,5,34*swing);ctx.strokeStyle='#3f2616';ctx.lineWidth=1.4;ctx.strokeRect(0,-34*swing,5,34*swing);ctx.restore();
}

const planBaseResetGame=resetGame;
resetGame = function(){
  planBaseResetGame();cat.x=7.62;cat.y=9.36;cat.facing={x:1,y:-1};cat.surfaceId=null;cat.jumpHeight=0;
  flies=Array.from({length:5},(_,index)=>makeFly(index));treats=makeTreats();vacuum.active=false;vacuum.state='hidden';vacuum.spawnTimer=randomBetween(3.5,6.7);vacuum.path=[];vacuum.retreatTarget=null;updateHud(true);
};

showMenu = function(){
  state='menu';overlayAction='start';overlayEyebrow.textContent='32-bit floor-plan edition';overlayTitle.innerHTML="Herbert's<br>House Hunt";
  overlayCopy.textContent='Explore the exact apartment plan: the open living room and kitchen, corridor, bunk bedroom, master bedroom, bathroom, ensuite and triangular balcony. Catch flies, uncover treats and jump onto Herbert’s real furniture.';
  controlsRow.hidden=false;resultLine.hidden=true;overlayButton.textContent='Start 60-second hunt';overlay.classList.remove('hidden');
};

const planBaseRender=render;
const planPixelCanvas=document.createElement('canvas');planPixelCanvas.width=600;planPixelCanvas.height=360;
const planPixelCtx=planPixelCanvas.getContext('2d');planPixelCtx.imageSmoothingEnabled=false;
render = function(){
  planBaseRender();planPixelCtx.clearRect(0,0,planPixelCanvas.width,planPixelCanvas.height);planPixelCtx.imageSmoothingEnabled=false;planPixelCtx.drawImage(canvas,0,0,VIEW_W,VIEW_H,0,0,planPixelCanvas.width,planPixelCanvas.height);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,VIEW_W,VIEW_H);ctx.imageSmoothingEnabled=false;ctx.drawImage(planPixelCanvas,0,0,planPixelCanvas.width,planPixelCanvas.height,0,0,VIEW_W,VIEW_H);ctx.restore();
};

canvas.style.imageRendering='pixelated';document.documentElement.classList.add('herbert-pixel-floorplan');
const planStyle=document.createElement('style');planStyle.textContent=`
.herbert-pixel-floorplan body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;background:#111725}
.herbert-pixel-floorplan .game-card{border-radius:8px;border:4px solid #33271d;box-shadow:0 0 0 3px #a27a48,0 22px 65px rgba(5,10,18,.34)}
.herbert-pixel-floorplan .hud-chip,.herbert-pixel-floorplan .icon-button{border-radius:4px;border:2px solid #9d794a;background:#121826;box-shadow:inset 0 0 0 2px #30251b,4px 4px 0 rgba(0,0,0,.28)}
.herbert-pixel-floorplan .hud-label{font-size:10px;color:#f0d795}.herbert-pixel-floorplan .hud-value{font-size:19px;text-shadow:2px 2px 0 #000}
.herbert-pixel-floorplan .panel,.herbert-pixel-floorplan .league-card,.herbert-pixel-floorplan .info-card{border-radius:6px}
.herbert-pixel-floorplan .primary-button,.herbert-pixel-floorplan .action-button{border-radius:5px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),4px 4px 0 rgba(0,0,0,.28)}
`;document.head.appendChild(planStyle);

resetGame();showMenu();
