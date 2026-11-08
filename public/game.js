import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=(id)=>document.getElementById(id);
const ui={menu:$('menu'),play:$('play'),note:$('connection-note'),name:$('nickname'),room:$('room'),hud:$('hud'),bottom:$('bottom-hud'),leader:$('leaderboard'),feed:$('feed'),pause:$('pause'),resume:$('resume'),crosshair:$('crosshair'),health:$('health-value'),lifeFill:$('life-fill'),ammo:$('ammo'),ammoLabel:$('ammo-label'),reloadFill:$('reload-fill'),round:$('round-number'),clock:$('clock'),online:$('online'),roomLabel:$('room-label'),leaders:$('leaders'),score:$('scoreboard'),scoreRows:$('score-rows'),respawn:$('respawn'),popBy:$('pop-by'),roundEnd:$('round-end'),winner:$('winner-name'),winnerScore:$('winner-score'),touch:$('touch-ui'),hurt:$('damage-flash'),hit:$('hitmarker')};
const isTouch=matchMedia('(pointer:coarse)').matches;
const COLORS=[0xff5399,0x52d9ef,0xfbdc5c,0x9d76ff,0x5be5a5,0xffa15c,0x73abfa];
const WORLD=await fetch('/world.json').then(r=>r.json());
const boundary=WORLD.size/2;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x98e9fc);scene.fog=new THREE.Fog(0x9ae6f5,45,120);
const camera=new THREE.PerspectiveCamera(82,innerWidth/innerHeight,.06,160);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isTouch?1.25:1.8));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=!isTouch;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
$('game').appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xffffff,0x687ac3,2.05);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff3d5,2.8);sun.position.set(-18,38,-23);sun.castShadow=true;sun.shadow.mapSize.set(isTouch?1024:2048,isTouch?1024:2048);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45;sun.shadow.normalBias=.04;scene.add(sun);
const ambience=new THREE.PointLight(0xf9a2ea,24,26);ambience.position.set(0,10,0);scene.add(ambience);
const clock=new THREE.Clock();
const loader=new GLTFLoader();
const assetTemplates={character:null,blaster:null,cactus:null,barricade:null};
const material=(color,roughness=.25)=>new THREE.MeshPhysicalMaterial({color,metalness:.02,roughness,clearcoat:1,clearcoatRoughness:.12});
const matte=(color)=>new THREE.MeshStandardMaterial({color,roughness:.78});
const materials={pink:material(0xff62ae),mint:material(0x42d9be),yellow:material(0xffd853),violet:material(0x9d67ed),blue:material(0x44c7e4),white:material(0xfffffb),dark:matte(0x362057)};
const geoSphere=new THREE.SphereGeometry(1,18,14);
function mesh(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function ball(r,mat,x,y,z,sx=1,sy=1,sz=1){const o=mesh(geoSphere,mat,x,y,z);o.scale.set(r*sx,r*sy,r*sz);return o;}
function cylinder(radiusTop,radiusBottom,height,mat,x,y,z,n=16){return mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,n),mat,x,y,z);}
function createTubeBetween(a,b,r,mat){const delta=new THREE.Vector3().subVectors(b,a);const obj=cylinder(r,r,delta.length(),mat,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,12);obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return obj;}
function ring(major,tube,mat,x,y,z,orientation=Math.PI/2){const o=mesh(new THREE.TorusGeometry(major,tube,10,32),mat,x,y,z);o.rotation.x=orientation;return o;}
function makeFloor(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#faf2e2';ctx.fillRect(0,0,1024,1024);
  const tile=1024/18;
  for(let y=0;y<18;y++)for(let x=0;x<18;x++){
    ctx.fillStyle=(x+y)%2===0?'#f8efd9':'#f3e9d8';ctx.fillRect(x*tile,y*tile,tile,tile);
    ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;ctx.strokeRect(x*tile,y*tile,tile,tile);
  }
  const dots=['#ffc4d6','#bfeee7','#e4d3ff','#fbe9a7'];
  for(let i=0;i<180;i++){ctx.beginPath();ctx.fillStyle=dots[i%4];ctx.arc(Math.random()*1024,Math.random()*1024,Math.random()*5+2,0,Math.PI*2);ctx.fill();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const ground=mesh(new THREE.PlaneGeometry(WORLD.size,WORLD.size),new THREE.MeshStandardMaterial({map:texture,roughness:.88}),0,0,0);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const outer=mesh(new THREE.PlaneGeometry(500,500),matte(0x81cfd3),0,-.1,0);outer.rotation.x=-Math.PI/2;outer.receiveShadow=true;scene.add(outer);
  const trim=mesh(new THREE.BoxGeometry(WORLD.size+1.3,.34,WORLD.size+1.3),material(0xff88b9),0,-.27,0);scene.add(trim);
  for(let i=-boundary+1;i<boundary;i+=2.6){
    for(const axis of ['x','z'])for(const sign of [-1,1]){
      const m=cylinder(.27,.32,2.45,i%5===0?materials.yellow:materials.white,axis==='x'?i:sign*boundary,1.22,axis==='x'?sign*boundary:i,10);
      scene.add(m);scene.add(ball(.38,i%5===0?materials.mint:materials.pink,m.position.x,2.55,m.position.z));
    }
  }
  for(const sign of [-1,1])for(const axis of ['x','z']){
    const bar=mesh(new THREE.BoxGeometry(axis==='x'?WORLD.size:1,1.25,axis==='x'?1:WORLD.size),new THREE.MeshStandardMaterial({color:0x6d50ca,transparent:true,opacity:.78,roughness:.38}),axis==='x'?0:sign*boundary,.78,axis==='x'?sign*boundary:0);scene.add(bar);
    const ribbon=mesh(new THREE.BoxGeometry(axis==='x'?WORLD.size:.3,.2,axis==='x'?.3:WORLD.size),materials.yellow,axis==='x'?0:sign*boundary,1.55,axis==='x'?sign*boundary:0);scene.add(ribbon);
  }
  // Sprinkles on the stadium border.
  for(let i=0;i<74;i++){
    const a=i/74*Math.PI*2,r=31.5;
    const podium=cylinder(.23,.36,.35,materials.yellow,Math.sin(a)*r,.25,Math.cos(a)*r,9);scene.add(podium);
    scene.add(ball(.24,materials[i%2?'mint':'pink'],podium.position.x,.57,podium.position.z));
  }
}
function createCactusFallback(){
  const g=new THREE.Group();
  const body=cylinder(.41,.43,2.3,materials.mint,0,1.35,0);g.add(body,ball(.41,materials.mint,0,2.5,0),ball(.43,materials.mint,0,.2,0));
  for(const sign of [-1,1]){
    g.add(createTubeBetween(new THREE.Vector3(sign*.32,1.08,0),new THREE.Vector3(sign*1.04,1.13,0),.25,materials.mint));
    g.add(createTubeBetween(new THREE.Vector3(sign*1.04,1.13,0),new THREE.Vector3(sign*1.04,1.83,0),.25,materials.mint));
    g.add(ball(.25,materials.mint,sign*1.04,1.83,0));
  }
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;g.add(ball(.08,materials.white,Math.cos(a)*.36,1.65+Math.sin(a)*.2,Math.sin(a)*.36));}
  return g;
}
function createBarrierFallback(){
  const g=new THREE.Group();
  const mats=[materials.pink,materials.mint,materials.yellow,materials.violet,materials.blue];
  for(let j=0;j<4;j++){
    for(let k=0;k<2;k++){
      const x=(k===0?-1:1)*1.05+(j%2?.25:0);
      g.add(mesh(new THREE.CapsuleGeometry(.47,1.36,4,12),mats[(j+k)%5],x,.51+j*.48,0));
      const segment=g.children[g.children.length-1];segment.rotation.z=Math.PI/2;
    }
  }
  return g;
}
function createTower(){
  const g=new THREE.Group();
  const bottom=cylinder(3.1,3.15,2.5,materials.violet,0,1.25,0,40);g.add(bottom);
  g.add(cylinder(3.4,3.4,.27,materials.pink,0,.14,0,40));
  for(let i=0;i<5;i++)g.add(ring(3.08,.13,materials[i%2?'mint':'yellow'],0,.35+i*.48,0));
  g.add(cylinder(3.08,3.08,.28,materials.mint,0,2.55,0,40));
  const top=cylinder(2.45,2.55,1.25,materials.pink,0,3.23,0,32);g.add(top);
  g.add(ring(2.5,.18,materials.yellow,0,3.64,0));
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;g.add(ball(.32,materials[i%2?'yellow':'white'],Math.sin(a)*2.9,2.4,Math.cos(a)*2.9));}
  g.add(ball(.72,materials.yellow,0,4.23,0));
  const pole=cylinder(.11,.11,1.1,materials.white,0,5.2,0);g.add(pole);
  for(let j=0;j<6;j++){const a=j/6*Math.PI*2;g.add(ball(.28,materials[j%2?'violet':'mint'],Math.cos(a)*.4,5.65+Math.sin(a)*.16,Math.sin(a)*.4));}
  return g;
}
const obstacleHolders=[];
function createWorld(){
  makeFloor();
  for(const o of WORLD.obstacles){
    let shape;if(o.type==='tower')shape=createTower();else if(o.type==='cactus')shape=createCactusFallback();else shape=createBarrierFallback();
    shape.position.set(o.x,0,o.z);shape.rotation.y=(o.x+o.z)*.1;scene.add(shape);obstacleHolders.push({root:shape,type:o.type});
  }
  const buntingColors=[0xfe6cac,0x57e1c3,0xffe270,0x9b75f9];
  for(let i=0;i<32;i++){
    const a=i/32*Math.PI*2,r=29+Math.random()*14;
    const x=Math.cos(a)*r,z=Math.sin(a)*r,h=2+Math.random()*3.3;
    const bg=new THREE.Group();const mat=material(buntingColors[i%4]);bg.add(ball(.7,mat,0,h,0,.85,1.08,.85));
    const knot=mesh(new THREE.ConeGeometry(.13,.19,6),mat,0,h-.81,0);knot.rotation.z=Math.PI;bg.add(knot);
    const points=[new THREE.Vector3(0,h-.83,0),new THREE.Vector3(.1,h-1.35,0),new THREE.Vector3(.04,h-1.8,.04)];
    bg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xfff8e5})));bg.position.set(x,0,z);scene.add(bg);
  }
  for(let i=0;i<12;i++){
    const x=(i-5.5)*8;const z=i%2?-38:38;const cloud=new THREE.Group();
    for(let j=0;j<4;j++)cloud.add(ball(1.3,matte(0xffffff),j*1.3,0,Math.sin(j)*.7,1,.72,1));
    cloud.position.set(x,12+Math.sin(i)*3,z);scene.add(cloud);
  }
}
function normalizeModel(src,height,extraRotate=0){
  const group=new THREE.Group();const model=src.clone(true);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();o.material.side=THREE.DoubleSide;}}});
  model.rotation.y=extraRotate;
  group.add(model);
  model.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(model);const size=new THREE.Vector3();bb.getSize(size);
  const scale=height/Math.max(.001,size.y);model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  bb.setFromObject(model);const center=new THREE.Vector3();bb.getCenter(center);
  model.position.x-=center.x;model.position.z-=center.z;model.position.y-=bb.min.y;
  return group;
}
function createProceduralPlayer(colorIndex){
  const g=new THREE.Group();const m=material(COLORS[colorIndex%COLORS.length]);const second=materials.yellow;
  g.add(ball(.48,m,0,1.73,0,1,1.02,1));g.add(ball(.42,m,0,1.11,0,.85,1.1,.74));
  g.add(ball(.12,materials.white,-.17,1.75,-.41));g.add(ball(.12,materials.white,.17,1.75,-.41));
  g.add(ball(.06,materials.dark,-.17,1.75,-.515));g.add(ball(.06,materials.dark,.17,1.75,-.515));
  for(const sign of [-1,1]){
    g.add(createTubeBetween(new THREE.Vector3(sign*.32,1.36,0),new THREE.Vector3(sign*.72,.92,0),.19,m));
    g.add(ball(.21,m,sign*.74,.9,0));
    g.add(createTubeBetween(new THREE.Vector3(sign*.22,.77,0),new THREE.Vector3(sign*.27,.17,0),.22,second));
    g.add(ball(.23,second,sign*.27,.15,-.14,1,.75,1.35));
  }
  g.add(ball(.26,m,0,.89,0));return g;
}
function textSprite(text,color='#ffffff'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#1a1332d8';ctx.beginPath();ctx.roundRect(4,6,504,111,22);ctx.fill();ctx.strokeStyle='#ffffff99';ctx.lineWidth=5;ctx.stroke();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 51px system-ui,sans-serif';ctx.fillStyle=color;ctx.fillText(text.slice(0,18),256,65,464);
  const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;
  const obj=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,depthTest:false,transparent:true}));obj.scale.set(2.65,.66,1);obj.position.y=2.56;return obj;
}
const playerModels=new Map();
function newPlayerModel(p){
  const holder=new THREE.Group();holder.position.set(p.x,0,p.z);
  const appearance=assetTemplates.character?normalizeModel(assetTemplates.character,2.23):createProceduralPlayer(p.color);
  holder.add(appearance);holder.userData.appearance=appearance;
  holder.add(textSprite(p.name,p.type==='bot'?'#ffe879':'#ffffff'));
  scene.add(holder);
  return {group:holder,appearance,tx:p.x,tz:p.z,hp:p.hp,tstamp:performance.now(),color:p.color};
}
function updatePlayerModels(players){
  const seen=new Set();
  for(const p of players){
    if(p.id===self.id)continue;
    seen.add(p.id);
    let pm=playerModels.get(p.id);
    if(!pm){pm=newPlayerModel(p);playerModels.set(p.id,pm);}
    pm.tx=p.x;pm.tz=p.z;pm.yaw=p.yaw;pm.hp=p.hp;pm.group.visible=p.hp>0;
    pm.last=performance.now();
  }
  for(const [id,pm] of playerModels)if(!seen.has(id)){scene.remove(pm.group);playerModels.delete(id);}
}
function refreshPlayerMeshAssets(){
  if(!assetTemplates.character)return;
  for(const pm of playerModels.values()){
    pm.group.remove(pm.appearance);
    pm.appearance=normalizeModel(assetTemplates.character,2.18,Math.PI);
    pm.group.add(pm.appearance);
  }
}
function refreshProps(type){
  if(!assetTemplates[type])return;
  for(const o of obstacleHolders){if(o.type!==type)continue;
    const old=o.root;const shape=normalizeModel(assetTemplates[type],type==='cactus'?2.9:1.9);
    // Scale horizontal dimensions to fit obstacle circular collision shell.
    const bb=new THREE.Box3().setFromObject(shape),s=new THREE.Vector3();bb.getSize(s);
    const scaleXZ=Math.min(1.12,(type==='cactus'?3.7:4.9)/Math.max(s.x,s.z,.01));
    shape.scale.x*=scaleXZ;shape.scale.z*=scaleXZ;
    shape.position.copy(old.position);shape.rotation.y=old.rotation.y;
    scene.remove(old);scene.add(shape);o.root=shape;
  }
}
async function loadOptionalAssets(){
  for(const name of Object.keys(assetTemplates)){
    loader.load(`/assets/${name}.glb`,gltf=>{
      assetTemplates[name]=gltf.scene;
      if(name==='character')refreshPlayerMeshAssets();
      else if(name==='blaster')refreshGunAsset();
      else refreshProps(name);
      console.info('Meshy asset loaded:',name);
    },undefined,()=>console.info(`Using procedural ${name} mesh (Meshy GLB optional).`));
  }
}
function buildGun(){
  const g=new THREE.Group();
  g.add(mesh(new THREE.CapsuleGeometry(.115,.7,6,12),materials.mint,0,.02,-.25));g.children[0].rotation.x=Math.PI/2;
  g.add(cylinder(.2,.2,.28,materials.violet,0,.02,-.51));g.children[1].rotation.x=Math.PI/2;
  g.add(ball(.24,materials.yellow,0,.025,-.62,.9,.9,.7));
  g.add(mesh(new THREE.CapsuleGeometry(.12,.35,6,12),materials.pink,0,-.31,.09));g.children[3].rotation.z=-.38;
  g.add(ball(.24,materials.blue,0,.13,.12,1.25,.65,.9));
  g.add(ring(.17,.062,materials.yellow,0,.15,-.4,0));
  g.add(ball(.09,materials.white,.08,.2,-.68));
  return g;
}
const gunRoot=new THREE.Group();gunRoot.position.set(.49,-.40,-.8);camera.add(gunRoot);scene.add(camera);
let weapon=buildGun();gunRoot.add(weapon);
function refreshGunAsset(){
  if(!assetTemplates.blaster)return;
  gunRoot.remove(weapon);
  weapon=normalizeModel(assetTemplates.blaster,.64,-Math.PI/2);
  weapon.rotation.y=-Math.PI/2;
  // Meshy blaster has variable orientation: position slightly forward for visibility.
  weapon.position.set(0,-.15,-.12);gunRoot.add(weapon);
}
createWorld();loadOptionalAssets();

// Network and player state.
let socket=null,connected=false,entered=false,playing=false,roomCode='',roundEnds=Date.now()+300000,round=1;
let latestPlayers=[],lastShotLocal=0,reloadStart=0,reloadUntil=0,shake=0,hitPulse=0,deadUntil=0,roundOverlayUntil=0;
const self={id:'',name:'',x:0,z:0,yaw:0,pitch:0,health:100,ammo:14,jumpY:0,jumpVelocity:0,onGround:true,kills:0,deaths:0};
const keys=new Set();const tempLook=new THREE.Vector3();const tempVec=new THREE.Vector3();
let lastMoveSent=0;
const send=(msg)=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(msg));};
function toast(text){const el=document.createElement('div');el.className='toast';el.textContent=text;$('toast-wrap').appendChild(el);setTimeout(()=>el.remove(),2900);}
function shareLink(){
  if(!roomCode){toast('Join a room first!');return;}
  const u=new URL(location.href);u.searchParams.set('room',roomCode);u.searchParams.delete('offline');
  if(location.hostname==='localhost'||location.hostname==='127.0.0.1')toast('For friends outside your Wi-Fi, host the game online first.');
  navigator.clipboard?.writeText(u.toString()).then(()=>toast('🎈 Invite link copied!')).catch(()=>window.prompt('Copy this invite link:',u.toString()));
}
$('copy-room').addEventListener('click',shareLink);$('share-pause').addEventListener('click',shareLink);
$('random-room').addEventListener('click',()=>{ui.room.value='';toast('A new private room will be created!');});
function connect(){
  ui.play.disabled=true;ui.note.textContent='Connecting to the balloon arena...';
  if(socket)try{socket.close();}catch{}
  const protocol=location.protocol==='https:'?'wss:':'ws:';
  const ws=new WebSocket(`${protocol}//${location.host}`);socket=ws;
  let welcomed=false;
  const timeout=setTimeout(()=>{if(!welcomed&&socket===ws){ui.note.textContent='Could not connect. Check that the game server is running.';ui.play.disabled=false;try{ws.close();}catch{}}},6500);
  ws.addEventListener('open',()=>send({t:'join',room:ui.room.value,name:ui.name.value}));
  ws.addEventListener('message',event=>{
    let msg;try{msg=JSON.parse(event.data);}catch{return;}
    if(msg.t==='welcome'){
      clearTimeout(timeout);welcomed=true;connected=true;entered=true;
      self.id=msg.id;self.name=ui.name.value.trim();self.x=msg.spawn.x;self.z=msg.spawn.z;self.health=100;self.ammo=msg.ammo;self.jumpY=0;
      roomCode=msg.room;roundEnds=Date.now()+300000;history.replaceState({},'',`?room=${roomCode}`);
      ui.menu.classList.add('hidden');ui.pause.classList.remove('hidden');
      ui.hud.classList.remove('hidden');ui.bottom.classList.remove('hidden');ui.leader.classList.remove('hidden');ui.feed.classList.remove('hidden');
      ui.roomLabel.textContent=roomCode;ui.play.disabled=false;ui.note.textContent='No sign-up. No download. Just balloons.';
      refreshHealth();refreshAmmo();
      if(isTouch)startPlaying();
      else toast('Click BACK TO THE ACTION to capture your mouse.');
    }else if(msg.t==='snapshot'){
      latestPlayers=msg.players;roundEnds=Date.now()+msg.remaining;round=msg.round;
      ui.round.textContent=round;ui.online.textContent=msg.online;
      updatePlayerModels(msg.players);
      const me=msg.players.find(p=>p.id===self.id);if(me){self.kills=me.kills;self.deaths=me.deaths;}
      redrawLeaderboard();
    }else if(msg.t==='notice'){toast(msg.message);}
    else if(msg.t==='correct'){self.x=msg.x;self.z=msg.z;}
    else if(msg.t==='shot'){
      makeTrail(msg.from,msg.to,msg.bot?0xffc965:0x42f6ff);
      if(msg.hit)popSparks(msg.to,0xffdf7b,7);
    }
    else if(msg.t==='shotAck'){
      self.ammo=msg.ammo;refreshAmmo();
      if(msg.hit)showHitmarker();
      popSparks(msg.to,msg.hit?0xffef9c:0x72ecf7,msg.hit?10:4);
    }else if(msg.t==='hit'){showHitmarker(msg.killed);}
    else if(msg.t==='damaged'){
      self.health=msg.hp;refreshHealth();ui.hurt.classList.add('hurt');setTimeout(()=>ui.hurt.classList.remove('hurt'),150);
      shake=.13;playSound('hurt');
    }else if(msg.t==='death'){
      self.health=0;refreshHealth();deadUntil=msg.respawnAt;
      ui.popBy.textContent=`Popped by ${msg.by}!`;ui.respawn.classList.remove('hidden');playSound('pop');
    }else if(msg.t==='respawn'){
      self.x=msg.x;self.z=msg.z;self.health=msg.hp;self.ammo=msg.ammo;self.jumpY=0;self.jumpVelocity=0;self.onGround=true;
      deadUntil=0;reloadUntil=0;ui.respawn.classList.add('hidden');refreshHealth();refreshAmmo();toast('✨ Freshly inflated!');
    }else if(msg.t==='reload'){reloadStart=Date.now();reloadUntil=msg.until;ui.ammoLabel.textContent='REINFLATING...';}
    else if(msg.t==='reloaded'){self.ammo=msg.ammo;reloadUntil=0;ui.ammoLabel.textContent='BUBBLE BLASTER';refreshAmmo();playSound('reload');}
    else if(msg.t==='pop'){
      const pos={x:msg.x,y:1.1,z:msg.z};popSparks(pos,COLORS[msg.color%COLORS.length],32);playSound('pop',.5);
      appendFeed(msg.killer,msg.victim);
    }else if(msg.t==='roundEnd'){
      roundOverlayUntil=Date.now()+3900;ui.winner.textContent=msg.winner;ui.winnerScore.textContent=`TOP POPPER · ${msg.kills} POPS`;ui.roundEnd.classList.remove('hidden');
      popSparks({x:self.x,y:2,z:self.z},0xffe25a,55);playSound('win');setTimeout(()=>ui.roundEnd.classList.add('hidden'),3900);
    }else if(msg.t==='error'){
      clearTimeout(timeout);ui.note.textContent=msg.message;ui.play.disabled=false;toast(msg.message);
    }
  });
  ws.addEventListener('close',()=>{
    clearTimeout(timeout);
    if(socket!==ws)return;
    connected=false;playing=false;entered=false;ui.play.disabled=false;
    if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();
    ui.menu.classList.remove('hidden');ui.pause.classList.add('hidden');ui.hud.classList.add('hidden');ui.bottom.classList.add('hidden');ui.leader.classList.add('hidden');ui.feed.classList.add('hidden');ui.crosshair.classList.add('hidden');ui.touch.classList.add('hidden');
    ui.note.textContent='Disconnected. Press LET\'S POP to reconnect.';
    for(const pm of playerModels.values())scene.remove(pm.group);playerModels.clear();
  });
  ws.addEventListener('error',()=>{ui.note.textContent='Connection failed—run npm start or check your host.';});
}
ui.play.addEventListener('click',connect);
ui.name.addEventListener('keydown',e=>{if(e.key==='Enter')connect();});
ui.room.addEventListener('keydown',e=>{if(e.key==='Enter')connect();});
ui.room.value=new URLSearchParams(location.search).get('room')?.toUpperCase().slice(0,6)||'';
const rememberedName=localStorage.getItem('balloon-blitz-name');if(rememberedName)ui.name.value=rememberedName;
ui.name.addEventListener('change',()=>{localStorage.setItem('balloon-blitz-name',ui.name.value.slice(0,18));});
function startPlaying(){
  if(!entered)return;
  if(isTouch){playing=true;ui.pause.classList.add('hidden');ui.crosshair.classList.remove('hidden');ui.touch.classList.remove('hidden');}
  else renderer.domElement.requestPointerLock?.();
  try{initAudio();}catch{}
}
ui.resume.addEventListener('click',startPlaying);
document.addEventListener('pointerlockchange',()=>{
  if(!entered||isTouch)return;
  playing=document.pointerLockElement===renderer.domElement;
  ui.pause.classList.toggle('hidden',playing);
  ui.crosshair.classList.toggle('hidden',!playing);
});
renderer.domElement.addEventListener('click',()=>{
  if(entered&&!isTouch&&!playing)startPlaying();
});
function refreshHealth(){ui.health.textContent=self.health;ui.lifeFill.style.width=`${self.health}%`;ui.lifeFill.style.background=self.health<35?'linear-gradient(90deg,#ff4242,#ff943b)':'linear-gradient(90deg,#fe6fba,#ffce6e)';}
function refreshAmmo(){ui.ammo.textContent=self.ammo;}
function redrawLeaderboard(){
  const ranking=[...latestPlayers].sort((a,b)=>b.kills-a.kills||a.deaths-b.deaths);
  ui.leaders.innerHTML=ranking.slice(0,6).map((p,i)=>`<div class="leader ${p.id===self.id?'me':''}"><span class="position">${i+1}.</span><span class="l-name"></span><span class="score">${p.kills}</span></div>`).join('');
  Array.from(ui.leaders.querySelectorAll('.leader')).forEach((el,i)=>{el.querySelector('.l-name').textContent=ranking[i].name+(ranking[i].type==='bot'?' 🤖':'');});
  ui.scoreRows.replaceChildren();for(const [i,p] of ranking.entries()){
    const row=document.createElement('div');row.className='score-row';
    const left=document.createElement('span');left.textContent=`${i+1}. ${p.name}${p.type==='bot'?' 🤖':''}${p.id===self.id?' (YOU)':''}`;
    const right=document.createElement('span');right.textContent=`${p.kills} POPS · ${p.deaths} DEATHS`;
    row.append(left,right);ui.scoreRows.appendChild(row);
  }
}
function appendFeed(killer,victim){
  const el=document.createElement('div');el.className='kill';
  const first=document.createElement('span');first.textContent=killer;
  el.append(first,document.createTextNode('  ✦ POPPED  '+victim));ui.feed.prepend(el);
  while(ui.feed.children.length>5)ui.feed.lastElementChild.remove();
  setTimeout(()=>el.classList.add('fade'),3500);setTimeout(()=>el.remove(),4050);
}
function showHitmarker(killed=false){
  const el=ui.hit;el.textContent=killed?'✹':'✦';el.classList.add('show');hitPulse=performance.now()+185;playSound(killed?'pop':'hit',.45);
}
function reload(){if(!playing||self.health<=0||reloadUntil||self.ammo===14)return;send({t:'reload'});}
function fire(){
  if(!playing||self.health<=0||reloadUntil||self.ammo<=0){if(playing&&self.ammo<=0)reload();return;}
  const now=performance.now();if(now-lastShotLocal<282)return;lastShotLocal=now;
  const dir={x:-Math.sin(self.yaw)*Math.cos(self.pitch),y:Math.sin(self.pitch),z:-Math.cos(self.yaw)*Math.cos(self.pitch)};
  const from={x:self.x,y:1.58+self.jumpY,z:self.z};
  send({t:'move',x:self.x,z:self.z,yaw:self.yaw,pitch:self.pitch});
  send({t:'fire',dx:dir.x,dy:dir.y,dz:dir.z});
  self.ammo--;refreshAmmo();playSound('shoot');shake=.06;
  const to={x:from.x+dir.x*35,y:from.y+dir.y*35,z:from.z+dir.z*35};
  makeTrail(from,to,0x59edff,true);gunKick=.2;
  if(self.ammo===0)setTimeout(()=>{if(!reloadUntil)reload();},220);
}
window.addEventListener('keydown',e=>{
  const key=e.code;
  if(!entered || (document.activeElement?.tagName==='INPUT'))return;
  if(['Space','Tab','ArrowUp','ArrowDown'].includes(key))e.preventDefault();
  keys.add(key);
  if(key==='KeyR')reload();
  if(key==='Tab')ui.score.classList.remove('hidden');
  if(key==='KeyM'){soundEnabled=!soundEnabled;toast(`Sound ${soundEnabled?'ON':'OFF'}`);}
  if(key==='Space'&&playing&&self.onGround&&self.health>0){self.jumpVelocity=6.5;self.onGround=false;playSound('jump');}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Tab')ui.score.classList.add('hidden');});
window.addEventListener('blur',()=>{keys.clear();ui.score.classList.add('hidden');});
renderer.domElement.addEventListener('mousedown',e=>{if(e.button===0&&playing){triggerHeld=true;fire();}});
window.addEventListener('mouseup',e=>{if(e.button===0)triggerHeld=false;});
window.addEventListener('mousemove',e=>{
  if(!playing||isTouch)return;
  const sensitivity=.0023;
  self.yaw-=e.movementX*sensitivity;self.pitch=Math.max(-1.40,Math.min(1.40,self.pitch-e.movementY*sensitivity));
});
let triggerHeld=false,gunKick=0,walkPhase=0,footstepPhase=0;
function moveCollision(x,z){
  const max=boundary-.95;
  const blocked=(xx,zz)=>Math.abs(xx)>max||Math.abs(zz)>max||WORLD.obstacles.some(o=>(xx-o.x)**2+(zz-o.z)**2<(o.r+.47)**2);
  if(!blocked(x,z)){self.x=x;self.z=z;return;}
  if(!blocked(x,self.z)){self.x=x;return;}
  if(!blocked(self.x,z))self.z=z;
}
let joystick={x:0,y:0};
function updateMovement(dt,now){
  if(!playing||self.health<=0)return;
  let x=0,z=0;
  if(keys.has('KeyW')||keys.has('ArrowUp'))z+=1;
  if(keys.has('KeyS')||keys.has('ArrowDown'))z-=1;
  if(keys.has('KeyA'))x-=1;
  if(keys.has('KeyD'))x+=1;
  if(isTouch){x+=joystick.x;z-=joystick.y;}
  const moveLength=Math.hypot(x,z);
  if(moveLength>.01){
    const norm=Math.max(1,moveLength);x/=norm;z/=norm;
    const sp=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?8.25:6.0;
    const dirX=(-Math.sin(self.yaw)*z+Math.cos(self.yaw)*x)*sp*dt;
    const dirZ=(-Math.cos(self.yaw)*z-Math.sin(self.yaw)*x)*sp*dt;
    moveCollision(self.x+dirX,self.z+dirZ);
    walkPhase+=dt*sp*1.72;
  }
  if(!self.onGround){self.jumpVelocity-=17.5*dt;self.jumpY+=self.jumpVelocity*dt;if(self.jumpY<=0){self.jumpY=0;self.jumpVelocity=0;self.onGround=true;}}
  if(now-lastMoveSent>50){lastMoveSent=now;send({t:'move',x:self.x,z:self.z,yaw:self.yaw,pitch:self.pitch});}
  if(triggerHeld)fire();
  const bob=self.onGround&&moveLength>.02?Math.sin(walkPhase)*.035:0;
  camera.position.set(self.x,1.58+self.jumpY+bob,self.z);
  camera.rotation.order='YXZ';camera.rotation.set(self.pitch,self.yaw,shake?Math.sin(now*.07)*shake*.09:0);
  const ease=Math.min(1,dt*12);gunKick=Math.max(0,gunKick-dt*1.2);gunRoot.position.x+=(.48+Math.sin(walkPhase*.5)*.014*moveLength-gunRoot.position.x)*ease;gunRoot.position.y+=(-.43+Math.abs(Math.cos(walkPhase))*.012*moveLength-gunKick*.12-gunRoot.position.y)*ease;gunRoot.position.z=-.8+gunKick*.14;gunRoot.rotation.x=-gunKick*.45;
  shake=Math.max(0,shake-dt*.85);
}
function makeTrail(from,to,color,local=false){
  const start=new THREE.Vector3(from.x,from.y,from.z),end=new THREE.Vector3(to.x,to.y,to.z);
  const length=start.distanceTo(end);if(!Number.isFinite(length)||length<.01)return;
  // Only paint the first metres when client is predicting a shot, server sends actual endpoint to others.
  const capped=local?Math.min(length,13):Math.min(length,50);
  const e=end.clone().sub(start).normalize().multiplyScalar(capped).add(start);
  const geometry=new THREE.BufferGeometry().setFromPoints([start,e]);
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}));scene.add(line);
  const orb=ball(.14,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.88}),start.x,start.y,start.z);
  scene.add(orb);
  effects.push({kind:'trail',obj:line,orb,from:start,to:e,life:.21,max:.21});
}
const effects=[];
function popSparks(position,color,count=16){
  if(!position||!Number.isFinite(position.x))return;
  for(let i=0;i<count;i++){
    const m=mesh(new THREE.OctahedronGeometry(.055+Math.random()*.12),new THREE.MeshBasicMaterial({color:Math.random()<.22?0xffffff:color,transparent:true,opacity:1}),position.x,position.y,position.z);
    scene.add(m);const angle=Math.random()*Math.PI*2,vy=(Math.random()-.25)*6,speed=1.8+Math.random()*4;
    effects.push({kind:'spark',obj:m,vx:Math.cos(angle)*speed,vy,vz:Math.sin(angle)*speed,life:.65+Math.random()*.55,max:1});
  }
}
function animateEffects(dt){
  for(let i=effects.length-1;i>=0;i--){
    const e=effects[i];e.life-=dt;
    if(e.kind==='trail'){
      const progress=1-Math.max(0,e.life)/e.max;e.orb.position.lerpVectors(e.from,e.to,Math.min(progress,1));
      e.obj.material.opacity=Math.max(0,.75*(1-progress));e.orb.material.opacity=Math.max(0,1-progress);
    }else{
      e.obj.position.x+=e.vx*dt;e.obj.position.y+=e.vy*dt;e.obj.position.z+=e.vz*dt;e.vy-=8*dt;e.obj.rotation.x+=dt*7;e.obj.rotation.y+=dt*6;
      e.obj.material.opacity=Math.max(0,Math.min(1,e.life*2));e.obj.scale.multiplyScalar(Math.max(.96,1-dt*.5));
    }
    if(e.life<=0){scene.remove(e.obj);e.obj.geometry.dispose();e.obj.material.dispose();if(e.orb){scene.remove(e.orb);/* shared sphere geometry, do not dispose */e.orb.material.dispose();}effects.splice(i,1);}
  }
}
let audioCtx=null,soundEnabled=true;
function initAudio(){if(!soundEnabled)return;if(!audioCtx){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)audioCtx=new Audio();}if(audioCtx?.state==='suspended')audioCtx.resume();}
function playSound(type,volume=1){
  if(!audioCtx||!soundEnabled)return;
  try{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
    const presets={shoot:[480,970,.12,'sine',.09],hit:[1000,520,.09,'triangle',.06],pop:[370,70,.27,'sine',.2],hurt:[250,150,.14,'sawtooth',.05],reload:[340,650,.17,'sine',.07],jump:[280,380,.12,'sine',.04],win:[500,950,.5,'triangle',.1]};
    const [start,end,duration,wave,loud]=presets[type]||presets.shoot;
    o.type=wave;o.frequency.setValueAtTime(start,t);o.frequency.exponentialRampToValueAtTime(Math.max(end,1),t+duration);
    g.gain.setValueAtTime(loud*volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);
    o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+duration+.015);
  }catch{}
}
// Coarse-pointer controls: left drag is stick, right drag rotates the camera.
if(isTouch){
  const stick=$('touch-stick'),knob=$('stick-knob');let stickPointer=null,lookPointer=null,lastX=0,lastY=0;
  stick.addEventListener('pointerdown',e=>{e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e);});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)updateStick(e);});
  const releaseStick=()=>{stickPointer=null;joystick={x:0,y:0};knob.style.transform='translate(0px,0px)';};
  stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);
  function updateStick(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const len=Math.max(1,Math.hypot(dx,dy));if(len>45){dx=dx/len*45;dy=dy/len*45;}joystick={x:dx/45,y:dy/45};knob.style.transform=`translate(${dx}px,${dy}px)`;}
  renderer.domElement.addEventListener('pointerdown',e=>{if(!playing||e.clientX<innerWidth*.3)return;lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||!playing)return;self.yaw-=(e.clientX-lastX)*.005;self.pitch=Math.max(-1.4,Math.min(1.4,self.pitch-(e.clientY-lastY)*.005));lastX=e.clientX;lastY=e.clientY;});
  renderer.domElement.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
  $('touch-fire').addEventListener('pointerdown',e=>{e.preventDefault();triggerHeld=true;fire();});
  $('touch-fire').addEventListener('pointerup',()=>triggerHeld=false);$('touch-fire').addEventListener('pointercancel',()=>triggerHeld=false);
  $('touch-jump').addEventListener('pointerdown',e=>{e.preventDefault();if(self.onGround){self.jumpVelocity=6.5;self.onGround=false;}});
  $('touch-reload').addEventListener('pointerdown',e=>{e.preventDefault();reload();});
}
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05),now=performance.now();
  if(!entered){
    const t=now*.00016;camera.position.set(Math.sin(t)*38,10.2+Math.sin(t*.7)*1.2,Math.cos(t)*38);camera.lookAt(0,2,0);
    gunRoot.visible=false;
  }else{
    gunRoot.visible=self.health>0;
    if(playing)updateMovement(dt,now);
    else if(!isTouch){camera.position.set(self.x,1.58+self.jumpY,self.z);camera.rotation.order='YXZ';camera.rotation.set(self.pitch,self.yaw,0);}
    if(reloadUntil){ui.reloadFill.style.width=`${Math.min(100,Math.max(0,(Date.now()-reloadStart)/Math.max(1,reloadUntil-reloadStart)*100))}%`;}
    else ui.reloadFill.style.width='100%';
    const seconds=Math.max(0,Math.ceil((roundEnds-Date.now())/1000));ui.clock.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    if(hitPulse && now>hitPulse){ui.hit.classList.remove('show');hitPulse=0;}
  }
  for(const pm of playerModels.values()){
    const alpha=Math.min(1,dt*12);
    pm.group.position.x+=((pm.tx??pm.group.position.x)-pm.group.position.x)*alpha;
    pm.group.position.z+=((pm.tz??pm.group.position.z)-pm.group.position.z)*alpha;
    if(Number.isFinite(pm.yaw))pm.group.rotation.y+=Math.atan2(Math.sin(pm.yaw-pm.group.rotation.y),Math.cos(pm.yaw-pm.group.rotation.y))*alpha;
    pm.appearance.position.y=Math.sin(now*.003+pm.group.position.x*.2)*.035;
  }
  animateEffects(dt);renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isTouch?1.25:1.8));});
animate();
