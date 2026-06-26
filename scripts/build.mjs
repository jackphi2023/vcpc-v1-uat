import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import transformBizDeal from './transform-bizdeal.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');
const exclude = new Set(['node_modules','dist','supabase','tests','scripts','.git','.netlify']);
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for (const name of await readdir(root)) {
  if (exclude.has(name) || name.startsWith('.env')) continue;
  const src=path.join(root,name), dst=path.join(dist,name);
  const s=await stat(src);
  if (s.isDirectory()) await cp(src,dst,{recursive:true});
  else await cp(src,dst);
}
await transformBizDeal(dist);
console.log(`Built static site to ${dist}`);
