import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const spec = JSON.parse(readFileSync(new URL('./patch.json', import.meta.url), 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
export function patchSource(source) {
  if (hash(source) === spec.after_sha256) return source;
  if (hash(source) !== spec.before_sha256) throw new Error('Unreviewed runtime source; refusing patch');
  if (source.split(spec.before).length !== 2) throw new Error('Patch target is ambiguous');
  const result = source.replace(spec.before, spec.after);
  if (hash(result) !== spec.after_sha256) throw new Error('Unexpected patch result');
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  if (!path) throw new Error('Provide an explicitly staged auth.service.js path');
  const source = readFileSync(path, 'utf8');
  const result = patchSource(source);
  if (!process.argv.includes('--check') && result !== source) {
    const temp = path + '.oauth-issuer-' + process.pid;
    try {
      writeFileSync(temp, result, { flag: 'wx', mode: statSync(path).mode });
      renameSync(temp, path);
    } finally {
      try { unlinkSync(temp); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  console.log(JSON.stringify({ checked: true, changed: result !== source, before: hash(source), after: hash(result) }));
}
