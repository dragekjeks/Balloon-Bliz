import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collides,freeMove,normalize3,raySphere,rayCylinder,trace,sanitizeName,sanitizeRoom} from '../arena-logic.mjs';
const world=JSON.parse(readFileSync(new URL('../public/world.json',import.meta.url)));
test('names and room code are sanitized',()=>{
  assert.equal(sanitizeName('<b>Balloon</b>'),'bBalloonb');
  assert.equal(sanitizeRoom('abc !1234'),'ABC123');
});
test('normalizing directions',()=>{
  const v=normalize3({x:3,y:0,z:4});assert.equal(v.x,.6);assert.equal(v.z,.8);
  assert.equal(normalize3({x:0,y:0,z:0}),null);
});
test('boundary and cover collisions',()=>{
  assert.equal(collides(0,0,world),true);
  assert.equal(collides(22,22,world),false);
  assert.equal(collides(30,0,world),true);
  assert.equal(collides(-10,-8,world),true);
});
test('player slides along walls and obstacles instead of crossing them',()=>{
  const x=freeMove({x:4,z:0},0,0,world);
  assert.deepEqual(x,{x:4,z:0});
});
test('ray hits character in a clear lane',()=>{
  const from={x:22,y:1.58,z:22},dir=normalize3({x:0,y:-.11,z:-1});
  const target={id:'target',x:22,z:18,hp:100};
  const {target:t,distance}=trace(from,dir,[target],world,'shooter');
  assert.equal(t?.id,'target');assert.ok(distance<5);
});
test('ray is blocked by inflatable cover before character',()=>{
  const from={x:-10,y:1.58,z:-13};const dir=normalize3({x:0,y:0,z:1});
  const target={id:'target',x:-10,z:-3,hp:100};
  const result=trace(from,dir,[target],world,'shooter');
  assert.equal(result.target,null);assert.ok(result.distance<10);
});
test('dead players cannot be hit',()=>{
  const result=trace({x:21,y:1.5,z:22},{x:0,y:0,z:-1},[{id:'dead',x:21,z:18,hp:0}],world);
  assert.equal(result.target,null);
});
test('ray geometry',()=>{
  assert.ok(Number.isFinite(raySphere({x:0,y:0,z:0},{x:0,y:0,z:-1},{x:0,y:0,z:-4},.8)));
  assert.equal(raySphere({x:0,y:0,z:0},{x:0,y:0,z:-1},{x:10,y:0,z:-4},.8),Infinity);
  assert.ok(Number.isFinite(rayCylinder({x:0,y:1,z:0},{x:0,y:0,z:-1},{x:0,z:-5,r:2,h:3})));
});
