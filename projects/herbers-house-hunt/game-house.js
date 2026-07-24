'use strict';

function drawFloorDetails(){
  // Soft reflections on the large glossy cream tiles.
  ctx.save();ctx.globalAlpha=.17;
  for(let i=0;i<22;i++){
    const x=.8+(i%6)*1.85,y=3.9+Math.floor(i/6)*2.05,p=iso(x,y,2);
    ctx.fillStyle='#f8f5ec';ctx.beginPath();ctx.ellipse(p.x,p.y,7,2.1,-.18,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();

  // The visible cable crossing the yellow rug in the photographs.
  const cable=[{x:7.5,y:6.4},{x:8.2,y:7.15},{x:9.3,y:7.62},{x:10.0,y:8.38},{x:10.78,y:8.78}].map(p=>iso(p.x,p.y,3));
  ctx.save();ctx.strokeStyle='rgba(29,29,30,.68)';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cable[0].x,cable[0].y);for(let i=1;i<cable.length;i++)ctx.lineTo(cable[i].x,cable[i].y);ctx.stroke();ctx.restore();

  // Herbert's food bowls beside the real kitchen entrance.
  for(const [x,y,fill] of [[.78,3.26,'#be4235'],[1.18,3.28,'#d8d9d4']]){
    const p=iso(x,y,4);ctx.fillStyle='rgba(48,34,24,.18)';ctx.beginPath();ctx.ellipse(p.x,p.y+3,9,3.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(p.x,p.y,9,4.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#49372c';ctx.beginPath();ctx.ellipse(p.x,p.y,5.3,2.4,0,0,Math.PI*2);ctx.fill();
  }

  // Window sun patch and the three connecting thresholds.
  const beam={x:10.55,y:2.10,w:1.05,h:2.25};ctx.save();ctx.globalAlpha=.11+.025*Math.sin(elapsed*1.4);polygon(rectCorners(beam,2.5),'#fff4ad',null);ctx.restore();
  drawDoorThreshold(11.86,9.02,12.10,10.62);
  drawDoorThreshold(13.86,2.20,14.10,3.82);
  drawDoorThreshold(13.86,9.00,14.10,10.62);

  drawRoomLabel('OPEN-PLAN LIVING ROOM',5.0,12.15);
  drawRoomLabel('KITCHEN',3.25,3.35);
  drawRoomLabel('HALLWAY',12.95,6.65);
  drawRoomLabel('BEDROOM',16.45,5.95);
  drawRoomLabel('BATHROOM',16.55,13.25);
}

function drawDoorThreshold(x1,y1,x2,y2){
  polygon(rectCorners({x:x1,y:y1,w:x2-x1,h:y2-y1},2),'#8d6b4c','rgba(66,46,32,.35)',.8);
}

function drawRoomLabel(text,x,y){
  const p=iso(x,y,3);ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.20;ctx.fillStyle='#263d46';ctx.font='900 9px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(text,0,0);ctx.restore();
}

function drawWalls(){
  drawIsoBox({x:0,y:-.16,w:COLS,h:.20},75,palettes.wall);
  drawIsoBox({x:-.16,y:0,w:.20,h:ROWS},75,palettes.wall);

  // Long bank of windows beside the sofa and round table.
  drawWindow(6.72,-.13,1.55,'north',false);
  drawWindow(8.36,-.13,1.55,'north',false);
  drawWindow(10.00,-.13,1.55,'north',false);
  drawWindow(-.13,4.25,2.00,'west',false);

  drawKitchenWallDetails();
  drawLivingWallDetails();
}

function drawInteriorWall(item){drawIsoBox(item,item.height,palettes.wall)}

function drawWindow(x,y,length,orientation,frosted=false){
  const z=45;let a,b;
  if(orientation==='north'){a=iso(x,y,z);b=iso(x+length,y,z)}else{a=iso(x,y,z);b=iso(x,y+length,z)}
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2);ctx.rotate(angle);
  ctx.fillStyle='#d6cfc3';ctx.fillRect(-len/2-5,-24,len+10,48);
  const sky=ctx.createLinearGradient(0,-19,0,19);sky.addColorStop(0,frosted?'#d8e8ea':'#9fcbd9');sky.addColorStop(1,frosted?'#f0f5f3':'#e9f3ea');ctx.fillStyle=sky;ctx.fillRect(-len/2,-19,len,38);
  ctx.strokeStyle='rgba(255,255,255,.82)';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(0,19);ctx.stroke();
  if(!frosted){ctx.fillStyle='rgba(64,113,79,.42)';ctx.beginPath();ctx.arc(-len*.28,14,11,Math.PI,0);ctx.arc(len*.28,14,14,Math.PI,0);ctx.fill()}
  ctx.strokeStyle='rgba(110,101,88,.35)';ctx.lineWidth=1;for(let yy=-14;yy<17;yy+=6){ctx.beginPath();ctx.moveTo(-len/2,yy);ctx.lineTo(len/2,yy);ctx.stroke()}
  ctx.restore();
}

function drawKitchenWallDetails(){
  // Open cream cupboard with bowls and mugs.
  const p=iso(.46,-.10,53);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(TILE_H/2,TILE_W/2));ctx.fillStyle='#eee9de';ctx.fillRect(-25,-34,50,68);ctx.strokeStyle='#a8a094';ctx.lineWidth=2;ctx.strokeRect(-25,-34,50,68);for(let y=-12;y<25;y+=19){ctx.beginPath();ctx.moveTo(-23,y);ctx.lineTo(23,y);ctx.stroke()}ctx.fillStyle='#8d958f';ctx.beginPath();ctx.ellipse(-10,-21,8,3,0,0,Math.PI*2);ctx.ellipse(11,-2,8,3,0,0,Math.PI*2);ctx.ellipse(-5,18,7,3,0,0,Math.PI*2);ctx.fill();ctx.restore();

  // Red cow butcher-chart artwork over the sink.
  const cow=iso(3.15,-.14,51);ctx.save();ctx.translate(cow.x,cow.y);ctx.rotate(Math.atan2(TILE_H/2,TILE_W/2));ctx.strokeStyle='#bd3346';ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(-28,3);ctx.lineTo(-21,-10);ctx.lineTo(14,-10);ctx.lineTo(27,-2);ctx.lineTo(18,9);ctx.lineTo(-17,9);ctx.closePath();ctx.stroke();ctx.lineWidth=1.1;for(let x=-13;x<16;x+=9){ctx.beginPath();ctx.moveTo(x,-8);ctx.lineTo(x,7);ctx.stroke()}ctx.restore();

  // Knife strip and stainless extractor over the hob return.
  const knives=iso(5.72,-.14,49);ctx.save();ctx.translate(knives.x,knives.y);ctx.rotate(Math.atan2(TILE_H/2,TILE_W/2));ctx.strokeStyle='#202426';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(22,0);ctx.stroke();for(let i=0;i<4;i++){ctx.strokeStyle=i===0?'#1b2023':'#c5c7c3';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-16+i*10,-2);ctx.lineTo(-16+i*10,17+i%2*4);ctx.stroke()}ctx.restore();
  const hood=iso(6.10,-.12,70);ctx.save();ctx.translate(hood.x,hood.y);ctx.rotate(Math.atan2(TILE_H/2,TILE_W/2));ctx.fillStyle='#888d8e';ctx.fillRect(-25,-12,50,24);ctx.fillStyle='#6f7475';ctx.fillRect(-9,-58,18,47);ctx.restore();
}

function drawLivingWallDetails(){
  // Large TV over the slatted wooden media unit.
  const tv=iso(9.55,-.13,55);ctx.save();ctx.translate(tv.x,tv.y);ctx.rotate(Math.atan2(TILE_H/2,TILE_W/2));ctx.fillStyle='#0b0d0e';ctx.fillRect(-61,-37,122,74);ctx.strokeStyle='#313538';ctx.lineWidth=3;ctx.strokeRect(-61,-37,122,74);const shine=ctx.createLinearGradient(-55,-30,55,30);shine.addColorStop(0,'rgba(85,123,140,.18)');shine.addColorStop(.55,'rgba(12,16,18,.02)');shine.addColorStop(1,'rgba(115,145,158,.10)');ctx.fillStyle=shine;ctx.fillRect(-56,-32,112,64);ctx.restore();

  // Hall mirror and intercom visible in the supplied wide photo.
  const mirror=iso(11.76,6.40,47);ctx.save();ctx.translate(mirror.x,mirror.y);ctx.rotate(Math.atan2(TILE_H/2,-TILE_W/2));ctx.strokeStyle='#454a4d';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,17,28,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(155,195,204,.17)';ctx.beginPath();ctx.ellipse(0,0,13,24,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawFurniture(item){
  if(item.type==='kitchenBack')return drawKitchenBack(item);
  if(item.type==='kitchenReturn')return drawKitchenReturn(item);
  if(item.type==='kitchenOpen')return;
  if(item.type==='bin')return drawBin(item);
  if(item.type==='sofa')return drawSofa(item);
  if(item.type==='dining')return drawDining(item);
  if(item.type==='shelf')return drawShelf(item);
  if(item.type==='gymRack')return drawGymRack(item);
  if(item.type==='tower')return drawCatTower(item);
  if(item.type==='catCube')return drawCatCube(item);
  if(item.type==='tvUnit')return drawTvUnit(item);
  if(item.type==='chair')return drawChair(item);
  if(item.type==='keyboard')return drawKeyboard(item);
  if(item.type==='tripod')return drawTripod(item);
  if(item.type==='plant')return drawPlant(item);
  if(item.type==='cabinet')return drawCabinet(item);
  if(item.type==='bed')return drawBed(item);
  if(item.type==='nightstand')return drawNightstand(item);
  if(item.type==='wardrobe')return drawWardrobe(item);
  if(item.type==='bath')return drawBath(item);
  if(item.type==='vanity')return drawVanity(item);
  if(item.type==='toilet')return drawToilet(item);
  if(item.type==='console')return drawConsole(item);
  drawIsoBox(item,item.height,item.palette);
  if(item.climbable)drawJumpableRim(item);
}

function drawJumpableRim(item){
  ctx.save();ctx.globalAlpha=.34+.08*Math.sin(elapsed*2.2);polygon(rectCorners(item,item.height+1),null,'#f1c86c',1.05);ctx.restore();
}

function drawKitchenBack(item){
  drawIsoBox(item,item.height,item.palette);
  const top={x:item.x-.02,y:item.y-.02,w:item.w+.04,h:item.h+.04};polygon(rectCorners(top,item.height+2),'#252829','#090a0a',1.1);
  for(let i=1;i<7;i++){const a=iso(item.x+i*item.w/7,item.y+item.h,item.height-4),b=iso(item.x+i*item.w/7,item.y+item.h,3);ctx.strokeStyle='rgba(110,106,101,.55)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
  const sink={x:item.x+2.45,y:item.y+.13,w:1.30,h:.53};polygon(rectCorners(sink,item.height+3),'#7f898b','#4d5658',1);const tap=iso(sink.x+sink.w*.5,sink.y+.18,item.height+11);ctx.strokeStyle='#bac3c4';ctx.lineWidth=2.7;ctx.beginPath();ctx.arc(tap.x,tap.y,9,Math.PI,Math.PI*2);ctx.stroke();
  const oven={x:item.x+.18,y:item.y+.12,w:.92,h:.56};drawIsoBox(oven,item.height+23,{top:'#33383a',x:'#202426',y:'#151819',line:'#0b0c0d'});
  drawJumpableRim(item);
}

function drawKitchenReturn(item){
  drawIsoBox(item,item.height,item.palette);const top={x:item.x-.02,y:item.y-.02,w:item.w+.04,h:item.h+.04};polygon(rectCorners(top,item.height+2),'#252829','#090a0a',1.1);
  const hob={x:item.x+.14,y:item.y+.98,w:.76,h:1.08};polygon(rectCorners(hob,item.height+3),'#3b4042','#111415',1);for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const p=iso(hob.x+.21+xx*.35,hob.y+.27+yy*.43,item.height+5);ctx.strokeStyle='#151819';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,4.5,0,Math.PI*2);ctx.stroke()}
  const ovenFront=[iso(item.x+item.w,item.y+.95,5),iso(item.x+item.w,item.y+2.12,5),iso(item.x+item.w,item.y+2.12,36),iso(item.x+item.w,item.y+.95,36)];polygon(ovenFront,'#22272a','#0d1012',1.2);
  const red=iso(item.x+.52,item.y+2.67,item.height+8);ctx.fillStyle='#a72b27';ctx.fillRect(red.x-9,red.y-11,19,15);
  for(let i=0;i<4;i++){const p=iso(item.x+.16+i*.17,item.y+.45,item.height+12);ctx.fillStyle=i%2?'#365b46':'#68532f';ctx.fillRect(p.x-2,p.y-12,4,12);ctx.beginPath();ctx.arc(p.x,p.y-12,2,0,Math.PI*2);ctx.fill()}
  drawJumpableRim(item);
}

function drawBin(item){
  const base=iso(item.x+item.w*.5,item.y+item.h*.5,0),top=iso(item.x+item.w*.5,item.y+item.h*.5,item.height);ctx.fillStyle='rgba(22,20,18,.22)';ctx.beginPath();ctx.ellipse(base.x,base.y+2,13,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#222628';ctx.beginPath();ctx.moveTo(top.x-11,top.y);ctx.lineTo(top.x+11,top.y);ctx.lineTo(base.x+10,base.y);ctx.lineTo(base.x-10,base.y);ctx.closePath();ctx.fill();ctx.fillStyle='#4c4a45';ctx.beginPath();ctx.ellipse(top.x,top.y,12,4.5,0,0,Math.PI*2);ctx.fill();
}

function drawSofa(item){
  drawIsoBox(item,25,item.palette);
  drawIsoBox({x:item.x,y:item.y,w:item.w,h:.28},53,{top:'#e0ddd6',x:'#b5b1aa',y:'#9c9993',line:'#817e78'});
  drawIsoBox({x:item.x,y:item.y,w:.31,h:item.h},38,item.palette);drawIsoBox({x:item.x+item.w-.31,y:item.y,w:.31,h:item.h},38,item.palette);
  for(let i=0;i<4;i++){const cushion={x:item.x+.37+i*.65,y:item.y+.34,w:.57,h:.48};polygon(rectCorners(cushion,30),i===3?'#c9c4bb':'#dedad3','rgba(105,101,95,.42)',.8)}
  drawJumpableRim(item);
}

function drawDining(item){
  const centre=iso(item.x+item.w*.5,item.y+item.h*.5,item.height);ctx.fillStyle='#181b1d';ctx.beginPath();ctx.ellipse(centre.x,centre.y,item.w*TILE_W*.27,item.h*TILE_H*.29,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#070809';ctx.lineWidth=2;ctx.stroke();
  const base=iso(item.x+item.w*.5,item.y+item.h*.5,0);ctx.strokeStyle='#292d2f';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(centre.x,centre.y);ctx.stroke();ctx.lineWidth=4;for(const a of [0,2.1,4.2]){ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(base.x+Math.cos(a)*21,base.y+Math.sin(a)*8);ctx.stroke()}
  ctx.save();ctx.translate(centre.x+11,centre.y-2);ctx.rotate(-.18);ctx.fillStyle='#376f9b';ctx.fillRect(-14,-9,28,18);ctx.fillStyle='#e9eef0';ctx.font='700 5px sans-serif';ctx.textAlign='center';ctx.fillText('DATA',0,-1);ctx.restore();ctx.fillStyle='#dce6e3';ctx.fillRect(centre.x-24,centre.y-17,5,17);
  drawJumpableRim(item);
}

function drawChair(item){
  drawIsoBox(item,9,{top:'#494e50',x:'#2f3436',y:'#24282a',line:'#171a1c'});const a=iso(item.x,item.y,item.height+3),b=iso(item.x,item.y,item.height+33);ctx.strokeStyle='#202426';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}

function drawShelf(item){
  const base=rectCorners(item,0),top=rectCorners(item,item.height);ctx.strokeStyle='#14181a';ctx.lineWidth=4.5;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(base[i].x,base[i].y);ctx.lineTo(top[i].x,top[i].y);ctx.stroke()}
  for(const z of [11,28,46,63,78])polygon(rectCorners({x:item.x-.07,y:item.y-.10,w:item.w+.14,h:item.h+.20},z),'#25292b','#0e1112',1);
  // Books stacked across the top, terrarium, paper bowl, bottles and lower books.
  for(let i=0;i<7;i++){const p=iso(item.x+.05,item.y+.28+i*.48,83+i%2);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.17+i*.035);ctx.fillStyle=['#7e4c36','#486b72','#b88b4c','#4f5a48'][i%4];ctx.fillRect(-16,-3,34,6);ctx.restore()}
  const tank={x:item.x-.01,y:item.y+.75,w:item.w+.02,h:.92};drawIsoBox(tank,50,{top:'rgba(161,198,194,.34)',x:'rgba(96,142,143,.32)',y:'rgba(74,117,120,.31)',line:'#35494b'});const tp=iso(item.x+.38,item.y+1.20,56);ctx.fillStyle='#5b6b43';ctx.beginPath();ctx.arc(tp.x,tp.y,7,0,Math.PI*2);ctx.fill();
  const bowl=iso(item.x+.35,item.y+2.55,49);ctx.fillStyle='#8f806c';ctx.beginPath();ctx.ellipse(bowl.x,bowl.y,13,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e0d3bd';for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(bowl.x-8+i*2.7,bowl.y-3-Math.abs(3-i),2.6,0,Math.PI*2);ctx.fill()}
  for(let i=0;i<7;i++){const p=iso(item.x+.17,item.y+.35+i*.52,30);ctx.fillStyle=['#365a42','#6e3c32','#4a6d61','#72542b'][i%4];ctx.fillRect(p.x-2.5,p.y-16,5,16);ctx.beginPath();ctx.arc(p.x,p.y-16,2.5,0,Math.PI*2);ctx.fill()}
  for(let i=0;i<6;i++){const p=iso(item.x+.15,item.y+.52+i*.52,14);ctx.fillStyle=['#a15f45','#4d7b86','#c6a04f','#6d5b7b'][i%4];ctx.fillRect(p.x-3,p.y-21,6,21)}
  drawJumpableRim(item);
}

function drawGymRack(item){
  drawIsoBox(item,7,item.palette);for(let i=0;i<5;i++){const p=iso(item.x+.24+i*.38,item.y+item.h*.5,17);ctx.fillStyle='#202426';ctx.beginPath();ctx.arc(p.x,p.y,9-i%2*2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#5b6163';ctx.lineWidth=2;ctx.stroke()}
  const a=iso(item.x-.22,item.y+.12,9),b=iso(item.x+item.w+.22,item.y+.12,9);ctx.strokeStyle='#202528';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();const roller=iso(item.x+1.10,item.y+.45,22);ctx.fillStyle='#d4869b';ctx.beginPath();ctx.ellipse(roller.x,roller.y,8,17,.1,0,Math.PI*2);ctx.fill();
}

function drawCatTower(item){
  const base=iso(item.x+item.w*.5,item.y+item.h*.5,0),top=iso(item.x+item.w*.5,item.y+item.h*.5,item.height);ctx.strokeStyle='#997043';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(top.x,top.y);ctx.stroke();ctx.strokeStyle='#d4ae72';ctx.lineWidth=2.2;for(let i=0;i<10;i++){const y=lerp(base.y,top.y,i/9);ctx.beginPath();ctx.moveTo(base.x-4,y);ctx.lineTo(base.x+4,y-2);ctx.stroke()}drawIsoBox({x:item.x-.12,y:item.y-.12,w:item.w+.24,h:item.h+.24},7,item.palette);polygon(rectCorners({x:item.x-.18,y:item.y-.18,w:item.w+.36,h:item.h+.36},item.height),item.palette.top,item.palette.line,1);drawJumpableRim(item);
}

function drawCatCube(item){
  drawIsoBox(item,item.height,{top:'#555b5d',x:'#343a3c',y:'#272c2e',line:'#171a1c'});const p=iso(item.x+item.w,item.y+item.h*.52,item.height*.48);ctx.fillStyle='#101315';ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.fill();drawJumpableRim(item);
}

function drawTvUnit(item){
  drawIsoBox(item,item.height,item.palette);for(let i=0;i<9;i++){const a=iso(item.x+.18+i*.36,item.y+item.h,item.height-3),b=iso(item.x+.18+i*.36,item.y+item.h,3);ctx.strokeStyle='rgba(57,34,21,.62)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}polygon(rectCorners({x:item.x+.45,y:item.y+.12,w:2.55,h:.32},item.height+3),'#1a1e20','#090b0c',1);
}

function drawKeyboard(item){
  drawIsoBox(item,item.height,item.palette);const keyboard={x:item.x+.14,y:item.y+.12,w:item.w-.28,h:.40};polygon(rectCorners(keyboard,item.height+2),'#bf782e','#6b3e1c',1);for(let i=0;i<17;i++){const a=iso(keyboard.x+i*keyboard.w/17,keyboard.y+.04,item.height+3),b=iso(keyboard.x+i*keyboard.w/17,keyboard.y+keyboard.h-.04,item.height+3);ctx.strokeStyle=i%3===0?'#1c1c1c':'#e7decc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
}

function drawTripod(item){
  const base=iso(item.x+item.w*.5,item.y+item.h*.5,0),top=iso(item.x+item.w*.5,item.y+item.h*.5,item.height);ctx.strokeStyle='#33383b';ctx.lineWidth=3;for(const dx of [-16,0,16]){ctx.beginPath();ctx.moveTo(base.x+dx,base.y);ctx.lineTo(top.x,top.y+13);ctx.stroke()}ctx.fillStyle='#343a3d';ctx.beginPath();ctx.ellipse(top.x,top.y,17,11,-.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f3dd9a';ctx.beginPath();ctx.ellipse(top.x+4,top.y+1,8,5,-.2,0,Math.PI*2);ctx.fill();
}

function drawPlant(item){
  const centre=iso(item.x+item.w*.5,item.y+item.h*.5,0),potTop=iso(item.x+item.w*.5,item.y+item.h*.5,23);ctx.fillStyle='rgba(35,31,24,.20)';ctx.beginPath();ctx.ellipse(centre.x,centre.y+2,14,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8c7662';ctx.beginPath();ctx.moveTo(potTop.x-10,potTop.y);ctx.lineTo(potTop.x+10,potTop.y);ctx.lineTo(centre.x+7,centre.y);ctx.lineTo(centre.x-7,centre.y);ctx.closePath();ctx.fill();ctx.fillStyle='#477356';for(let i=0;i<8;i++){const a=-Math.PI*.95+i*Math.PI*.27;ctx.save();ctx.translate(potTop.x,potTop.y-2);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,-15,5.5,18,0,0,Math.PI*2);ctx.fill();ctx.restore()}
}

function drawCabinet(item){drawIsoBox(item,item.height,item.palette);const p=iso(item.x+item.w,item.y+item.h*.52,item.height*.52);ctx.fillStyle='#555b5a';ctx.beginPath();ctx.arc(p.x,p.y,2.6,0,Math.PI*2);ctx.fill()}

function drawBed(item){
  drawIsoBox(item,18,{top:'#8e6e5d',x:'#6f5447',y:'#60483e',line:'#4f3b33'});const mattress={x:item.x+.08,y:item.y+.08,w:item.w-.16,h:item.h-.16};drawIsoBox(mattress,item.height,{top:'#e6d7cc',x:'#c5b2a5',y:'#b19d91',line:'#957f73'});polygon(rectCorners({x:item.x+.12,y:item.y+1.02,w:item.w-.24,h:1.05},item.height+1),'#7f9ba1','#5d777d',1);for(let i=0;i<2;i++)polygon(rectCorners({x:item.x+.25+i*1.14,y:item.y+.21,w:.90,h:.52},item.height+2),'#fff5e6','#cdbdab',1);drawJumpableRim(item);
}

function drawNightstand(item){drawIsoBox(item,item.height,item.palette);const p=iso(item.x+item.w*.5,item.y+item.h*.5,item.height+10);ctx.fillStyle='#e1c16d';ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();drawJumpableRim(item)}

function drawWardrobe(item){drawIsoBox(item,item.height,item.palette);const seam=iso(item.x+item.w,item.y+item.h*.5,item.height*.55);ctx.fillStyle='#775c4e';ctx.beginPath();ctx.arc(seam.x-4,seam.y,2.2,0,Math.PI*2);ctx.arc(seam.x+4,seam.y+2,2.2,0,Math.PI*2);ctx.fill()}

function drawBath(item){
  drawIsoBox(item,item.height,item.palette);const inner={x:item.x+.18,y:item.y+.16,w:item.w-.36,h:item.h-.32};polygon(rectCorners(inner,item.height+1),'#9fd2dd','#6fa5b0',1.2);for(const bubble of [{x:.28,y:.32,r:3},{x:.58,y:.67,r:2.3},{x:.77,y:.30,r:2.7},{x:.42,y:.52,r:1.8}]){const p=iso(inner.x+inner.w*bubble.x,inner.y+inner.h*bubble.y,item.height+3);ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.arc(p.x,p.y,bubble.r,0,Math.PI*2);ctx.fill()}drawJumpableRim(item);
}

function drawVanity(item){
  drawIsoBox(item,item.height,item.palette);polygon(rectCorners({x:item.x+.08,y:item.y+.30,w:item.w-.16,h:.72},item.height+2),'#edf3f2','#8d9c9e',1);const mirror=iso(item.x+item.w*.5,item.y+.08,item.height+35);ctx.save();ctx.translate(mirror.x,mirror.y);ctx.rotate(Math.atan2(TILE_H/2,TILE_W/2));ctx.fillStyle='#7d8b8d';ctx.fillRect(-16,-23,32,46);ctx.fillStyle='#dce9eb';ctx.fillRect(-12,-19,24,38);ctx.restore();drawJumpableRim(item);
}

function drawToilet(item){
  drawIsoBox({x:item.x+.08,y:item.y,w:item.w-.16,h:.34},item.height,{top:'#eef1ed',x:'#bfc9c7',y:'#aab7b5',line:'#8f9c9a'});const p=iso(item.x+item.w*.5,item.y+item.h*.64,18);ctx.fillStyle='#f4f7f4';ctx.beginPath();ctx.ellipse(p.x,p.y,14,7.5,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9eaaa8';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#c4d7da';ctx.beginPath();ctx.ellipse(p.x,p.y,7,3.5,0,0,Math.PI*2);ctx.fill();
}

function drawConsole(item){drawIsoBox(item,item.height,item.palette);const bowl=iso(item.x+item.w*.5,item.y+item.h*.5,item.height+3);ctx.fillStyle='#d9cfb7';ctx.beginPath();ctx.ellipse(bowl.x,bowl.y,9,4,0,0,Math.PI*2);ctx.fill();drawJumpableRim(item)}
