'use strict';

// Final calibration against the annotated plan: the corridor is a clean,
// rectangular passage and every hidden treat starts on reachable floor space.
PLAN_FLOORS.corridor.splice(0,PLAN_FLOORS.corridor.length,
  {x:6.72,y:8.18},{x:13.72,y:8.18},{x:13.72,y:10.76},{x:6.72,y:10.76}
);

treatSeeds[6].x=9.65;
treatSeeds[6].y=7.45;

// The main floor-plan script has already initialised the game once. Rebuild the
// round so the calibrated geometry is used by flies, treats and pathfinding.
resetGame();
showMenu();
