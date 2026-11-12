const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const storage=new Map();
function open(store=storage,blocked=false){
 const elements=new Map(),drawing=new Proxy({},{get:(t,k)=>t[k]||(String(k).startsWith('create')?()=>({addColorStop(){}}):()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 function element(id){if(!elements.has(id))elements.set(id,{value:id==='speed'?'500':'',classList:{add(){},remove(){}},replaceChildren(){},append(){},setAttribute(){},addEventListener(){},scrollIntoView(){},getContext:()=>drawing});return elements.get(id);}
 const context={document:{getElementById:element,createElement:()=>element(Symbol()),addEventListener(){}},performance:{now:()=>1000},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem(k){if(blocked)throw Error('Denied');return store.get(k)||null;},setItem(k,v){if(blocked)throw Error('Denied');store.set(k,v);}},console};
 vm.createContext(context);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 return {game:code=>vm.runInContext(code,context),element};
}
function run(g,rule){g(`selectedRule='${rule}';addRule()`);let guard=0;while(g("phase==='running'")){g('tick()');assert(++guard<30);} }
const {game:g,element}=open();
assert.equal(g('layoutSeed'),'JAM-START');
assert.equal(g('soundEnabled'),false);
g('selectLevel(1)');assert.equal(g('layoutSeed'),'BRIDGE-99');
run(g,'seek');run(g,'deliver');
assert.equal(g('delivered'),0);assert(g('robots.every(r=>r.blocked>0)'));
assert.match(element('experiment-note').textContent,/堵住/);
const stalled=g('stateFingerprint()');
g('selectedRule="exchange";addRule()');assert(g('exchangeCount>0'),'First exchange step immediately creates a handoff');assert(g('feedbackEvents.some(e=>e.type==="exchange")'));
g('undoRound()');assert.equal(g('exchangeCount'),0);assert.equal(g('feedbackEvents.length'),0);assert.equal(g('stateFingerprint()'),stalled);
assert.equal(g('idleTicks'),3);assert.match(element('experiment-note').textContent,/堵住/);
run(g,'exchange');run(g,'yield');assert.equal(g('delivered'),8);assert.equal(g('totalTicks'),38);assert.equal(g('active.length'),4);
assert.equal(g('bestScore().ticks'),38);assert.match(element('result-score').innerHTML,/首次完成/);
const effectState=g('JSON.stringify([exchangeCount,feedbackEvents,lastFeedback,deliveryPulseUntil])');
g('verifyLayout(initialCargo)');assert.equal(g('JSON.stringify([exchangeCount,feedbackEvents,lastFeedback,deliveryPulseUntil])'),effectState);
let reload=open();reload.game('selectLevel(1)');assert.equal(reload.game('bestScore().ticks'),38,'Best survives reload');
reload.game('selectLevel(1,"ANOTHER-SEED")');assert.equal(reload.game('bestScore()'),null);
g('reset()');assert.equal(g('exchangeCount'),0);assert.equal(g('bestScore().ticks'),38);
// A completed slower attempt cannot replace the fastest record; ties use fewer rules.
g('totalTicks=40;active=["seek","deliver","exchange"];recordWin()');assert.equal(g('bestScore().ticks'),38);
g('totalTicks=38;recordWin()');assert.equal(g('bestScore().rules'),3);
g('totalTicks=36;recordWin()');assert.equal(g('bestScore().ticks'),36);
const denied=open(new Map(),true);run(denied.game,'seek');run(denied.game,'deliver');assert.equal(denied.game('phase'),'finished');assert.equal(denied.game('storageAvailable'),false);assert.match(denied.element('result-score').innerHTML,/暂存/);
const corrupt=new Map([['one-rule-v06:0:JAM-START','{"ticks":"<img>","rules":-1}']]);assert.equal(open(corrupt).game('bestScore()'),null);
g('selectLevel(4)');assert.equal(g('layoutSeed'),'JAM-BELT');assert.equal(g('nextLevelIndex()'),2);g('selectLevel(0)');assert.equal(g('nextLevelIndex()'),1);g('selectLevel(1)');assert.equal(g('nextLevelIndex()'),4);
for(const map of [0,4]){g(`selectLevel(${map})`);const rules=JSON.parse(g('JSON.stringify(layoutInfo.solution.rules)'));for(const rule of rules)run(g,rule);assert.equal(g('delivered'),g('currentLevel().cargo.length'));}
console.log('PASS: fixed showcases, immediate bridge handoff, undo, persistent isolated records, denied/corrupt storage, quiet validation, mainline order.');
