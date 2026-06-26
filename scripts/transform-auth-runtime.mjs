import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CACHE_VERSION = '20260626-url-constructor-fix';

export default async function transformAuthRuntime(dist) {
  const adapterPath = path.join(dist, 'assets', 'mock-backend.js');
  let adapter = await readFile(adapterPath, 'utf8');

  const oldDeclaration = "var URL=C.SUPABASE_URL||";
  if (!adapter.includes(oldDeclaration)) {
    throw new Error('mock-backend.js no longer contains the expected Supabase URL declaration');
  }

  adapter = adapter.replace(
    oldDeclaration,
    "var SUPABASE_BASE_URL=C.SUPABASE_URL||"
  );

  const endpointReferences = (adapter.match(/\bURL(?=\+['"]\/)/g) || []).length;
  if (endpointReferences < 1) {
    throw new Error('No Supabase endpoint references were found in mock-backend.js');
  }

  adapter = adapter.replace(/\bURL(?=\+['"]\/)/g, 'SUPABASE_BASE_URL');

  if (adapter.includes(oldDeclaration) || /\bURL(?=\+['"]\/)/.test(adapter)) {
    throw new Error('URL constructor shadowing was not completely removed');
  }

  if (!adapter.includes("new URL('/app/auth-callback.html',location.origin)")) {
    throw new Error('The native URL constructor call is missing after transformation');
  }

  await writeFile(adapterPath, adapter, 'utf8');

  const configPath = path.join(dist, 'assets', 'app-config.js');
  let config = await readFile(configPath, 'utf8');
  config = config
    .replace(
      "../assets/signup-flow-v2.js",
      `../assets/signup-flow-v2.js?v=${CACHE_VERSION}`
    )
    .replace(
      "../assets/onboarding-flow-v2.js",
      `../assets/onboarding-flow-v2.js?v=${CACHE_VERSION}`
    );

  if (!config.includes(`signup-flow-v2.js?v=${CACHE_VERSION}`)) {
    throw new Error('Signup controller cache version was not added');
  }
  await writeFile(configPath, config, 'utf8');

  const appDir = path.join(dist, 'app');
  const entries = await readdir(appDir, { withFileTypes: true });
  let updatedPages = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    const filePath = path.join(appDir, entry.name);
    const original = await readFile(filePath, 'utf8');
    const updated = original
      .replaceAll(
        'src="../assets/app-config.js"',
        `src="../assets/app-config.js?v=${CACHE_VERSION}"`
      )
      .replaceAll(
        'src="../assets/mock-backend.js"',
        `src="../assets/mock-backend.js?v=${CACHE_VERSION}"`
      );

    if (updated !== original) {
      await writeFile(filePath, updated, 'utf8');
      updatedPages += 1;
    }
  }

  if (updatedPages < 1) {
    throw new Error('No app HTML pages received auth runtime cache versions');
  }

  console.log(
    `[auth-runtime] renamed Supabase URL variable, preserved native URL constructor, and versioned ${updatedPages} app pages`
  );
}
