import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.cache',
  '.gemini',
]);

const IGNORED_FILES = new Set([
  '.DS_Store',
  '.env',
  '.env.local',
  '.env.production',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);

export interface WorkspaceFingerprint {
  fingerprint: string;
  fileCount: number;
  files: Array<{ relativePath: string; hash: string; size: number }>;
}

/**
 * Deterministically scans a directory and calculates a cryptographic digest
 * representing the exact state of deliverables.
 */
export function computeWorkspaceFingerprint(dirPath: string): WorkspaceFingerprint {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Workspace path does not exist: ${dirPath}`);
  }

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    const content = fs.readFileSync(dirPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return {
      fingerprint: hash,
      fileCount: 1,
      files: [{ relativePath: path.basename(dirPath), hash, size: stat.size }],
    };
  }

  const files: Array<{ relativePath: string; hash: string; size: number }> = [];

  function walk(currentDir: string, relativePrefix: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    // Sort entries alphabetically for deterministic order
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(path.join(currentDir, entry.name), path.join(relativePrefix, entry.name));
        }
      } else if (entry.isFile()) {
        if (!IGNORED_FILES.has(entry.name) && !entry.name.endsWith('.log')) {
          const filePath = path.join(currentDir, entry.name);
          try {
            const content = fs.readFileSync(filePath);
            const fileHash = crypto.createHash('sha256').update(content).digest('hex');
            const fileStat = fs.statSync(filePath);
            files.push({
              relativePath: path.join(relativePrefix, entry.name),
              hash: fileHash,
              size: fileStat.size,
            });
          } catch {
            // Skip unreadable files
          }
        }
      }
    }
  }

  walk(dirPath, '');

  // Compute master hash
  const masterHasher = crypto.createHash('sha256');
  for (const file of files) {
    masterHasher.update(`${file.relativePath}:${file.hash}:${file.size}\n`);
  }
  const fingerprint = masterHasher.digest('hex');

  return {
    fingerprint,
    fileCount: files.length,
    files,
  };
}
