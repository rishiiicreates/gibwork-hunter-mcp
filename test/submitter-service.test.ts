import { describe, it, expect } from 'vitest';
import { submitterService } from '../src/services/submitter-service.js';
import { verifySignature } from '../src/utils/solana.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('Bounty Submitter Service', () => {
  it('generates a cryptographically signed proof receipt', async () => {
    const receipt = await submitterService.submit({
      bountyId: 'gibwork-hackathon-2026',
      submissionUrl: 'https://github.com/rishiiicreates/gibwork-hunter-mcp',
      notes: 'Autonomous AI agent bounty hunting toolset',
      dryRun: true,
    });

    expect(receipt.proofId).toMatch(/^proof-/);
    expect(receipt.bountyId).toBe('gibwork-hackathon-2026');
    expect(receipt.signature.length).toBeGreaterThan(40);
    expect(receipt.messageDigest.length).toBe(64);
    expect(receipt.status).toBe('MOCK_CONFIRMED');

    // Verify Ed25519 signature
    const canonicalPayload = JSON.stringify({
      proofId: receipt.proofId,
      bountyId: receipt.bountyId,
      hunterAddress: receipt.hunterAddress,
      submissionUrl: receipt.submissionUrl,
      deliverableFingerprint: receipt.deliverableFingerprint,
      idempotencyKey: receipt.idempotencyKey,
      signedAt: receipt.signedAt,
      escrowAddress: receipt.escrowAddress,
    });

    const isSigValid = verifySignature(
      canonicalPayload,
      receipt.signature,
      receipt.hunterAddress,
    );
    expect(isSigValid).toBe(true);
  });

  it('rejects submission when local workspace fails verification and force is false', async () => {
    const tempEmptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gibwork-sub-fail-'));
    try {
      await expect(
        submitterService.submit({
          bountyId: 'gibwork-hackathon-2026',
          submissionUrl: 'https://github.com/example/repo',
          workspacePath: tempEmptyDir,
        }),
      ).rejects.toThrow(/Deliverable verification failed/);
    } finally {
      fs.rmSync(tempEmptyDir, { recursive: true, force: true });
    }
  });

  it('allows submission when force flag is enabled despite failed local workspace', async () => {
    const tempEmptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gibwork-sub-force-'));
    try {
      const receipt = await submitterService.submit({
        bountyId: 'gibwork-hackathon-2026',
        submissionUrl: 'https://github.com/example/repo',
        workspacePath: tempEmptyDir,
        force: true,
      });
      expect(receipt.proofId).toBeDefined();
    } finally {
      fs.rmSync(tempEmptyDir, { recursive: true, force: true });
    }
  });
});
