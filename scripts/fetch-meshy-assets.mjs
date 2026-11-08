/**
 * Downloads the four user-owned Meshy 3D GLB assets into public/assets.
 * Signed Meshy URLs expire. If a link expires, re-download from your Meshy
 * Studio (IDs in MESHY-MODELS.md) and place each file here manually.
 * Existing local assets are never overwritten.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
const DEST=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/assets');
fs.mkdirSync(DEST,{recursive:true});
const assets={
  character:'https://assets.meshy.ai/uploads/converted/01a1bb88-b3be-77e5-8eb1-8d4884cc946a/01a1bb8d-75f0-7435-b0f4-b0ffb92f8c91/Meshy_AI_One_cute_full_body_hu_1108142612_texture.glb?Expires=1794268800&Signature=MbP9wV5-hu4Xwt-osP~exm7saH0gbeR5LE0SqGbLg7nVnXdpoYInDHAeA0kHexN-WuYN63u56RwhN5hD-vV--APQnP0~hGB3AjS4d3bQNWMcZE294OWmNX73qH8mNbPLj03G0g-Bp72jjJKZ22rhhz8HAZ~gyfDdGAKQAgqPKOJ6maiGAQtxKJGCnezYhmWDurxhDO8XxdIprtJtWUFGPY7E7WGQdrL-hf56uJ1O8zBPX71CBNxcobsXVqPoxwC2C7i5CS~QcQabOy2wCifNuLkRxib-7D~0wXRAzVv1IvHo2d5laaejAi4pcBBKU8HukzX6tCKWLCjRDRK2ePEH9Q__&Key-Pair-Id=K1VGYTHIYLM9UM',
  blaster:'https://assets.meshy.ai/uploads/converted/01a1bb8d-aafa-752c-bb48-b07c6af544ad/01a1bb93-acae-7638-8ee8-bbc0f09bd5ec/Meshy_AI_Single_whimsical_toy__1108143259_texture.glb?Expires=1794268800&Signature=AplW8yGBRhvIsSEIAkk9y5OORqNFbE~4kBxgTXTQLyob-~j3osSN8BZj6mJ0wLewTKDYVxLd-CHdINJJb98cWLqebHzqdhI-xwZnKX-94dHmqtctH3l1m5q6XFD636IL3MT0ZPsy72skM-CCEBNWGogkA2CXnlOPM0m3VJLd7GvvU81Aw-lIfjGmT6Bq7HSyFuxltBTs6AOYlEDDQdgPpn7r2vWK29W23iZeAbqUhkaKlIrI3lRKbcIRaBbmSK4NzFVwH7kaWuhkv0gF-rYXj7gBPIe0kKXMrDVWUVYL5~WHdsUkNVi-StLeQWtDn-m1-twe0rZrK7A~uH-LXoy7qQ__&Key-Pair-Id=K1VGYTHIYLM9UM',
  cactus:'https://assets.meshy.ai/uploads/converted/01a1bb8d-bdcd-76fb-8420-8f692e642c14/01a1bb93-b2d2-769f-b274-f817fbd563ec/Meshy_AI_A_cute_inflated_ballo_1108143301_texture.glb?Expires=1794268800&Signature=F1PgtmthT3kvKsAitl1nNldwFlNHjViIYUmclmzJICCO~C3EWhl6GpbDAYIlV6v5jPhQrIB0SUrfIMZIrVO87Wx5C2pRR30WEHibFvqKR90cQcCSXFBKwS7Pu-OY4pgUHRFzUskjJKyMWkZcnHzDca4s6d8Q1A~l2PPlFav8D0Bl6dv9uczGHojWf7j8vV3UuUIUtzhmzw8hMNu9MdUArytJNPgdizolJbd2OLbNFBNQEUgaesou7wUlJVIHzjKDb3mBL6Ykmzs09Y5ZrejaWw3teroprdg4YSo57te2EP5Dovv0nz~cDYDz-YSZeLfpZkBNNMcdZNKqSZl1HbN3ag__&Key-Pair-Id=K1VGYTHIYLM9UM',
  barricade:'https://assets.meshy.ai/uploads/converted/01a1bb8d-ca9b-72a2-90d9-7299dda3818c/01a1bb93-b9cb-7459-bc1e-a59f799044c7/Meshy_AI_Single_colorful_overs_1108143303_texture.glb?Expires=1794268800&Signature=Cl3k8pZ7mRlGkO0Zq60CVbF2zIgG5Aq7Bs-Xplj0LDQS-7k-r5Ioz93jWnoT8J4zvTWmN7MdrGK-zkGnaBsEwW5l-cfOOGr1wWzfJ1gtx8To2WLS8ZiekgpapO8WWpfy~DriofJpu2Enz5xw-BnJNbMj9LciQpRB-uOmCwDmYlU~-Cer-y0SDJMj72FSnFdxG6jc8E0YbaXrmPFHHjIdM2kiS9RI8XmB3sniNbwc6nS5hmDZsWTVkUR6oVg9feWGarMwQiPT7hKYGLIR9PUYQY7b88ce~YUL9tCCcuRv4vV7C9~KSn4W35Mhyl3Y2iJTklhlWKsopN~B~QBVY870vA__&Key-Pair-Id=K1VGYTHIYLM9UM'
};
let failed=0;
for(const [name,url] of Object.entries(assets)){
  const target=path.join(DEST,`${name}.glb`);
  if(fs.existsSync(target)&&fs.statSync(target).size>500){console.log(`✓ ${name}: already available`);continue;}
  process.stdout.write(`↓ ${name}: fetching Meshy model... `);
  const temp=target+'.part';
  try{
    const res=await fetch(url,{signal:AbortSignal.timeout(90_000)});
    if(!res.ok||!res.body)throw new Error(`HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body),fs.createWriteStream(temp));
    if(fs.statSync(temp).size<500)throw new Error('File is empty or incomplete');
    fs.renameSync(temp,target);
    console.log(`${(fs.statSync(target).size/1024/1024).toFixed(1)} MB`);
  }catch(e){failed++;console.log('failed:',e.message);try{fs.unlinkSync(temp);}catch{}}
}
if(failed){
  console.warn(`\n${failed} Meshy model(s) could not be fetched. Game still runs with built-in balloon models.`);
  console.warn('Download GLBs from Meshy Studio and place them in public/assets as character.glb, blaster.glb, cactus.glb, barricade.glb.');
  process.exitCode=1;
}else{console.log('\nAll Meshy assets are installed and will load automatically.');}
