const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'../index.html');
http.createServer((req,res)=>{
 if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync(game));
}).listen(4174,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:4174/ (game page only)'));
