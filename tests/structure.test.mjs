import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(name)=>readFileSync(new URL(name,root),'utf8');
test('game includes all deployable entrypoints',()=>{
  for(const file of ['server.mjs','public/game.js','public/style.css','public/index.html','render.yaml','Dockerfile'])assert.ok(existsSync(new URL(file,root)),file);
});
test('browser import map resolves the locally bundled Three.js module',()=>{
  const html=read('public/index.html');
  assert.match(html,/\/vendor\/three\/build\/three\.module\.js/);
  assert.match(html,/\/game\.js/);
  assert.match(html,/id="play"/);
});
test('Meshy asset manifest covers all generated models',()=>{
  const script=read('scripts/fetch-meshy-assets.mjs');
  assert.match(read('public/game.js'), /loader\.load\(`\/assets\/\$\{name\}\.glb`/);
  for(const name of ['character','blaster','cactus','barricade']){
    assert.match(script,new RegExp(`${name}:'https://assets\\.meshy\\.ai/`));
  }
});
