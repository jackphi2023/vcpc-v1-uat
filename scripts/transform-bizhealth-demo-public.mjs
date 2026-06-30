import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FIX_VERSION = 'bizhealth-demo-public-route-v1';

function removeHeaderStrips(html) {
  return html
    .replace(/\n\s*<div class="svc-strip"><div class="in"><span class="svc-pill">BIZHEALTH DASHBOARD<\/span>[\s\S]*?<\/div><\/div>\s*/g, '\n')
    .replace(/\n\s*<div class="svc-strip" style="background:#fff7e0"><div class="in"><span class="svc-pill">PUBLIC DEMO<\/span>[\s\S]*?<\/div><\/div>\s*/g, '\n');
}

export default async function transformBizHealthDemoPublic(dist) {
  const sourceFile = path.join(dist, 'demo', 'bizhealth-dashboard-demo.html');
  let html = await readFile(sourceFile, 'utf8');
  const before = html;
  html = removeHeaderStrips(html);

  if (html !== before) {
    await writeFile(sourceFile, html, 'utf8');
    console.log(`[${FIX_VERSION}] removed public header strips from bizhealth-dashboard-demo.html`);
  } else {
    console.warn(`[${FIX_VERSION}] no removable header strips found in bizhealth-dashboard-demo.html`);
  }

  const prettyRouteDir = path.join(dist, 'demo', 'bizhealth');
  await mkdir(prettyRouteDir, { recursive: true });
  await writeFile(path.join(prettyRouteDir, 'index.html'), html, 'utf8');
  console.log(`[${FIX_VERSION}] mirrored dashboard demo to /demo/bizhealth/index.html`);
}
