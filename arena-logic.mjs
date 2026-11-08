export const MAX_HEALTH = 100;
export const DAMAGE = 34;
export const BOT_DAMAGE = 11;
export const MAG_SIZE = 14;
export const RELOAD_MS = 1600;
export const SHOT_COOLDOWN_MS = 260;
export const RESPAWN_MS = 2400;
export const ROUND_MS = 5 * 60_000;
export const MAX_RANGE = 46;

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const sqDist = (a, b) => (a.x-b.x)**2 + (a.z-b.z)**2;
export const len3 = (v) => Math.hypot(v.x, v.y, v.z);
export function normalize3(v) { const l = len3(v); return l > 0.0001 ? {x:v.x/l,y:v.y/l,z:v.z/l} : null; }
export function sanitizeName(s) { return String(s||'Balloon Hero').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,18) || 'Balloon Hero'; }
export function sanitizeRoom(s) { return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); }
export function randomRoom() { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:5},()=>chars[Math.floor(Math.random()*chars.length)]).join(''); }
export function collides(x,z,world,pad=0.55) {
  const boundary=world.size/2-0.8;
  if (Math.abs(x)>boundary-pad || Math.abs(z)>boundary-pad) return true;
  return world.obstacles.some(o=>(x-o.x)**2+(z-o.z)**2 < (o.r+pad)**2);
}
export function freeMove(from,x,z,world,pad=0.55) {
  if (!collides(x,z,world,pad)) return {x,z};
  if (!collides(x,from.z,world,pad)) return {x,z:from.z};
  if (!collides(from.x,z,world,pad)) return {x:from.x,z};
  return {x:from.x,z:from.z};
}
// Ray is measured from player eye, including pitch. Return the first intersection along the ray.
export function raySphere(from,dir,center,r) {
  const ox=from.x-center.x,oy=from.y-center.y,oz=from.z-center.z;
  const b=ox*dir.x+oy*dir.y+oz*dir.z;
  const c=ox*ox+oy*oy+oz*oz-r*r;
  const d=b*b-c;
  if (d<0) return Infinity;
  const t=-b-Math.sqrt(d);
  return t>0.01?t:Infinity;
}
export function rayCylinder(from,dir,o) {
  // Opaque round blocker, floor to height h.
  const a=dir.x*dir.x+dir.z*dir.z;
  if (a<0.0001) return Infinity;
  const ox=from.x-o.x,oz=from.z-o.z;
  const b=2*(ox*dir.x+oz*dir.z);
  const c=ox*ox+oz*oz-o.r*o.r;
  const disc=b*b-4*a*c;
  if (disc<0) return Infinity;
  const t=(-b-Math.sqrt(disc))/(2*a);
  const t2=(-b+Math.sqrt(disc))/(2*a);
  for (const v of [t,t2]) { if (v>0.01 && from.y+dir.y*v>=0 && from.y+dir.y*v<=o.h) return v; }
  return Infinity;
}
export function trace(from,dir,targets,world,ignoreId=null) {
  let distance=MAX_RANGE,target=null;
  const size=world.size/2;
  // Arena walls.
  for (const axis of ['x','z']) if (Math.abs(dir[axis])>1e-5) for (const side of [-size,size]) {
    const t=(side-from[axis])/dir[axis]; if(t>0 && t<distance) distance=t;
  }
  if (dir.y < -1e-5) {const t=-from.y/dir.y;if(t>0 && t<distance)distance=t;}
  for(const o of world.obstacles){const t=rayCylinder(from,dir,o);if(t<distance) {distance=t; target=null;}}
  for(const p of targets){
    if(p.id===ignoreId || p.hp<=0)continue;
    const body=raySphere(from,dir,{x:p.x,y:1.02,z:p.z},.77);
    const head=raySphere(from,dir,{x:p.x,y:1.73,z:p.z},.48);
    const d=Math.min(body,head);
    if(d<distance){distance=d;target=p;}
  }
  return {target,distance,point:{x:from.x+dir.x*distance,y:from.y+dir.y*distance,z:from.z+dir.z*distance}};
}
