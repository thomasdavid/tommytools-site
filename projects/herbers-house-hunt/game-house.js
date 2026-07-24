'use strict';

  function drawFloorDetails(){
    ctx.save();
    ctx.globalAlpha=.35;
    for(let i=0;i<12;i++){
      const x=6.2+(i%4)*1.35;
      const y=5.15+Math.floor(i/4)*1.45;
      const p=iso(x,y,2);
      ctx.fillStyle='#809a96';
      ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();

    const scratch=rectCorners({x:4.55,y:7.36,w:.9,h:1.15},2);
    polygon(scratch,'#b88b58','#8c633c',1);
    ctx.save();ctx.strokeStyle='rgba(92,55,30,.5)';ctx.lineWidth=1.5;
    for(let i=1;i<5;i++){
      const a=iso(4.55+i*.18,7.36,3),b=iso(4.55+i*.18,8.51,3);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.restore();
  }

  function drawWalls(){
    drawIsoBox({x:0,y:-.16,w:COLS,h:.20},78,{top:'#f1e9db',x:'#c7b9a3',y:'#b7aa97',line:'#988a79'});
    drawIsoBox({x:-.16,y:0,w:.20,h:ROWS},78,{top:'#f4ecdf',x:'#cbbca7',y:'#b9ab98',line:'#988a79'});

    drawWindow(2.1,-.13,2.1,'north');
    drawWindow(8.0,-.13,2.25,'north');
    drawWindow(-.13,2.4,2.0,'west');

    const picture=iso(5.95,-.14,48);
    ctx.save();ctx.translate(picture.x,picture.y);ctx.rotate(Math.atan2(TILE_H/2,TILE_W/2));
    ctx.fillStyle='#67473a';ctx.fillRect(-30,-19,60,38);
    ctx.fillStyle='#f4d9a6';ctx.fillRect(-25,-14,50,28);
    ctx.fillStyle='#d97824';ctx.beginPath();ctx.arc(0,-1,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#7f3b16';ctx.beginPath();ctx.moveTo(-8,-7);ctx.lineTo(-3,-17);ctx.lineTo(1,-7);ctx.fill();ctx.beginPath();ctx.moveTo(8,-7);ctx.lineTo(3,-17);ctx.lineTo(-1,-7);ctx.fill();
    ctx.restore();
  }

  function drawWindow(x,y,length,orientation){
    const z=45;
    let a,b;
    if(orientation==='north'){a=iso(x,y,z);b=iso(x+length,y,z)}else{a=iso(x,y,z);b=iso(x,y+length,z)}
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2);ctx.rotate(angle);
    ctx.fillStyle='#8c7968';ctx.fillRect(-len/2-5,-24,len+10,48);
    const sky=ctx.createLinearGradient(0,-18,0,18);sky.addColorStop(0,'#a9d7e4');sky.addColorStop(1,'#e7f2e9');ctx.fillStyle=sky;ctx.fillRect(-len/2,-19,len,38);
    ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(0,19);ctx.stroke();
    ctx.fillStyle='rgba(69,117,84,.45)';ctx.beginPath();ctx.arc(-len*.27,14,12,Math.PI,0);ctx.arc(len*.28,15,15,Math.PI,0);ctx.fill();
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
      {x:item.x-.42,y:item.y+.25,w:.38,h:.55},{x:item.x-.42,y:item.y+1.18,w:.38,h:.55},
      {x:item.x+item.w+.04,y:item.y+.25,w:.38,h:.55},{x:item.x+item.w+.04,y:item.y+1.18,w:.38,h:.55}
    ];
    for(const chair of chairs)drawIsoBox(chair,21,{top:'#8d6750',x:'#644535',y:'#51372c',line:'#3e2b23'});
    drawIsoBox(item,item.height,item.palette);
    const centre=iso(item.x+item.w*.5,item.y+item.h*.5,item.height+3);
    ctx.save();ctx.translate(centre.x,centre.y);ctx.fillStyle='#e9dfc7';ctx.beginPath();ctx.ellipse(0,0,17,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#789269';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(Math.cos(a)*8,Math.sin(a)*3,3,0,Math.PI*2);ctx.fill()}ctx.restore();
  }

  function drawIsland(item){
    drawIsoBox(item,item.height,item.palette);
    const hob={x:item.x+.35,y:item.y+.19,w:.75,h:.55};
    polygon(rectCorners(hob,item.height+2),'#586063','#3c4244',1);
    for(let i=0;i<4;i++){
      const px=hob.x+.18+(i%2)*.36,py=hob.y+.16+Math.floor(i/2)*.25,p=iso(px,py,item.height+3);
      ctx.strokeStyle='#242a2b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.stroke();
    }
    const sink={x:item.x+1.72,y:item.y+.18,w:.78,h:.56};
    polygon(rectCorners(sink,item.height+2),'#aeb7b7','#747d7d',1);
  }

  function drawShelf(item){
    drawIsoBox(item,item.height,item.palette);
    const base=iso(item.x+item.w,item.y+item.h*.5,item.height-14);
    ctx.save();ctx.translate(base.x,base.y);ctx.rotate(Math.atan2(TILE_H/2,-TILE_W/2));
    for(let row=0;row<3;row++){
      for(let i=0;i<5;i++){
        const colours=['#a95746','#d9b95c','#4e7d81','#7f6787','#d68242'];
        ctx.fillStyle=colours[(row+i)%colours.length];ctx.fillRect(-32+i*13,-31+row*20,8,15);
      }
    }
    ctx.restore();
  }

  function drawCatTower(item){
    const base=iso(item.x+item.w*.5,item.y+item.h*.5,0);
    const top=iso(item.x+item.w*.5,item.y+item.h*.5,item.height);
    ctx.save();
    ctx.strokeStyle='#9b7040';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(top.x,top.y);ctx.stroke();
    ctx.strokeStyle='#d9b277';ctx.lineWidth=3;for(let i=0;i<9;i++){const y=lerp(base.y,top.y,i/8);ctx.beginPath();ctx.moveTo(base.x-5,y);ctx.lineTo(base.x+5,y-2);ctx.stroke()}
    ctx.restore();
    drawIsoBox({x:item.x-.15,y:item.y-.15,w:item.w+.3,h:item.h+.3},8,item.palette);
    const platform={x:item.x-.24,y:item.y-.24,w:item.w+.48,h:item.h+.48};polygon(rectCorners(platform,item.height),item.palette.top,item.palette.line,1);
  }

  function drawCabinet(item){
    drawIsoBox(item,item.height,item.palette);
    const handle=iso(item.x+item.w,item.y+item.h*.52,item.height*.52);
    ctx.fillStyle='#555b5a';ctx.beginPath();ctx.arc(handle.x,handle.y,3,0,Math.PI*2);ctx.fill();
  }

  function drawPlant(item){
    const centre=iso(item.x+item.w*.5,item.y+item.h*.5,0);
    ctx.save();ctx.fillStyle='rgba(35,31,24,.22)';ctx.beginPath();ctx.ellipse(centre.x,centre.y+2,18,7,0,0,Math.PI*2);ctx.fill();ctx.restore();
    const potTop=iso(item.x+item.w*.5,item.y+item.h*.5,25);
    ctx.fillStyle='#a55d3e';ctx.beginPath();ctx.moveTo(potTop.x-13,potTop.y);ctx.lineTo(potTop.x+13,potTop.y);ctx.lineTo(centre.x+9,centre.y);ctx.lineTo(centre.x-9,centre.y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#477356';
    for(let i=0;i<8;i++){
      const a=-Math.PI*.95+i*Math.PI*.27;
      ctx.save();ctx.translate(potTop.x,potTop.y-2);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,-18,7,22,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }

