import { describe, it, expect } from 'vitest';
import { verifierService } from '../src/services/verifier-service.js';
import { Bounty } from '../src/types/bounty.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Workspace Deliverable Verifier Service', () => {
  const mockBounty: Bounty = {
    id: 'test-bounty-1',
    slug: 'test-bounty-1',
    title: 'Test Bounty Verification',
    description: 'Unit testing verifier engine',
    category: 'Testing',
    skills: ['TypeScript'],
    tags: ['test'],
    reward: { amount: 500, symbol: 'USDC', mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', usdValue: 500 },
    status: 'OPEN',
    sponsor: { id: 's1', name: 'Tester', walletAddress: '11111111111111111111111111111111', verified: true, rating: 5 },
    escrow: { address: 'escrow1', amount: 500, symbol: 'USDC', mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', network: 'mock', confirmed: true },
    requirements: [
      {
        id: 'req-readme',
        title: 'Project Documentation',
        description: 'Must have README.md file',
        type: 'file_exists',
        target: 'README.md',
        mandatory: true,
        weight: 40,
      },
      {
        id: 'req-strict',
        title: 'Strict Configuration',
        description: 'Config must have strict: true',
        type: 'pattern_match',
        target: 'config.json',
        pattern: '"strict": true',
        mandatory: true,
        weight: 40,
      },
      {
        id: 'req-license',
        title: 'License File',
        description: 'Optional LICENSE file',
        type: 'file_exists',
        target: 'LICENSE',
        mandatory: false,
        weight: 20,
      },
    ],
    minSubmissionAmount: 0.15,
    submissionsCount: 0,
    deadline: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    roiScore: 90,
    isOpen: true,
    allowOnlyVerified: false,
  };

  it('fails when mandatory requirements are missing', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gibwork-v-fail-'));
    try {
      const report = await verifierService.verifyWorkspace(mockBounty, tempDir);
      expect(report.passed).toBe(false);
      expect(report.score).toBe(0);
      expect(report.mandatoryFailedCount).toBe(2);
      expect(report.recommendations.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('passes when mandatory and optional requirements are met', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gibwork-v-pass-'));
    try {
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Project');
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{"strict": true}');
      fs.writeFileSync(path.join(tempDir, 'LICENSE'), 'MIT License');

      const report = await verifierService.verifyWorkspace(mockBounty, tempDir);
      expect(report.passed).toBe(true);
      expect(report.score).toBe(100);
      expect(report.mandatoryFailedCount).toBe(0);
      expect(report.deliverableFingerprint.length).toBe(64);
      expect(report.fileCount).toBe(3);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('calculates partial score when optional requirements are missing', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gibwork-v-partial-'));
    try {
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Project');
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{"strict": true}');
      // Omit LICENSE (20 weight optional)

      const report = await verifierService.verifyWorkspace(mockBounty, tempDir);
      expect(report.passed).toBe(true); // threshold is 75, earned is 80
      expect(report.score).toBe(80);
      expect(report.mandatoryFailedCount).toBe(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
