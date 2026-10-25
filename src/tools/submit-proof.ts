import { z } from 'zod';
import { submitterService } from '../services/submitter-service.js';

export const submitProofSchema = {
  bounty_id: z.string().describe('Target bounty ID or slug'),
  submission_url: z.string().describe('Public repository, pull request, or deliverable URL'),
  workspace_path: z
    .string()
    .optional()
    .describe('Local workspace path for deliverable fingerprinting'),
  notes: z
    .string()
    .optional()
    .describe('Submission remarks or release notes'),
  dry_run: z
    .boolean()
    .optional()
    .describe('Generate cryptographic signature and proof packet without submitting live Solana transaction (default: true)'),
};

export async function handleSubmitProof(args: {
  bounty_id: string;
  submission_url: string;
  workspace_path?: string;
  notes?: string;
  dry_run?: boolean;
}) {
  try {
    const receipt = await submitterService.submit({
      bountyId: args.bounty_id,
      submissionUrl: args.submission_url,
      workspacePath: args.workspace_path,
      notes: args.notes,
      dryRun: args.dry_run ?? true,
    });

    const lines: string[] = [];
    lines.push(`## 🚀 Gibwork Bounty Submission Proof (Signed)`);
    lines.push(`**Status:** ${receipt.status === 'MOCK_CONFIRMED' ? '✅ Cryptographically Signed & Verified (Simulated/Mock Mode)' : '✅ Submitted to Gibwork'}`);
    lines.push(`**Proof ID:** \`${receipt.proofId}\``);
    lines.push(`**Bounty:** ${receipt.bountyTitle} (\`${receipt.bountyId}\`)`);
    lines.push(`**Hunter Address:** \`${receipt.hunterAddress}\``);
    lines.push(`**Submission URL:** [${receipt.submissionUrl}](${receipt.submissionUrl})`);
    lines.push(`**Deliverable Fingerprint:** \`${receipt.deliverableFingerprint}\``);
    lines.push(`**Compliance Score:** ${receipt.verificationScore}/100\n`);

    lines.push(`### Cryptographic Proof`);
    lines.push(`- **Ed25519 Signature:** \`${receipt.signature}\``);
    lines.push(`- **Message Digest (SHA-256):** \`${receipt.messageDigest}\``);
    lines.push(`- **Idempotency Key:** \`${receipt.idempotencyKey}\``);
    lines.push(`- **Target Escrow:** \`${receipt.escrowAddress}\``);
    if (receipt.gibworkIntentId) {
      lines.push(`- **Gibwork Intent ID:** \`${receipt.gibworkIntentId}\``);
    }
    if (receipt.solanaTxHash) {
      lines.push(`- **Solana Tx Hash:** \`${receipt.solanaTxHash}\``);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: lines.join('\n'),
        },
        {
          type: 'text' as const,
          text: `\`\`\`json\n${JSON.stringify(receipt, null, 2)}\n\`\`\``,
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `❌ Submission error: ${(err as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}
