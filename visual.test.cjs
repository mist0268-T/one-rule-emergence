async function main(){
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const canvasPackage=process.env.CANVAS_PACKAGE||'@napi-rs/canvas';
const {createCanvas,GlobalFonts,loadImage}=require(canvasPackage);
if(fs.existsSync('C:/Windows/Fonts/msyh.ttc'))GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc','Microsoft YaHei');
const surface=createCanvas(1920,1280),elements=new Map();let clock=1000;
function element(id){if(!elements.has(id))elements.set(id,{value:id==='speed'?'500':'',classList:{add(){},remove(){}},replaceChildren(){},append(){},setAttribute(){},addEventListener(){},scrollIntoView(){},getContext:()=>surface.getContext('2d')});return elements.get(id);}
const sandbox={document:{getElementById:element,createElement:()=>element(Symbol()),addEventListener(){}},performance:{now:()=>clock},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},console};
vm.createContext(sandbox);const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);
const game=code=>vm.runInContext(code,sandbox);
const out=path.join(__dirname,'../previews');fs.mkdirSync(out,{recursive:true});
const sheet=createCanvas(1920,1280),sc=sheet.getContext('2d');
const maps=[0,1,3,4];
for(let map=0;map<5;map++){
 game(`selectLevel(${map},'ART-2026');active=['seek','deliver'];selectedRobot=1;refreshIntents()`);
 for(const id of game('robots.map(r=>r.id)')){
  assert.equal(game(`(()=>{const r=robots.find(r=>r.id===${id}),p=robotScreen(r);return pickRobot(p.x,p.y);})()`),id,'Robot body can be selected in new projection');
 }
 const state=game('stateFingerprint()');game('draw()');assert.equal(game('stateFingerprint()'),state,'Drawing must not mutate gameplay');
 fs.writeFileSync(path.join(out,`warehouse-${map+1}.png`),surface.toBuffer('image/png'));
 const idx=maps.indexOf(map);if(idx>=0){const snapshot=await loadImage(surface.toBuffer('image/png'));sc.drawImage(snapshot,(idx%2)*960,Math.floor(idx/2)*640,960,640);}
 game(`phase='running';round=1;tick()`);clock+=250;game('draw()');
 assert(game('robots.every(r=>{const p=robotScreen(r);return pickRobot(p.x,p.y)===r.id})'),'Hit testing follows moving robots');
 clock+=1000;
 console.log(`Map ${map+1}: real Canvas render + static/moving hit tests passed`);
}
assert.equal(game('pickRobot(0,0)'),null);
fs.writeFileSync(path.join(out,'warehouse-contact-sheet.png'),sheet.toBuffer('image/png'));
console.log('PASS: 5 real Canvas scenes rendered, gameplay state unchanged, robot hit tests passed.');

}
main().catch(error=>{console.error(error);process.exitCode=1;});
