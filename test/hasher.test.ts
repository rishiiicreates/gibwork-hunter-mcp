import { describe, it, expect } from 'vitest';
import { computeWorkspaceFingerprint } from '../src/utils/hasher.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('Workspace Fingerprint Generator', () => {
  it('computes deterministic SHA-256 fingerprint for a directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gibwork-test-fp-'));
    try {
      fs.writeFileSync(path.join(tempDir, 'fileA.txt'), 'Content A');
      fs.writeFileSync(path.join(tempDir, 'fileB.txt'), 'Content B');

      const res1 = computeWorkspaceFingerprint(tempDir);
      const res2 = computeWorkspaceFingerprint(tempDir);

      expect(res1.fingerprint).toBe(res2.fingerprint);
      expect(res1.fileCount).toBe(2);
      expect(res1.files.length).toBe(2);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ignores .git and node_modules directories', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gibwork-test-ignore-'));
    try {
      fs.writeFileSync(path.join(tempDir, 'main.ts'), 'console.log("hi");');
      fs.mkdirSync(path.join(tempDir, 'node_modules'));
      fs.writeFileSync(path.join(tempDir, 'node_modules', 'dep.js'), 'module.exports = 1;');
      fs.mkdirSync(path.join(tempDir, '.git'));
      fs.writeFileSync(path.join(tempDir, '.git', 'HEAD'), 'ref: refs/heads/main');

      const res = computeWorkspaceFingerprint(tempDir);
      expect(res.fileCount).toBe(1);
      expect(res.files[0].relativePath).toBe('main.ts');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
