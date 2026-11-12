const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');

const elements = new Map();
const drawing = new Proxy({}, {
  get: (target, key) => target[key] || (String(key).startsWith('create') ? (() => ({addColorStop(){}})) : (() => {})),
  set: (target, key, value) => (target[key] = value, true),
});
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value: id === 'speed' ? '500' : '',
    classList: { add() {}, remove() {} },
    replaceChildren() {}, append() {}, setAttribute() {},
    addEventListener() {}, scrollIntoView() {}, getContext: () => drawing,
  });
  return elements.get(id);
}
const sandbox = {
  document: { getElementById: element, createElement: () => element(Symbol()), addEventListener() {} },
  performance: { now: () => 1000 },
  setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, console,
};
vm.createContext(sandbox);
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], sandbox);
const game = code => vm.runInContext(code, sandbox);
const savedState = () => game(`JSON.stringify({
  robots:robots.map(r=>({id:r.id,x:r.x,y:r.y,carry:r.carry,reason:r.reason,goal:r.goal,blocked:r.blocked,lastExchange:r.lastExchange,ruleId:r.ruleId,matchedRules:r.matchedRules,route:r.route,waitingFor:r.waitingFor})),
  cargo,active,selectedRule,round,roundTicks,totalTicks,delivered,heat
})`);
function checkInventory() {
  assert.equal(game('new Set(robots.map(r=>key(r.x,r.y))).size'), game('currentLevel().robots.length'));
  assert.equal(game('cargo.length+robots.filter(r=>r.carry).length+delivered'), game('currentLevel().cargo.length'));
  assert.equal(game('robots.some(r=>walls.has(key(r.x,r.y)))'), false);
  assert.equal(game('new Set([...cargo,...robots.filter(r=>r.carry).map(r=>r.carry)].map(c=>c.id)).size'),
    game('cargo.length+robots.filter(r=>r.carry).length'));
}
function runRound(rule) {
  sandbox.chosen = rule;
  game('selectedRule=chosen;addRule()');
  let guard = 0; checkInventory();
  while (game('phase') === 'running') {
    game('tick()'); checkInventory();
    assert(++guard <= 30, 'Round must end');
  }
}
function validatePlacement(map) {
  assert.equal(game('new Set(initialCargo.map(c=>key(c.x,c.y))).size'), game('initialCargo.length'));
  assert.equal(game('initialCargo.some(c=>walls.has(key(c.x,c.y))||robots.some(r=>cellEqual(r,c))||Object.values(exits).some(e=>cellEqual(e,c)))'), false);
  assert.equal(game('initialCargo.some(c=>!path(c,exits[c.color]))'), false);
  assert.equal(game('initialCargo.filter(c=>c.color==="red").length'), game('initialCargo.length/2'));
  if (map === 1) assert(game('initialCargo.every(c=>c.x<=4?c.color==="blue":c.x>=7&&c.color==="red")'), 'Bridge cargo must cross the river');
  if (map === 2) assert(game('robots.every(r=>nearest(initialCargo,r).color===(r.x<6?"blue":"red"))'), 'Mismatch nearest cargo should go to the other side');
  if (map === 3) assert.equal(game('initialCargo.filter(c=>c.x<=3).length'), 4);
  if (map === 4) assert(game('initialCargo.every(c=>currentLevel().belts.some(b=>cellEqual(b,c)))'), 'Factory cargo starts on belts');
}

let fallbacks = 0, maxGenerationMs = 0;
const layoutCount = 256;
const startMap=Number(process.env.START_MAP||0), mapCount=game('LEVELS.length');
for (let map = startMap; map < mapCount; map++) {
  const unique = new Set();
  for (let seed = 0; seed < layoutCount; seed++) {
    const started = performance.now();
    game(`selectLevel(${map},'TEST-${seed}')`);
    maxGenerationMs = Math.max(maxGenerationMs, performance.now() - started);
    fallbacks += game('layoutInfo.fallback') ? 1 : 0;
    validatePlacement(map);
    const initial = game('JSON.stringify(initialCargo)'); unique.add(initial);
    if (seed % 32 === 0) {
      game(`selectLevel(${map},'TEST-${seed}')`);
      assert.equal(game('JSON.stringify(initialCargo)'), initial, 'Same seed and map must reproduce exactly');
      const before = savedState();
      game('verifyLayout(initialCargo)');
      assert.equal(savedState(), before, 'Generator verification must not mutate live play');
    }
    const rules = JSON.parse(game('JSON.stringify(layoutInfo.solution.rules)'));
    for (const rule of rules) runRound(rule);
    assert.equal(game('phase'), 'finished');
    assert.equal(game('delivered'), game('currentLevel().cargo.length'), 'Generated layout must be solvable in real play');
    assert(game('round<=MAX_ROUNDS'));
    if (map === 0) assert.equal(game('active.length'), 2, 'Tutorial should require only finding and delivery');
  }
  assert(unique.size >= layoutCount * .9, 'Most tested seeds must create different layouts');
  console.log(`${map + 1}: ${layoutCount} layouts passed, ${unique.size} distinct`);
}

game('selectLevel(0,"UNDO-TEST")');
const original = game('JSON.stringify(initialCargo)');
const before = savedState();
runRound('seek');
assert(game('roundTicks<currentLevel().ticks'));
game('undoRound()');
assert.equal(savedState(), before, 'Undo should restore current layout and rules');
assert.equal(game('JSON.stringify(initialCargo)'), original);
runRound('seek'); game('reset()');
assert.equal(game('JSON.stringify(cargo)'), original, 'Retry must keep the layout');
assert.equal(game('round+totalTicks+delivered+active.length+history.length'), 0);
game('newLayout()');
assert.notEqual(game('JSON.stringify(initialCargo)'), original, 'New game should change the layout');
const seedBefore = game('layoutSeed');
element('layout-seed').value = '<bad seed>';
game('replaySeed()'); assert.equal(game('layoutSeed'), seedBefore, 'Invalid seed should preserve the game');
element('layout-seed').value = '  test-123  ';
game('replaySeed()'); assert.equal(game('layoutSeed'), 'TEST-123');

// Conveyor mechanics: simultaneous moves, receiving, blocking and idle detection.
game(`selectLevel(4,'BELT-TEST');active=[];cargo=[{id:0,x:7,y:2,color:'red'}];advanceSimulation()`);
assert.equal(game('cargo[0].x'),6);assert.equal(game('idleTicks'),0,'Moving cargo is progress even if robots stand still');
game(`cargo=[{id:0,x:1,y:2,color:'red'},{id:1,x:2,y:2,color:'blue'}];moveConveyors()`);
assert.equal(game('cargo[1].x'),2,'Occupied endpoint blocks the following box');
game(`cargo=[{id:0,x:4,y:2,color:'red'},{id:1,x:5,y:2,color:'blue'}];moveConveyors()`);
assert.equal(game('cargo[0].x'),3);assert.equal(game('cargo[1].x'),5,'Trailing box waits for next step');
game(`robots[0].x=1;robots[0].y=2;robots[0].carry=null;cargo=[{id:0,x:2,y:2,color:'red'}];moveConveyors()`);
assert.equal(game('cargo.length'),0);assert.equal(game('robots[0].carry.id'),0,'Empty robot receives incoming cargo');
game(`cargo=[{id:1,x:2,y:2,color:'blue'}];moveConveyors()`);
assert.equal(game('cargo[0].x'),2,'Loaded robot blocks incoming cargo');
game(`selectLevel(4,'BELT-UNDO')`);
const beltBefore=savedState();runRound('seek');game('undoRound()');
assert.equal(savedState(),beltBefore,'Undo restores moving cargo, robot intents and rules');
game('reset()');assert.equal(game('JSON.stringify(cargo)'),game('JSON.stringify(initialCargo)'));

// Inspectable decisions follow the same rule priority and path planner as play.
game(`selectLevel(0,'INTENT');active=['seek','red'];refreshIntents()`);
assert.equal(game('robots[0].ruleId'),'red');
assert.equal(game('robots[0].matchedRules.join(",")'),'seek,red');
game(`selectedRobot=1;render()`);
assert.match(element('inspector').innerHTML,/覆盖了 1 条/);
game(`walls=new Set(['1,0','1,2','0,0','0,2']);robots[0].x=0;robots[0].y=1;robots[1].x=1;robots[1].y=1;robots[0].goal={x:2,y:1}`);
assert.equal(game('movementPlan(robots[0]).waitingFor[0]'),2,'Blocked route identifies the actual blocking robot');
console.log(`PASS: ${(mapCount-startMap)*layoutCount} solvable layouts, seeds, undo/retry, conveyor collisions/receiving/idle, rule priority and blockers; fallback=${fallbacks}, max generation=${maxGenerationMs.toFixed(1)} ms`);
