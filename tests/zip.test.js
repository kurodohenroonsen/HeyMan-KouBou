import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { crc32, createZip } from '../core/zip.js';

test('crc32 correspond aux valeurs de référence', () => {
  assert.equal(crc32(new TextEncoder().encode('')), 0);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
});

test('createZip produit une archive lisible par un outil standard, accents compris', () => {
  const zip = createZip([
    { name: 'index.html', data: '<p>Été</p>' },
    { name: 'nl/index.html', data: 'Hallo' },
    { name: 'assets/a.bin', data: new Uint8Array([0, 1, 2, 255]) }
  ]);
  const dir = mkdtempSync(join(tmpdir(), 'atelier-zip-'));
  const file = join(dir, 'test.zip');
  writeFileSync(file, zip);
  const out = execFileSync('python3', ['-I', '-c', `
import zipfile,sys
z=zipfile.ZipFile(sys.argv[1])
assert z.testzip() is None
print("|".join(z.namelist()))
print(z.read("index.html").decode("utf-8"))
print(list(z.read("assets/a.bin")))
`, file]).toString().trim().split('\n');
  assert.equal(out[0], 'index.html|nl/index.html|assets/a.bin');
  assert.equal(out[1], '<p>Été</p>');
  assert.equal(out[2], '[0, 1, 2, 255]');
});
