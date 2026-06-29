import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FIX_VERSION = 'bizdeal-amp-wording-v1';

export default async function transformBizDealWording(dist) {
  const file = path.join(dist, 'biz-deal.html');
  let html = await readFile(file, 'utf8');
  const before = html;
  html = html.replaceAll('&amp;', '&');
  if (html === before) {
    console.warn(`[${FIX_VERSION}] no &amp; entities found in biz-deal.html`);
  } else {
    await writeFile(file, html, 'utf8');
    console.log(`[${FIX_VERSION}] replaced &amp; with & in biz-deal.html`);
  }
}
