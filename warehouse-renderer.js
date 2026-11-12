// Canvas warehouse renderer. Logical grid coordinates stay independent of art.
const canvas=$('board'),ctx=canvas.getContext('2d');
const VIEW_W=960,VIEW_H=640;
const SCENES=[
 {name:'初始实验室',tag:'LEARNING LAB',floor:'#556461',edge:'#36494b',light:'#e3ddb2',ambient:'#253c3e'},
 {name:'独木桥',tag:'TRANSFER BRIDGE',floor:'#485352',edge:'#2e3b40',light:'#ffcc83',ambient:'#302a23'},
 {name:'远近错配',tag:'SORTING DEPOT',floor:'#506167',edge:'#31464f',light:'#c0e4e4',ambient:'#1e3946'},
 {name:'环形仓库',tag:'LOOP WAREHOUSE',floor:'#465d66',edge:'#293f4c',light:'#a7dcf7',ambient:'#1b3446'},
 {name:'流水车间',tag:'CONVEYOR WORKS',floor:'#56605c',edge:'#394744',light:'#e7c78d',ambient:'#302f23'}
];
function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function visualPosition(r,now=performance.now()){const t=Math.min(1,Math.max(0,(now-r.moveStart)/r.moveDuration));const ease=t*t*(3-2*t);return {x:r.fromX+(r.x-r.fromX)*ease,y:r.fromY+(r.y-r.fromY)*ease};}
function project(x,y,z=0){return {x:480+(x-6)*(56+y*1.25),y:102+y*48-z};}
function tint(hex,amount){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,v+amount)).toString(16).padStart(2,'0')).join('');}
function polygon(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke();}}
function line(points,color,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function plane(x,y,w,d,z,fill,stroke){polygon([project(x,y,z),project(x+w,y,z),project(x+w,y+d,z),project(x,y+d,z)],fill,stroke);}
function cube(x,y,w,d,height,color,base=0){
 const a=project(x,y,base+height),b=project(x+w,y,base+height),c=project(x+w,y+d,base+height),e=project(x,y+d,base+height);
 const cb=project(x+w,y+d,base),eb=project(x,y+d,base),bb=project(x+w,y,base);
 polygon([b,bb,cb,c],tint(color,-32),'#0c171840');
 const front=ctx.createLinearGradient(e.x,e.y,eb.x,eb.y);front.addColorStop(0,tint(color,-8));front.addColorStop(1,tint(color,-28));
 polygon([e,c,cb,eb],front,'#0c171855');polygon([a,b,c,e],tint(color,20),'#e2efe525');
 line([e,c],tint(color,30),1);
}
function shadow(x,y,w=.7,d=.55,alpha=.22){const p=project(x+.12,y+.12);ctx.fillStyle=`rgba(0,8,10,${alpha})`;ctx.beginPath();ctx.ellipse(p.x,p.y+4,w*34,d*24,.08,0,Math.PI*2);ctx.fill();}
function floorRing(x,y,color){const p=project(x,y,1);ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.shadowColor=color;ctx.shadowBlur=10;ctx.beginPath();ctx.ellipse(p.x,p.y,25,15,.08,0,Math.PI*2);ctx.stroke();ctx.restore();}
function floorLine(x1,y1,x2,y2,color,width=1.5,z=1){line([project(x1,y1,z),project(x2,y2,z)],color,width);}
function hazardEdge(x,y,vertical=false){for(let i=0;i<5;i++){const a=i*.2;if(vertical)plane(x,y+a,.07,.10,1,i%2?'#1c2625':'#d6af5c');else plane(x+a,y,.10,.07,1,i%2?'#1c2625':'#d6af5c');}}
function drawFloor(scene){
 cube(-.12,-.12,12.24,8.24,22,'#26383c',-24);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(levelIndex===1&&walls.has(key(x,y))){plane(x,y,1,1,-20,'#0b151a','#1a272c');continue;}
  const variation=((x*13+y*7)%5-2)*3;
  plane(x+.014,y+.014,.972,.972,0,tint(scene.floor,variation),'#9db5aa28');
  floorLine(x+.04,y+.96,x+.96,y+.96,'#182c2a80',1);
  if((x+y)%3===0){for(const [a,b] of [[.1,.12],[.9,.88]]){const p=project(x+a,y+b);ctx.fillStyle='#172d2d8c';ctx.fillRect(p.x,p.y,1.8,1.8);}}
  if((x*7+y*11)%9===0)floorLine(x+.28,y+.72,x+.62,y+.7,'#b9c8b41c',1);
  if(heat[y][x])plane(x+.08,y+.08,.84,.84,.2,`rgba(185,238,131,${Math.min(.08,heat[y][x]*.004)})`);
 }
 // Border rails are deliberately low so playable cells remain visible.
 cube(-.13,-.13,12.26,.11,14,'#7a8175');cube(12.02,0,.11,8,10,'#606f69');
 cube(-.13,0,.11,8,10,'#717d70');cube(-.13,8.02,12.26,.11,5,'#687a72');
 for(let x=0;x<=12;x+=2){cube(x-.04,-.18,.12,.2,27,'#64766d');const p=project(x,-.07,28);ctx.save();ctx.shadowBlur=12;ctx.shadowColor=scene.light;rounded(p.x-5,p.y-2,10,4,1,scene.light);ctx.restore();}
 for(let y=1;y<8;y+=2){cube(-.18,y,.19,.15,17,'#5e716b');cube(12,y,.19,.15,17,'#5e716b');}
 // Lane edge markings stay outside occupied grid cells.
 floorLine(.2,.2,11.8,.2,'#e1cf8a60',2);floorLine(.2,7.8,11.8,7.8,'#e1cf8a60',2);
 if(levelIndex===1){
  for(const x of [5.28,6.65]){floorLine(x,0,x,3,'#46565a',5,-12);floorLine(x,4,x,8,'#46565a',5,-12);}
  for(let y=0;y<8;y++)if(y!==3){hazardEdge(4.87,y,true);hazardEdge(7.03,y,true);}
  for(let x=5;x<7;x++){plane(x+.03,3.04,.94,.92,1,'#636f68','#b3b2a0');for(let j=1;j<6;j++)floorLine(x+j/6,3.1,x+j/6,3.9,'#26393a',1.3,2);}
  floorLine(5,3.04,7,3.04,'#d1a54b',4,15);floorLine(5,3.96,7,3.96,'#d1a54b',3,9);
 }
}
function drawShelf(x,y,scene){
 shadow(x+.57,y+.6,.72,.57,.27);
 cube(x+.09,y+.12,.82,.74,32,'#586968');
 // Recessed front bays, steel frame and stocked top shelf.
 const a=project(x+.17,y+.865,25),b=project(x+.83,y+.865,25),c=project(x+.83,y+.865,5),d=project(x+.17,y+.865,5);
 polygon([a,b,c,d],'#253b3f','#a2b0a355');
 cube(x+.19,y+.64,.24,.22,15,'#9a967d',5);cube(x+.51,y+.63,.26,.23,17,(x+y)%2?'#687d7e':'#8d968a',5);
 for(const dx of [.1,.85])cube(x+dx,y+.79,.045,.08,33,'#93a095');
 cube(x+.08,y+.07,.85,.80,3,'#899187',32);
 cube(x+.17,y+.2,.40,.43,5,(x+y)%2?'#858e80':'#969889',35);
 const p=project(x+.68,y+.87,15);ctx.fillStyle=scene.light;ctx.fillRect(p.x-3,p.y-1,6,2);
}
function drawDock(color,e){
 const c=COLORS[color],x=e.x,y=e.y;
 ctx.save();ctx.shadowBlur=22;ctx.shadowColor=c;plane(x+.09,y+.14,.82,.75,1,c+'42',c);ctx.restore();
 cube(x+.08,y+.12,.84,.78,4,color==='red'?'#935d51':'#47748c');
 plane(x+.17,y+.25,.66,.57,5,color==='red'?'#d78070':'#73b1cf',c);
 cube(x+.12,y+.04,.76,.16,34,color==='red'?'#735347':'#405f75');
 const a=project(x+.25,y+.207,29),b=project(x+.75,y+.207,29),cc=project(x+.75,y+.207,10),d=project(x+.25,y+.207,10);
 polygon([a,b,cc,d],color==='red'?'#391d1e':'#102c41',c);const p=project(x+.5,y+.215,19);
 ctx.save();ctx.shadowColor=c;ctx.shadowBlur=12;polygon([{x:p.x,y:p.y-6},{x:p.x+6,y:p.y},{x:p.x,y:p.y+6},{x:p.x-6,y:p.y}],c);ctx.restore();
 const label=project(x+.5,y+.65,6);ctx.fillStyle='#102a30';ctx.font='bold 9px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillText(color==='red'?'红货':'蓝货',label.x,label.y+3);
}
function drawBelt(b){
 const x=b.x,y=b.y;
 cube(x+.01,y+.15,.98,.7,5,'#6d6953');plane(x+.025,y+.21,.95,.58,6,'#273137','#869182');
 for(let i=0;i<5;i++)floorLine(x+.04+i*.19,y+.23,x+.04+i*.19,y+.77,'#485250',1,7);
 cube(x+.01,y+.13,.98,.055,8,'#b49a59');cube(x+.01,y+.81,.98,.055,8,'#b49a59');
 const p=project(x+.5,y+.52,8);const direction=b.dx;line([{x:p.x-direction*5,y:p.y-5},{x:p.x+direction*3,y:p.y},{x:p.x-direction*5,y:p.y+5}],'#f3c975',3);
}
function drawCrate(x,y,color,size=.38,base=0){
 const c=COLORS[color];shadow(x,y,.38,.28,.22);cube(x-size/2,y-size/2,size,size,16*size/.38,c,base);
 plane(x-.035,y-size/2,.07,size,base+16*size/.38+.3,tint(c,35));
 const p=project(x,y+size/2+.005,base+10);ctx.fillStyle='#233b4266';ctx.fillRect(p.x-3,p.y-3,6,5);
}
function robotScreen(r,now=performance.now()){const p=visualPosition(r,now);return project(p.x+.5,p.y+.5,22);}
function pickRobot(sx,sy,now=performance.now()){
 // Hit test rendered bodies (including their height), frontmost first.
 return [...robots].sort((a,b)=>{const aa=visualPosition(a,now),bb=visualPosition(b,now);return bb.y-aa.y;}).find(r=>{const p=robotScreen(r,now);return Math.abs(p.x-sx)<=27&&Math.abs(p.y-sy)<=30;})?.id??null;
}
function drawRobot(r,now){
 const p=visualPosition(r,now),x=p.x+.5,y=p.y+.5;
 shadow(x,y,.65,.45,.32);
 if(selectedRobot===r.id||(now<highlightUntil&&(r.ruleId===highlightedRule||(highlightedRule==='exchange'&&r.lastExchange===totalTicks))))floorRing(x,y,'#c8ef9a');
 if(robots.find(b=>b.id===selectedRobot)?.waitingFor.includes(r.id))floorRing(x,y,COLORS.red);
 // Four rubber wheels anchor the cream shell to the floor.
 for(const dx of [-.25,.20])for(const dy of [-.14,.16]){cube(x+dx,y+dy,.10,.14,9,'#233637',1);}
 cube(x-.28,y-.22,.56,.45,6,'#84968a',7);
 cube(x-.27,y-.22,.54,.40,22,'#c9cfb5',13);
 // Dark face screen inset on the near side; lime eyes remain readable.
 const a=project(x-.20,y+.185,30),b=project(x+.20,y+.185,30),c=project(x+.20,y+.185,18),d=project(x-.20,y+.185,18);
 polygon([a,b,c,d],'#122e30','#728c7c');
 for(const dx of [-.09,.09]){const eye=project(x+dx,y+.193,24);ctx.save();ctx.shadowBlur=5;ctx.shadowColor='#d1f7a2';rounded(eye.x-2,eye.y-2,4,5,1,'#d1f7a2');ctx.restore();}
 const plate=project(x,y-.02,36);ctx.fillStyle='#536b5c';ctx.font='bold 8px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillText(String(r.id).padStart(2,'0'),plate.x,plate.y+3);
 const number=project(x,y+.42,1);rounded(number.x-11,number.y-4,22,12,4,'#102528ca');ctx.fillStyle='#d3e1ce';ctx.font='9px "Microsoft YaHei",sans-serif';ctx.fillText(String(r.id).padStart(2,'0'),number.x,number.y+5);
 if(r.carry)drawCrate(x+.28,y+.23,r.carry.color,.28,12);
 if(r.blocked){const warning=project(x+.39,y,48);ctx.fillStyle=COLORS.red;ctx.font='bold 18px sans-serif';ctx.fillText('!',warning.x,warning.y);}
}
function drawFeedback(now){
 for(const event of feedbackEvents){
  const t=(now-event.at)/event.duration;if(t<0||t>=1)continue;
  ctx.save();ctx.globalAlpha=Math.min(1,(1-t)*2);
  if(event.type==='exchange'){
   const a=project(event.a.x+.5,event.a.y+.5,34),b=project(event.b.x+.5,event.b.y+.5,34);
   ctx.shadowColor='#d7fca9';ctx.shadowBlur=10;line([a,b],'#d7fca9',3);
   const progress=Math.min(1,t*2),p={x:a.x+(b.x-a.x)*progress,y:a.y+(b.y-a.y)*progress};
   rounded(p.x-4,p.y-4,8,8,2,'#eaffc7');
   const x=(a.x+b.x)/2,y=Math.min(a.y,b.y)-23-t*8;
   rounded(x-37,y-12,74,23,6,'#18392bea');ctx.shadowBlur=0;ctx.fillStyle='#e7ffca';ctx.font='bold 12px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillText('交接成功',x,y+4);
  }else{
   const p=project(event.x+.5,event.y+.5,5);
   ctx.shadowColor=COLORS[event.color];ctx.shadowBlur=22;ctx.strokeStyle=COLORS[event.color];ctx.lineWidth=3;
   ctx.beginPath();ctx.ellipse(p.x,p.y,20+t*30,12+t*18,0,0,Math.PI*2);ctx.stroke();
   ctx.shadowBlur=0;ctx.fillStyle='#eaffc7';ctx.font='bold 14px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillText('送达 +1',p.x,p.y-35-t*20);
  }
  ctx.restore();
 }
}
function draw(){
 cancelAnimationFrame(animationFrame);animationFrame=null;
 const now=performance.now(),scene=SCENES[levelIndex];
 ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,VIEW_W,VIEW_H);
 const bg=ctx.createRadialGradient(490,240,50,480,310,600);bg.addColorStop(0,scene.ambient);bg.addColorStop(1,'#091417');ctx.fillStyle=bg;ctx.fillRect(0,0,VIEW_W,VIEW_H);
 // Soft projected platform shadow, then the entire walkable floor.
 ctx.save();ctx.shadowColor='#000';ctx.shadowBlur=30;ctx.shadowOffsetY=15;plane(-.1,-.1,12.2,8.2,-26,'#081215');ctx.restore();
 drawFloor(scene);
 for(const b of currentLevel().belts||[])drawBelt(b);
 const selected=robots.find(r=>r.id===selectedRobot);
 if(selected?.goal){const p=visualPosition(selected,now);ctx.save();ctx.setLineDash([5,5]);line([project(p.x+.5,p.y+.5,2),...(selected.route||[]).map(q=>project(q.x+.5,q.y+.5,2))],'#d8fbb6',2.4);ctx.restore();floorRing(selected.goal.x+.5,selected.goal.y+.5,'#d8fbb6');}
 // Paint all tall props in depth order so robots pass correctly behind shelves.
 const objects=[];
 if(levelIndex!==1)for(const k of walls){const [x,y]=k.split(',').map(Number);objects.push({depth:y+.55,paint:()=>drawShelf(x,y,scene)});}
 for(const [color,e]of Object.entries(exits))objects.push({depth:e.y+.20,paint:()=>drawDock(color,e)});
 for(const c of cargo){const p=c.moveStart===undefined?c:visualPosition(c,now);objects.push({depth:p.y+.5,paint:()=>drawCrate(p.x+.5,p.y+.5,c.color,.38,currentLevel().belts?.some(b=>cellEqual(b,c))?7:0)});}
 for(const r of robots){const p=visualPosition(r,now);objects.push({depth:p.y+.5,paint:()=>drawRobot(r,now)});}
 objects.sort((a,b)=>a.depth-b.depth).forEach(o=>o.paint());
 drawFeedback(now);
 // Screen-space scene details stay readable at small canvas sizes.
 ctx.textAlign='left';ctx.fillStyle='#9cafa9';ctx.font='11px "Microsoft YaHei",sans-serif';ctx.fillText('SECTOR '+String(levelIndex+1).padStart(2,'0')+' / '+scene.tag,35,32);
 ctx.textAlign='right';ctx.fillStyle='#cfdbbc';ctx.fillText('● '+(running?'SYSTEM ACTIVE':'SYSTEM STANDBY'),925,32);
 ctx.textAlign='left';ctx.fillStyle='#819993';ctx.font='11px "Microsoft YaHei",sans-serif';ctx.fillText('点击机器人 · 观察规则如何形成秩序',35,609);
 ctx.textAlign='right';ctx.fillStyle='#b5c69d';ctx.fillText('已送达 '+delivered+' / '+currentLevel().cargo.length,925,609);
 if(now<highlightUntil||feedbackEvents.some(e=>now-e.at<e.duration)||[...robots,...cargo].some(r=>r.moveStart!==undefined&&(r.fromX!==r.x||r.fromY!==r.y)&&now<r.moveStart+r.moveDuration))animationFrame=requestAnimationFrame(draw);
}
canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect();selectedRobot=pickRobot((event.clientX-rect.left)/rect.width*VIEW_W,(event.clientY-rect.top)/rect.height*VIEW_H);render();});
