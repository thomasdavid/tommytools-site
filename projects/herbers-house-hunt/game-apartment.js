'use strict';

// Apartment-specific labels and opening copy live separately from the generic
// game systems so the measured layout can keep being refined without touching
// movement, scoring or vacuum behaviour.
friendlySurfaceName = function(id){
  const names={
    kitchenBack:'kitchen counter',
    island:'kitchen counter',
    shelf:'shelving unit',
    sofa:'sofa',
    dining:'round dining table',
    catTower:'scratching post',
    catCube:'cat cube',
    hallConsole:'hall table',
    bed:'bed',
    nightstand:'bedside table',
    bath:'bath',
    vanity:'bathroom vanity'
  };
  return names[id]||'furniture';
};

showMenu = function(){
  state='menu';
  overlayAction='start';
  overlayEyebrow.textContent='Herbert’s real apartment';
  overlayTitle.innerHTML="Herbert's<br>House Hunt";
  overlayCopy.textContent='Explore Herbert’s open-plan living room and L-shaped kitchen, then race through the hallway, bedroom and bathroom. Catch flies, uncover hidden treats and jump onto the sofa, round table, shelving unit and kitchen counters.';
  controlsRow.hidden=false;
  resultLine.hidden=true;
  overlayButton.textContent='Start 60-second hunt';
  overlay.classList.remove('hidden');
};
