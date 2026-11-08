import http from 'node:http';
import fs from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
import {MAX_HEALTH,DAMAGE,BOT_DAMAGE,MAG_SIZE,RELOAD_MS,SHOT_COOLDOWN_MS,RESPAWN_MS,ROUND_MS,normalize3,sanitizeName,sanitizeRoom,randomRoom,clamp,sqDist,freeMove,trace,collides} from './arena-logic.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PUBLIC=path.join(ROOT,'public');
const WORLD=JSON.parse(fs.readFileSync(path.join(PUBLIC,'world.json'),'utf8'));
const PORT=Number(process.env.PORT||3000);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const httpServer=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).pathname;
  const root=pathname.startsWith('/vendor/three/')?path.join(ROOT,'node_modules/three'):PUBLIC;
  const relative=pathname.startsWith('/vendor/three/')?pathname.substring('/vendor/three/'.length):pathname==='/'?'index.html':pathname.replace(/^\//,'');
  const target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep) || relative.includes('\0')){res.writeHead(403);res.end('Forbidden');return;}
  try{
    const fileStat=await stat(target);
    if(!fileStat.isFile()) throw new Error('Not a file');
    res.writeHead(200,{'Content-Type':MIME[path.extname(target)]||'application/octet-stream','Cache-Control':pathname.includes('/assets/')?'public, max-age=3600':'no-cache','Access-Control-Allow-Origin':'*'});
    fs.createReadStream(target).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
const wss=new WebSocketServer({server:httpServer,maxPayload:2048,perMessageDeflate:false});
const rooms=new Map();
let nextId=1;
const send=(ws,obj)=>{if(ws?.readyState===WebSocket.OPEN)try{ws.send(JSON.stringify(obj));}catch{}};
const broadcast=(room,obj,exclude=null)=>{for(const p of room.players.values())if(p.ws!==exclude)send(p.ws,obj);};
const allFighters=(room)=>[...room.players.values(),...room.bots];
function makeBot(i,room){
  const names=['Bubblegum','Bloop','Popcorn','Squishy','Puff Daddy','Fizz','Bouncy','Jellybean'];
  const pos=spawn(room);
  return {id:`bot${i}`,name:names[i%names.length],type:'bot',x:pos.x,z:pos.z,yaw:Math.random()*Math.PI*2,pitch:0,hp:100,kills:0,deaths:0,ammo:MAG_SIZE,reloadUntil:0,respawnAt:0,lastShot:0,botTarget:null,decisionAt:0,shootAt:Date.now()+1800+Math.random()*1200,vx:0,vz:0,color:i%7};
}
function spawn(room){
  const candidates=[...WORLD.spawns].sort(()=>Math.random()-.5);
  const living=allFighters(room).filter(p=>p.hp>0);
  candidates.sort((a,b)=>Math.min(...living.map(p=>sqDist(b,p)),Infinity)-Math.min(...living.map(p=>sqDist(a,p)),Infinity));
  return {...candidates[0]};
}
function createRoom(code){
  const room={code,players:new Map(),bots:[],start:Date.now(),lastActive:Date.now(),round:1};
  rooms.set(code,room);
  for(let i=0;i<4;i++)room.bots.push(makeBot(i,room));
  return room;
}
function view(p){return {id:p.id,name:p.name,type:p.type,x:p.x,z:p.z,yaw:p.yaw,hp:p.hp,kills:p.kills,deaths:p.deaths,color:p.color,respawnAt:p.respawnAt};}
function sync(room){
  const msg={t:'snapshot',players:allFighters(room).map(view),remaining:Math.max(0,room.start+ROUND_MS-Date.now()),round:room.round,online:room.players.size};
  broadcast(room,msg);
}
function removePlayer(ws){
  const p=ws.player;if(!p)return;
  const room=rooms.get(p.room);
  if(room){room.players.delete(p.id);room.lastActive=Date.now();broadcast(room,{t:'leave',id:p.id});}
  ws.player=null;
}
function join(ws,msg){
  if(ws.player)return;
  if(typeof msg!=='object')return;
  let code=sanitizeRoom(msg.room);
  if(!code){do{code=randomRoom()}while(rooms.has(code));}
  if(!rooms.has(code) && rooms.size>=120){send(ws,{t:'error',message:'Server full—try again shortly.'});return;}
  const room=rooms.get(code)||createRoom(code);
  if(room.players.size>=12){send(ws,{t:'error',message:'Room is full (12 players). Try a different room.'});return;}
  const pos=spawn(room);
  const p={id:`p${nextId++}`,name:sanitizeName(msg.name),type:'human',room:code,ws,x:pos.x,z:pos.z,yaw:0,pitch:0,hp:100,kills:0,deaths:0,ammo:MAG_SIZE,reloadUntil:0,respawnAt:0,lastShot:0,lastMove:Date.now(),color:Math.floor(Math.random()*7)};
  ws.player=p;room.players.set(p.id,p);room.lastActive=Date.now();
  send(ws,{t:'welcome',id:p.id,room:code,spawn:pos,health:p.hp,ammo:p.ammo,mag:MAG_SIZE,world:WORLD});
  broadcast(room,{t:'notice',message:`${p.name} floated into the arena!`});
  sync(room);
}
function updatePosition(p,m){
  if(p.hp<=0)return;
  const now=Date.now();const dt=clamp((now-p.lastMove)/1000,0,.25);p.lastMove=now;
  const x=Number(m.x),z=Number(m.z),yaw=Number(m.yaw),pitch=Number(m.pitch);
  if(![x,z,yaw,pitch].every(Number.isFinite))return;
  const dist=Math.hypot(x-p.x,z-p.z);
  const speedLimit=9.7*dt+.35;
  if(dist>speedLimit){const a=speedLimit/(dist||1);p.x+=(x-p.x)*a;p.z+=(z-p.z)*a;}
  else{p.x=x;p.z=z;}
  if(collides(p.x,p.z,WORLD,.4)){
    const spot=spawn(rooms.get(p.room));p.x=spot.x;p.z=spot.z;send(p.ws,{t:'correct',x:p.x,z:p.z});
  }
  p.yaw=yaw;p.pitch=clamp(pitch,-1.5,1.5);
}
function reload(p){
  if(p.hp<=0 || p.reloadUntil || p.ammo===MAG_SIZE)return;
  p.reloadUntil=Date.now()+RELOAD_MS;
  send(p.ws,{t:'reload',until:p.reloadUntil});
}
function damage(room,target,source,amount){
  if(target.hp<=0)return;
  target.hp=Math.max(0,target.hp-amount);
  if(target.ws)send(target.ws,{t:'damaged',hp:target.hp,source:source.name});
  if(source.ws)send(source.ws,{t:'hit',target:target.id,killed:target.hp<=0});
  if(target.hp===0){
    target.deaths++;source.kills++;
    target.respawnAt=Date.now()+RESPAWN_MS;
    broadcast(room,{t:'pop',id:target.id,x:target.x,z:target.z,color:target.color,killer:source.name,victim:target.name});
    if(target.ws)send(target.ws,{t:'death',by:source.name,respawnAt:target.respawnAt});
  }
}
function fire(p,m){
  if(p.hp<=0)return;
  const now=Date.now();
  if(p.reloadUntil)return;
  if(now-p.lastShot<SHOT_COOLDOWN_MS)return;
  if(!p.ammo){reload(p);return;}
  const dir=normalize3({x:Number(m.dx),y:Number(m.dy),z:Number(m.dz)});
  if(!dir)return;
  // Shots must be in front of the player's last communicated heading, reducing blind firing exploits.
  const forward={x:-Math.sin(p.yaw)*Math.cos(p.pitch),y:Math.sin(p.pitch),z:-Math.cos(p.yaw)*Math.cos(p.pitch)};
  if(dir.x*forward.x+dir.y*forward.y+dir.z*forward.z<.72)return;
  p.ammo--;p.lastShot=now;
  const room=rooms.get(p.room);
  if(!room)return;
  const from={x:p.x,y:1.58,z:p.z};
  const result=trace(from,dir,allFighters(room),WORLD,p.id);
  if(result.target)damage(room,result.target,p,DAMAGE);
  broadcast(room,{t:'shot',from,to:result.point,owner:p.id,hit:result.target?.id||null},p.ws);
  send(p.ws,{t:'shotAck',ammo:p.ammo,to:result.point,hit:result.target?.id||null});
  if(!p.ammo)reload(p);
}
function botTick(room,now,dt){
  const people=[...room.players.values()].filter(p=>p.hp>0);
  for(const b of room.bots){
    if(b.hp<=0)continue;
    if(now>b.decisionAt){
      b.decisionAt=now+500+Math.random()*800;
      const nearest=people.slice().sort((p,q)=>sqDist(b,p)-sqDist(b,q))[0];
      b.botTarget=nearest?.id||null;
      if(!nearest || sqDist(b,nearest)>23**2) b.yaw+=Math.random()*2.5-1.25;
      else b.yaw=Math.atan2(-(nearest.x-b.x),-(nearest.z-b.z));
    }
    const target=people.find(p=>p.id===b.botTarget);
    const d=target?Math.sqrt(sqDist(b,target)):Infinity;
    const speed=d<4?-1.5:d<10?1.0:3.2;
    const dx=-Math.sin(b.yaw)*speed*dt,dz=-Math.cos(b.yaw)*speed*dt;
    const next=freeMove(b,b.x+dx,b.z+dz,WORLD,.58);
    if(Math.hypot(b.x-next.x,b.z-next.z)<.001)b.yaw+=.95;
    b.x=next.x;b.z=next.z;
    if(target&&d<20&&now>b.shootAt){
      b.shootAt=now+1300+Math.random()*1000;
      const from={x:b.x,y:1.58,z:b.z};
      const dir=normalize3({x:target.x-b.x+(Math.random()-.5)*.7,y:0,z:target.z-b.z+(Math.random()-.5)*.7});
      if(!dir)continue;
      const result=trace(from,dir,allFighters(room),WORLD,b.id);
      broadcast(room,{t:'shot',from,to:result.point,owner:b.id,hit:result.target?.id||null,bot:true});
      if(result.target && result.target!==b)damage(room,result.target,b,BOT_DAMAGE);
    }
  }
}
function gameTick(){
  const now=Date.now(),dt=.05;
  for(const [code,room] of rooms){
    if(room.players.size===0){if(now-room.lastActive>60_000)rooms.delete(code);continue;}
    if(now-room.start>=ROUND_MS){
      const champion=allFighters(room).sort((a,b)=>b.kills-a.kills)[0];
      broadcast(room,{t:'roundEnd',winner:champion?.name||'Nobody',kills:champion?.kills||0});
      room.start=now;room.round++;
      for(const p of allFighters(room)){p.kills=0;p.deaths=0;p.hp=100;p.ammo=MAG_SIZE;p.reloadUntil=0;p.respawnAt=0;const pos=spawn(room);p.x=pos.x;p.z=pos.z;if(p.ws)send(p.ws,{t:'respawn',x:p.x,z:p.z,hp:p.hp,ammo:p.ammo});}
    }
    for(const p of allFighters(room)){
      if(p.reloadUntil && now>=p.reloadUntil){p.reloadUntil=0;p.ammo=MAG_SIZE;if(p.ws)send(p.ws,{t:'reloaded',ammo:p.ammo});}
      if(p.hp<=0 && p.respawnAt && now>=p.respawnAt){p.hp=MAX_HEALTH;p.ammo=MAG_SIZE;p.reloadUntil=0;p.respawnAt=0;const pos=spawn(room);p.x=pos.x;p.z=pos.z;if(p.ws)send(p.ws,{t:'respawn',x:p.x,z:p.z,hp:p.hp,ammo:p.ammo});}
    }
    botTick(room,now,dt);
  }
}
setInterval(gameTick,50);
setInterval(()=>{for(const r of rooms.values())if(r.players.size)sync(r);},100);
setInterval(()=>{for(const client of wss.clients){if(client.isAlive===false){client.terminate();continue;}client.isAlive=false;client.ping();}},30000);
wss.on('connection',(ws)=>{
  ws.isAlive=true;ws.on('pong',()=>ws.isAlive=true);
  ws.on('message',(raw)=>{
    let msg;try{msg=JSON.parse(raw.toString());}catch{return;}
    if(!msg||typeof msg.t!=='string')return;
    try{
      if(msg.t==='join')return join(ws,msg);
      const p=ws.player;if(!p)return;
      if(msg.t==='move')return updatePosition(p,msg);
      if(msg.t==='fire')return fire(p,msg);
      if(msg.t==='reload')return reload(p);
      if(msg.t==='ping')return send(ws,{t:'pong',ms:Date.now()});
    }catch(e){console.error('Player message error',e);}
  });
  ws.on('close',()=>removePlayer(ws));ws.on('error',()=>removePlayer(ws));
});
httpServer.listen(PORT,'0.0.0.0',()=>console.log(`🎈 Balloon Blitz open at http://localhost:${PORT}`));
