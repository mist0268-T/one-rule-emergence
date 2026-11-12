const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'../index.html');
let html=fs.readFileSync(file,'utf8');
const start=html.indexOf('// Canvas warehouse renderer.');
const end=html.indexOf("$('add').onclick=addRule",start);
if(start<0||end<0)throw Error('Renderer boundaries not found');
const renderer=fs.readFileSync(path.join(__dirname,'warehouse-renderer.js'),'utf8').replace(/^\uFEFF/,'');
fs.writeFileSync(file,html.slice(0,start)+renderer+'\n'+html.slice(end));
