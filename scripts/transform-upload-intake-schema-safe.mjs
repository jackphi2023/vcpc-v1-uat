import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const FIX_VERSION = 'upload-intake-schema-safe-v1';

async function walkHtml(dir) {
  const out = [];
  let entries = [];
  try { entries = await readdir(dir); } catch (_) { return out; }
  for (const name of entries) {
    const file = path.join(dir, name);
    const s = await stat(file);
    if (s.isDirectory()) out.push(...await walkHtml(file));
    else if (name.endsWith('.html')) out.push(file);
  }
  return out;
}

function removeUnsupportedDataUploadsColumns(html) {
  return html
    // Customer upload: keep per-upload coverage in summary.intake_coverage, not as a top-level data_uploads column.
    .replaceAll(',dqs_score:result.score,intake_coverage:gapForFile.coverage,rows:', ',dqs_score:result.score,rows:')
    // Customer Google Sheet link.
    .replaceAll(',dqs_score:45,intake_coverage:30,rows:', ',dqs_score:45,rows:')
    // Admin supplementary file upload.
    .replaceAll(',dqs_score:60,intake_coverage:60,rows:', ',dqs_score:60,rows:')
    // Admin supplementary Google Sheet link.
    .replaceAll(',dqs_score:50,intake_coverage:50,rows:', ',dqs_score:50,rows:');
}

export default async function transformUploadIntakeSchemaSafe(dist) {
  const targets = [path.join(dist, 'app'), path.join(dist, 'admin')];
  let changed = 0;
  for (const dir of targets) {
    for (const file of await walkHtml(dir)) {
      const before = await readFile(file, 'utf8');
      const after = removeUnsupportedDataUploadsColumns(before);
      if (after !== before) {
        await writeFile(file, after, 'utf8');
        changed += 1;
      }
    }
  }
  console.log(`[${FIX_VERSION}] removed unsupported top-level intake_coverage from data_uploads inserts in ${changed} built HTML file(s)`);
}
