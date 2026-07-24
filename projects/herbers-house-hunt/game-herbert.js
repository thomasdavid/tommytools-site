'use strict';

// Herbert-specific sprite pass, based on the supplied front, profile and back
// photographs: stocky build, rich ginger coat, dark tiger stripes, green-grey
// eyes, broad muzzle, large ears and a thick ringed tail.
const HERBERT_COLOURS={
  coat:'#ce6b25',
  coatLight:'#e18a3b',
  warmLight:'#efb06a',
  stripe:'#873812',
  stripeSoft:'#a54a18',
  muzzle:'#efc08b',
  eye:'#8d9a76',
  eyeLight:'#c4cb9c',
  pupil:'#1d261f',
  nose:'#b85d55'
};

buildHerbertSprites = function(){
  const sprites={};
  for(const direction of ['north','south','east','west']){
    const sprite=document.createElement('canvas');
    sprite.width=112;sprite.height=112;
    const g=sprite.getContext('2d');
    g.translate(56,62);
    if(direction==='east')paintHerbertSide(g,false);
    else if(direction==='west')paintHerbertSide(g,true);
    else if(direction==='south')paintHerbertFront(g);
    else paintHerbertBack(g);
    sprites[direction]=sprite;
  }
  return sprites;
};

function paintHerbertTail(g,startX,startY,mirror=1){
  g.save();g.scale(mirror,1);g.lineCap='round';
  g.strokeStyle=HERBERT_COLOURS.stripe;g.lineWidth=12;g.beginPath();g.moveTo(startX,startY);g.bezierCurveTo(startX-22,startY-18,startX-45,startY-7,startX-38,startY+18);g.stroke();
  g.strokeStyle=HERBERT_COLOURS.coatLight;g.lineWidth=8;g.beginPath();g.moveTo(startX,startY);g.bezierCurveTo(startX-21,startY-16,startX-41,startY-6,startX-36,startY+16);g.stroke();
  g.strokeStyle=HERBERT_COLOURS.stripeSoft;g.lineWidth=3;for(let i=0;i<4;i++){const t=.30+i*.16;const x=startX-38*t,y=startY+Math.sin(t*Math.PI*1.7)*10;g.beginPath();g.moveTo(x-3,y-4);g.lineTo(x+4,y+4);g.stroke()}
  g.restore();
}

paintHerbertSide = function(g,mirror){
  g.save();if(mirror)g.scale(-1,1);g.lineCap='round';g.lineJoin='round';
  paintHerbertTail(g,-25,8,1);

  // Herbert has a broad, rounded torso rather than a slim cartoon-cat body.
  g.fillStyle=HERBERT_COLOURS.coat;g.beginPath();g.ellipse(-5,7,30,19,-.03,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.coatLight;g.beginPath();g.ellipse(2,12,20,10,0,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.warmLight;g.beginPath();g.ellipse(14,9,9,12,-.15,0,Math.PI*2);g.fill();

  // Strong curved flank stripes from the photographs.
  g.strokeStyle=HERBERT_COLOURS.stripe;g.lineWidth=4.2;
  for(const x of [-20,-11,-2,7]){g.beginPath();g.moveTo(x,-8);g.quadraticCurveTo(x+7,-1,x+4,5);g.stroke()}
  g.strokeStyle=HERBERT_COLOURS.stripeSoft;g.lineWidth=3;g.beginPath();g.moveTo(-15,17);g.lineTo(-11,10);g.stroke();g.beginPath();g.moveTo(-3,19);g.lineTo(1,11);g.stroke();

  // Broad head, large upright ears and forehead M.
  g.fillStyle=HERBERT_COLOURS.coat;g.beginPath();g.arc(23,-7,17,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.stripe;g.beginPath();g.moveTo(12,-19);g.lineTo(15,-39);g.lineTo(24,-20);g.fill();g.beginPath();g.moveTo(26,-21);g.lineTo(37,-36);g.lineTo(38,-15);g.fill();
  g.fillStyle='#eaa06a';g.beginPath();g.moveTo(15,-21);g.lineTo(16,-34);g.lineTo(21,-21);g.fill();g.beginPath();g.moveTo(29,-22);g.lineTo(35,-31);g.lineTo(35,-17);g.fill();
  g.strokeStyle=HERBERT_COLOURS.stripe;g.lineWidth=3.2;g.beginPath();g.moveTo(17,-20);g.lineTo(21,-13);g.lineTo(24,-20);g.lineTo(28,-13);g.lineTo(31,-20);g.stroke();

  g.fillStyle=HERBERT_COLOURS.muzzle;g.beginPath();g.ellipse(29,0,11,8,0,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.eye;g.beginPath();g.ellipse(20,-10,3.4,4.3,-.15,0,Math.PI*2);g.ellipse(30,-9,3.4,4.3,-.12,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.eyeLight;g.beginPath();g.ellipse(19.5,-11,1.2,1.5,0,0,Math.PI*2);g.ellipse(29.5,-10,1.2,1.5,0,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.pupil;g.beginPath();g.ellipse(20,-10,1.1,3.1,0,0,Math.PI*2);g.ellipse(30,-9,1.1,3.1,0,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.nose;g.beginPath();g.moveTo(29,-2);g.lineTo(35,-2);g.lineTo(32,2);g.closePath();g.fill();
  g.strokeStyle='rgba(91,48,30,.72)';g.lineWidth=1.1;for(const side of [-1,1])for(let i=0;i<3;i++){g.beginPath();g.moveTo(32+side*2,2+i*2.3);g.lineTo(32+side*(14+i*2),i*2.7);g.stroke()}
  g.strokeStyle=HERBERT_COLOURS.stripe;g.lineWidth=2.5;g.beginPath();g.moveTo(11,-7);g.lineTo(17,-4);g.stroke();g.beginPath();g.moveTo(12,-1);g.lineTo(18,1);g.stroke();

  // Chunky paws and legs.
  g.fillStyle=HERBERT_COLOURS.coatLight;g.beginPath();g.ellipse(13,22,9.5,5.5,0,0,Math.PI*2);g.ellipse(-15,22,9.5,5.5,0,0,Math.PI*2);g.fill();
  g.strokeStyle=HERBERT_COLOURS.stripeSoft;g.lineWidth=2;for(const x of [-17,11]){g.beginPath();g.moveTo(x,13);g.lineTo(x+3,19);g.stroke()}
  g.restore();
};

paintHerbertFront = function(g){
  g.lineCap='round';g.lineJoin='round';
  paintHerbertTail(g,-19,16,1);
  g.fillStyle=HERBERT_COLOURS.coat;g.beginPath();g.ellipse(0,12,24,29,0,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.coatLight;g.beginPath();g.ellipse(0,17,14,21,0,0,Math.PI*2);g.fill();
  g.strokeStyle=HERBERT_COLOURS.stripe;g.lineWidth=4;for(const y of [1,10,19]){g.beginPath();g.moveTo(-17,y);g.quadraticCurveTo(0,y+7,17,y);g.stroke()}

  g.fillStyle=HERBERT_COLOURS.coat;g.beginPath();g.arc(0,-17,21,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.stripe;g.beginPath();g.moveTo(-18,-29);g.lineTo(-13,-49);g.lineTo(-3,-30);g.fill();g.beginPath();g.moveTo(7,-31);g.lineTo(16,-48);g.lineTo(20,-27);g.fill();
  g.fillStyle='#eaa06a';g.beginPath();g.moveTo(-14,-31);g.lineTo(-12,-43);g.lineTo(-7,-31);g.fill();g.beginPath();g.moveTo(11,-33);g.lineTo(15,-43);g.lineTo(17,-29);g.fill();

  // Distinctive tabby M and cheek bars.
  g.strokeStyle=HERBERT_COLOURS.stripe;g.lineWidth=3.5;g.beginPath();g.moveTo(-10,-33);g.lineTo(-6,-23);g.lineTo(0,-31);g.lineTo(6,-23);g.lineTo(10,-33);g.stroke();
  for(const side of [-1,1])for(let i=0;i<2;i++){g.beginPath();g.moveTo(side*12,-15+i*6);g.lineTo(side*19,-12+i*6);g.stroke()}

  g.fillStyle=HERBERT_COLOURS.eye;g.beginPath();g.ellipse(-8,-19,4.2,4.7,0,0,Math.PI*2);g.ellipse(8,-19,4.2,4.7,0,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.eyeLight;g.beginPath();g.arc(-9,-20.5,1.5,0,Math.PI*2);g.arc(7,-20.5,1.5,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.pupil;g.beginPath();g.ellipse(-8,-19,1.2,3.4,0,0,Math.PI*2);g.ellipse(8,-19,1.2,3.4,0,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.muzzle;g.beginPath();g.ellipse(0,-7,13,9,0,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.nose;g.beginPath();g.moveTo(-3,-10);g.lineTo(3,-10);g.lineTo(0,-6);g.closePath();g.fill();
  g.strokeStyle='rgba(91,48,30,.72)';g.lineWidth=1.1;for(const side of [-1,1])for(let i=0;i<3;i++){g.beginPath();g.moveTo(side*3,-4+i*2.5);g.lineTo(side*(19+i*2),-7+i*4);g.stroke()}
  g.fillStyle=HERBERT_COLOURS.coatLight;g.beginPath();g.ellipse(-11,35,10,5.8,0,0,Math.PI*2);g.ellipse(11,35,10,5.8,0,0,Math.PI*2);g.fill();
};

paintHerbertBack = function(g){
  g.lineCap='round';g.lineJoin='round';
  paintHerbertTail(g,20,16,-1);
  g.fillStyle=HERBERT_COLOURS.coat;g.beginPath();g.ellipse(0,12,25,30,0,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.coatLight;g.beginPath();g.ellipse(0,19,17,20,0,0,Math.PI*2);g.fill();
  g.strokeStyle=HERBERT_COLOURS.stripe;g.lineWidth=5;for(let y=-1;y<23;y+=8){g.beginPath();g.moveTo(-14,y);g.quadraticCurveTo(0,y+8,14,y);g.stroke()}
  g.fillStyle=HERBERT_COLOURS.coat;g.beginPath();g.arc(0,-18,20,0,Math.PI*2);g.fill();
  g.fillStyle=HERBERT_COLOURS.stripe;g.beginPath();g.moveTo(-17,-30);g.lineTo(-13,-49);g.lineTo(-3,-31);g.fill();g.beginPath();g.moveTo(7,-31);g.lineTo(16,-48);g.lineTo(20,-28);g.fill();
  g.fillStyle='#eaa06a';g.beginPath();g.moveTo(-14,-32);g.lineTo(-12,-43);g.lineTo(-7,-32);g.fill();g.beginPath();g.moveTo(11,-33);g.lineTo(15,-43);g.lineTo(17,-30);g.fill();
  g.strokeStyle=HERBERT_COLOURS.stripe;g.lineWidth=3.5;g.beginPath();g.moveTo(-10,-34);g.lineTo(-6,-24);g.lineTo(0,-32);g.lineTo(6,-24);g.lineTo(10,-34);g.stroke();
  g.fillStyle=HERBERT_COLOURS.coatLight;g.beginPath();g.ellipse(-11,36,10,5.8,0,0,Math.PI*2);g.ellipse(11,36,10,5.8,0,0,Math.PI*2);g.fill();
};

herbertSprites=buildHerbertSprites();
