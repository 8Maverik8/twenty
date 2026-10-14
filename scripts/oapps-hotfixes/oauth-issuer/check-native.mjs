import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { patchSource } from './patch.mjs';
const dir = mkdtempSync(join(tmpdir(),'crm-issuer-check-'));
try {
  const file = join(dir,'auth.service.js');
  writeFileSync(file,patchSource(readFileSync(new URL('./auth-service-v2.4.0.fixture.js',import.meta.url),'utf8')));
  const check = spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if (check.status !== 0) throw new Error('Patched native source syntax failed');
  console.log('Exact reviewed native runtime patch compiles');
} finally { rmSync(dir,{recursive:true,force:true}); }
