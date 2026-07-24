'use strict';

function drawFloorDetails(){
  ctx.save();
  ctx.globalAlpha=.28;
  for(let i=0;i<18;i++){
    const x=12.25+(i%4)*.88;
    const y=6.25+Math.floor(i/4)*1.08;
    const p=iso(x,y,2);
    ctx.fillStyle='#75979d';
    ctx.beginPath();ctx.arc(p.x,p.y,1.8,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle='rgba(85,55,31,.28)';ctx.lineWidth=1;
  for(let y=.7;y<11.5;y+=.7){
    const a=iso(10.06,y,2),b=iso(11.88,y,2);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.restore();

  const scratch=rectCorners({x:4.38,y:8.92,w:.9,h:1.15},2);
  polygon(scratch,'#b88b58','#8c633c',1);
  ctx.save();ctx.strokeStyle='rgba(92,55,30,.5)';ctx.lineWidth=1.4;
  for(let i=1;i<5;i++){
    const a=iso(4.38+i*.18,8.92,3),b=iso(4.38+i*.18,10.07,3);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.restore();

  drawDoorThreshold(9.86,4.18,10.10,5.44);
  drawDoorThreshold(11.86,2.06,12.10,3.34);
  drawDoorThreshold(11.86,8.14,12.10,9.42);

  drawRoomLabel('LIVING ROOM',3.3,6.9);
  drawRoomLabel('KITCHEN',7.6,10.2);
  drawRoomLabel('HALLWAY',10.95,5.3);
  drawRoomLabel('BEDROOM',14.0,5.0);
  drawRoomLabel('BATHROOM',14.2,11.0);
}

function drawDoorThreshold(x1,y1,x2,y2){
  const rect={x:x1,y:y1,w:x2-x1,h:y2-y1};
  polygon(rectCorners(rect,2),'#8d6b4c','rgba(66,46,32,.35)',.8);
}

function drawRoomLabel(text,x,y){
  const p=iso(x,y,3);
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.globalAlpha=.24;
  ctx.fillStyle='#263d46';
  ctx.font='900 10px Inter,system-ui,sans-serif';
  ctx.textAlign='center';
  ctx.letterSpacing='1px';
  ctx.fillText(text,0,0);
  ctx.restore();
}

function drawWalls(){
  drawIsoBox({x:0,y:-.16,w:COLS,h:.20},78,palettes.wall);
  drawIsoBox({x:-.16,y:0,w:.20,h:ROWS},78,palettes.wall);

  drawWindow(1.70,-.13,2.10,'north',false);
  drawWindow(6.62,-.13,2.00,'north',false);
  drawWindow(12.72,-.13,2.15,'north',false);
  drawWindow(-.13,2.58,1.85,'west',false);
  drawWindow(-.13,8.15,1.60,'west',false);

  const picture=iso(5.60,-.14,49);
  ctx.save();ctx.translate(picture.x,picture.y);ctx.rotate(Math.atan2(TILE_H/2,TILE_W/2));
  ctx.fillStyle='#67473a';ctx.fillRect(-27,-18,54,36);
  ctx.fillStyle='#f4d9a6';ctx.fillRect(-22,-13,44,26);
  ctx.fillStyle='#d97824';ctx.beginPath();ctx.arc(0,-1,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7f3b16';ctx.beginPath();ctx.moveTo(-7,-7);ctx.lineTo(-3,-16);ctx.lineTo(1,-7);ctx.fill();ctx.beginPath();ctx.moveTo(7,-7);ctx.lineTo(3,-16);ctx.lineTo(-1,-7);ctx.fill();
  ctx.restore();
}

function drawInteriorWall(item){
  drawIsoBox(item,item.height,palettes.wall);
}

function drawWindow(x,y,length,orientation,frosted=false){
  const z=46;
  let a,b;
  if(orientation==='north'){a=iso(x,y,z);b=iso(x+length,y,z)}else{a=iso(x,y,z);b=iso(x,y+length,z)}
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2);ctx.rotate(angle);
  ctx.fillStyle='#8c7968';ctx.fillRect(-len/2-5,-23,len+10,46);
  const sky=ctx.createLinearGradient(0,-18,0,18);sky.addColorStop(0,frosted?'#d8e8ea':'#a9d7e4');sky.addColorStop(1,frosted?'#f0f5f3':'#e7f2e9');ctx.fillStyle=sky;ctx.fillRect(-len/2,-18,len,36);
  ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(0,18);ctx.stroke();
  if(!frosted){ctx.fillStyle='rgba(69,117,84,.45)';ctx.beginPath();ctx.arc(-len*.27,13,11,Math.PI,0);ctx.arc(len*.28,14,14,Math.PI,0);ctx.fill()}
  ctx.restore();
}

function drawFurniture(item){
  if(item.type==='sofa')return drawSofa(item);
  if(item.type==='dining')return drawDining(item);
  if(item.type==='island')return drawIsland(item);
  if(item.type==='shelf')return drawShelf(item);
  if(item.type==='tower')return drawCatTower(item);
  if(item.type==='plant')return drawPlant(item);
  if(item.type==='cabinet')return drawCabinet(item);
  if(item.type==='bed')return drawBed(item);
  if(item.type==='wardrobe')return drawWardrobe(item);
  if(item.type==='bath')return drawBath(item);
  if(item.type==='vanity')return drawVanity(item);
  if(item.type==='toilet')return drawToilet(item);
  if(item.type==='console')return drawConsole(item);
  drawIsoBox(item,item.height,item.palette);
}

function drawSofa(item){
  drawIsoBox(item,25,item.palette);
  drawIsoBox({x:item.x,y:item.y,w:item.w,h:.27},52,{top:'#6f9899',x:'#416c70',y:'#365d61',line:'#284b4e'});
  drawIsoBox({x:item.x,y:item.y,w:.30,h:item.h},37,{top:'#6f9899',x:'#416c70',y:'#365d61',line:'#284b4e'});
  drawIsoBox({x:item.x+item.w-.30,y:item.y,w:.30,h:item.h},37,{top:'#6f9899',x:'#416c70',y:'#365d61',line:'#284b4e'});
  for(let i=0;i<3;i++){
    const cushion={x:item.x+.38+i*.92,y:item.y+.32,w:.76,h:.45};
    polygon(rectCorners(cushion,30),i===1?'#d99354':'#608b8e','rgba(27,70,73,.45)',.8);
  }
}

function drawDining(item){
  const chairs=[
    {x:item.x-.39,y:item.y+.24,w:.35,h:.52},{x:item.x-.39,y:item.y+1.15,w:.35,h:.52},
    {x:item.x+item.w+.04,y:item.y+.24,w:.35,h:.52},{x:item.x+item.w+.04,y:item.y+1.15,w:.35,h:.52}
  ];
  for(const chair of chairs)drawIsoBox(chair,21,{top:'#8d6750',x:'#644535',y:'#51372c',line:'#3e2b23'});
  drawIsoBox(item,item.height,item.palette);
  const centre=iso(item.x+item.w*.5,item.y+item.h*.5,item.height+3);
  ctx.save();ctx.translate(centre.x,centre.y);ctx.fillStyle='#e9dfc7';ctx.beginPath();ctx.ellipse(0,0,14,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#789269';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(Math.cos(a)*7,Math.sin(a)*2.6,2.6,0,Math.PI*2);ctx.fill()}ctx.restore();
}

function drawIsland(item){
  drawIsoBox(item,item.height,item.palette);
  const hob={x:item.x+.30,y:item.y+.18,w:.72,h:.52};
  polygon(rectCorners(hob,item.height+2),'#586063','#3c4244',1);
  for(let i=0;i<4;i++){
    const px=hob.x+.17+(i%2)*.34,py=hob.y+.15+Math.floor(i/2)*.23,p=iso(px,py,item.height+3);
    ctx.strokeStyle='#242a2b';ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.stroke();
  }
  const sink={x:item.x+1.72,y:item.y+.18,w:.75,h:.52};
  polygon(rectCorners(sink,item.height+2),'#aeb7b7','#747d7d',1);
}

function drawShelf(item){
  drawIsoBox(item,item.height,item.palette);
  const base=iso(item.x+item.w,item.y+item.h*.5,item.height-14);
  ctx.save();ctx.translate(base.x,base.y);ctx.rotate(Math.atan2(TILE_H/2,-TILE_W/2));
  for(let row=0;row<3;row++)for(let i=0;i<5;i++){
    const colours=['#a95746','#d9b95c','#4e7d81','#7f6787','#d68242'];
    ctx.fillStyle=colours[(row+i)%colours.length];ctx.fillRect(-28+i*11,-29+row*18,7,14);
  }
  ctx.restore();
}

function drawCatTower(item){
  const base=iso(item.x+item.w*.5,item.y+item.h*.5,0);
  const top=iso(item.x+item.w*.5,item.y+item.h*.5,item.height);
  ctx.save();ctx.strokeStyle='#9b7040';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(top.x,top.y);ctx.stroke();
  ctx.strokeStyle='#d9b277';ctx.lineWidth=2.5;for(let i=0;i<9;i++){const y=lerp(base.y,top.y,i/8);ctx.beginPath();ctx.moveTo(base.x-4,y);ctx.lineTo(base.x+4,y-2);ctx.stroke()}ctx.restore();
  drawIsoBox({x:item.x-.12,y:item.y-.12,w:item.w+.24,h:item.h+.24},8,item.palette);
  const platform={x:item.x-.20,y:item.y-.20,w:item.w+.40,h:item.h+.40};polygon(rectCorners(platform,item.height),item.palette.top,item.palette.line,1);
}

function drawCabinet(item){
  drawIsoBox(item,item.height,item.palette);
  const handle=iso(item.x+item.w,item.y+item.h*.52,item.height*.52);
  ctx.fillStyle='#555b5a';ctx.beginPath();ctx.arc(handle.x,handle.y,2.6,0,Math.PI*2);ctx.fill();
}

function drawPlant(item){
  const centre=iso(item.x+item.w*.5,item.y+item.h*.5,0);
  ctx.save();ctx.fillStyle='rgba(35,31,24,.22)';ctx.beginPath();ctx.ellipse(centre.x,centre.y+2,15,6,0,0,Math.PI*2);ctx.fill();ctx.restore();
  const potTop=iso(item.x+item.w*.5,item.y+item.h*.5,24);
  ctx.fillStyle='#a55d3e';ctx.beginPath();ctx.moveTo(potTop.x-11,potTop.y);ctx.lineTo(potTop.x+11,potTop.y);ctx.lineTo(centre.x+8,centre.y);ctx.lineTo(centre.x-8,centre.y);ctx.closePath();ctx.fill();
  ctx.fillStyle='#477356';
  for(let i=0;i<8;i++){
    const a=-Math.PI*.95+i*Math.PI*.27;
    ctx.save();ctx.translate(potTop.x,potTop.y-2);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,-16,6,19,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}

function drawBed(item){
  drawIsoBox(item,18,{top:'#8e6e5d',x:'#6f5447',y:'#60483e',line:'#4f3b33'});
  const mattress={x:item.x+.08,y:item.y+.08,w:item.w-.16,h:item.h-.16};
  drawIsoBox(mattress,item.height,{top:'#e6d7cc',x:'#c5b2a5',y:'#b19d91',line:'#957f73'});
  const blanket={x:item.x+.12,y:item.y+1.05,w:item.w-.24,h:1.02};
  polygon(rectCorners(blanket,item.height+1),'#7f9ba1','#5d777d',1);
  for(let i=0;i<2;i++){
    const pillow={x:item.x+.26+i*1.16,y:item.y+.22,w:.92,h:.54};
    polygon(rectCorners(pillow,item.height+2),'#fff5e6','#cdbdab',1);
  }
}

function drawWardrobe(item){
  drawIsoBox(item,item.height,item.palette);
  const seam=iso(item.x+item.w,item.y+item.h*.5,item.height*.55);
  ctx.save();ctx.fillStyle='#775c4e';ctx.beginPath();ctx.arc(seam.x-4,seam.y,2.2,0,Math.PI*2);ctx.arc(seam.x+4,seam.y+2,2.2,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawBath(item){
  drawIsoBox(item,item.height,item.palette);
  const inner={x:item.x+.18,y:item.y+.16,w:item.w-.36,h:item.h-.32};
  polygon(rectCorners(inner,item.height+1),'#9fd2dd','#6fa5b0',1.2);
  const bubbles=[{x:.28,y:.32,r:3},{x:.58,y:.67,r:2.3},{x:.77,y:.30,r:2.7},{x:.42,y:.52,r:1.8}];
  for(const bubble of bubbles){
    const p=iso(inner.x+inner.w*bubble.x,inner.y+inner.h*bubble.y,item.height+3);
    ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.arc(p.x,p.y,bubble.r,0,Math.PI*2);ctx.fill();
  }
}

function drawVanity(item){
  drawIsoBox(item,item.height,item.palette);
  const basin={x:item.x+.08,y:item.y+.30,w:item.w-.16,h:.72};
  polygon(rectCorners(basin,item.height+2),'#edf3f2','#8d9c9e',1);
  const mirror=iso(item.x+item.w*.5,item.y+.08,item.height+35);
  ctx.save();ctx.translate(mirror.x,mirror.y);ctx.rotate(Math.atan2(TILE_H/2,TILE_W/2));ctx.fillStyle='#7d8b8d';ctx.fillRect(-16,-23,32,46);ctx.fillStyle='#dce9eb';ctx.fillRect(-12,-19,24,38);ctx.restore();
}

function drawToilet(item){
  drawIsoBox({x:item.x+.08,y:item.y,w:item.w-.16,h:.34},item.height,{top:'#eef1ed',x:'#bfc9c7',y:'#aab7b5',line:'#8f9c9a'});
  const p=iso(item.x+item.w*.5,item.y+item.h*.64,18);
  ctx.save();ctx.fillStyle='#f4f7f4';ctx.beginPath();ctx.ellipse(p.x,p.y,15,8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9eaaa8';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#c4d7da';ctx.beginPath();ctx.ellipse(p.x,p.y,8,4,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawConsole(item){
  drawIsoBox(item,item.height,item.palette);
  const bowl=iso(item.x+item.w*.5,item.y+item.h*.5,item.height+3);
  ctx.fillStyle='#d9cfb7';ctx.beginPath();ctx.ellipse(bowl.x,bowl.y,9,4,0,0,Math.PI*2);ctx.fill();
}
