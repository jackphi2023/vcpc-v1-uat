import { cp, mkdir, rm, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import transformAuthRuntime from './transform-auth-runtime.mjs';
import transformBizDeal from './transform-bizdeal.mjs';
import transformPricing from './transform-pricing.mjs';
import transformUploadIntake from './transform-upload-intake.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');
const exclude = new Set(['node_modules','dist','supabase','tests','scripts','.git','.netlify']);

await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});

for (const name of await readdir(root)) {
  if (exclude.has(name) || name.startsWith('.env')) continue;
  const src = path.join(root,name);
  const dst = path.join(dist,name);
  const s = await stat(src);
  if (s.isDirectory()) await cp(src,dst,{recursive:true});
  else await cp(src,dst);
}

const indexPath = path.join(dist,'index.html');
await stat(indexPath);
await transformAuthRuntime(dist);
await transformUploadIntake(dist);

async function runOptionalTransform(name, transform) {
  try {
    await transform(dist);
    console.log(`[build] ${name}: applied`);
  } catch (error) {
    console.warn(`[build] ${name}: skipped because ${error.message}`);
  }
}

await runOptionalTransform('BizDeal transform', transformBizDeal);
await runOptionalTransform('Pricing transform', transformPricing);

const deployInfo = {
  commit: process.env.COMMIT_REF || process.env.HEAD || 'local',
  branch: process.env.BRANCH || 'local',
  context: process.env.CONTEXT || 'local',
  builtAt: new Date().toISOString(),
  indexIncluded: true,
  authRuntimeFix: 'url-constructor-shadow',
  uploadIntakeGateFix: 'data-gap-v1'
};
await writeFile(path.join(dist,'deploy-info.json'), JSON.stringify(deployInfo,null,2));

console.log(`[build] index.html included in ${dist}`);
console.log(`Built static site to ${dist}`);
