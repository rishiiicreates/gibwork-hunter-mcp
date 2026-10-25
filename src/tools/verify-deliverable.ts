import { z } from 'zod';
import { bountyService } from '../services/bounty-service.js';
import { verifierService } from '../services/verifier-service.js';

export const verifyDeliverableSchema = {
  bounty_id: z.string().describe('Target bounty ID or slug to evaluate against'),
  workspace_path: z
    .string()
    .optional()
    .describe('Path to local repository directory (defaults to current directory)'),
  run_tests: z
    .boolean()
    .optional()
    .describe('Whether to execute automated test commands during evaluation (default: false)'),
};

export async function handleVerifyDeliverable(args: {
  bounty_id: string;
  workspace_path?: string;
  run_tests?: boolean;
}) {
  const bounty = await bountyService.getBounty(args.bounty_id);

  if (!bounty) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `⚠️ Bounty "${args.bounty_id}" not found.`,
        },
      ],
      isError: true,
    };
  }

  const workspacePath = args.workspace_path || process.cwd();

  try {
    const report = await verifierService.verifyWorkspace(bounty, workspacePath, {
      runTests: args.run_tests ?? false,
    });

    const lines: string[] = [];
    const icon = report.passed ? '✅' : '❌';
    lines.push(`## ${icon} Deliverable Verification Report`);
    lines.push(`**Bounty:** ${bounty.title} (\`${bounty.id}\`)`);
    lines.push(`**Target Workspace:** \`${report.workspacePath}\``);
    lines.push(`**Files Scanned:** ${report.fileCount} | **Deliverable Fingerprint:** \`${report.deliverableFingerprint.slice(0, 32)}...\``);
    lines.push(`**Compliance Score:** **${report.score}/100** (Threshold: ${report.passingThreshold}/100)`);
    lines.push(`**Result:** ${report.passed ? '**PASSED - READY FOR SUBMISSION**' : '**FAILED - ATTENTION REQUIRED**'}\n`);

    lines.push(`### Requirements Breakdown:`);
    for (const check of report.checks) {
      const checkIcon =
        check.status === 'PASSED' ? '✅ [PASS]' : check.status === 'WARNING' ? '⚠️ [WARN]' : '❌ [FAIL]';
      const mandatoryBadge = check.mandatory ? '**[MANDATORY]**' : '_[Optional]_';
      lines.push(`- ${checkIcon} **${check.title}** ${mandatoryBadge} (+${check.scoreEarned}/${check.weight} pts)`);
      lines.push(`  - Details: ${check.details}`);
    }

    if (report.recommendations.length > 0) {
      lines.push(`\n### Actionable Guidance:`);
      for (const rec of report.recommendations) {
        lines.push(`- ${rec}`);
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: lines.join('\n'),
        },
        {
          type: 'text' as const,
          text: `\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\``,
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `❌ Verification error: ${(err as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}
