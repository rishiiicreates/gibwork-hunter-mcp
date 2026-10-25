import chalk from 'chalk';
import Table from 'cli-table3';
import {
  Bounty,
  DeliverableVerificationReport,
  SubmissionReceipt,
} from '../types/bounty.js';

export function formatBountiesTable(bounties: Bounty[]): string {
  const table = new Table({
    head: [
      chalk.cyan.bold('ID / Slug'),
      chalk.cyan.bold('Title'),
      chalk.cyan.bold('Reward'),
      chalk.cyan.bold('Primary Skills'),
      chalk.cyan.bold('ROI Score'),
      chalk.cyan.bold('Subs'),
      chalk.cyan.bold('Status'),
    ],
    colWidths: [22, 34, 14, 20, 11, 7, 10],
    wordWrap: true,
  });

  for (const b of bounties) {
    const statusColor =
      b.status === 'OPEN'
        ? chalk.green.bold
        : b.status === 'IN_PROGRESS'
          ? chalk.yellow
          : chalk.gray;

    const roiColor =
      b.roiScore >= 85
        ? chalk.green.bold
        : b.roiScore >= 70
          ? chalk.cyan
          : chalk.yellow;

    const rewardStr = chalk.green.bold(`$${b.reward.amount.toLocaleString()} ${b.reward.symbol}`);
    const skillsStr = chalk.magenta(b.skills.slice(0, 3).join(', '));

    table.push([
      chalk.white.bold(b.slug || b.id),
      b.title,
      rewardStr,
      skillsStr,
      roiColor(`${b.roiScore}/100`),
      chalk.blue(b.submissionsCount.toString()),
      statusColor(b.status),
    ]);
  }

  return table.toString();
}

export function formatBountyCard(b: Bounty): string {
  const lines: string[] = [];
  const divider = chalk.gray('─'.repeat(70));

  lines.push('');
  lines.push(chalk.bold.hex('#9945FF')('══════════════════════════════════════════════════════════════════════'));
  lines.push(chalk.bold.white(`  GIBWORK BOUNTY: `) + chalk.bold.green(`${b.title}`));
  lines.push(chalk.bold.hex('#14F195')('══════════════════════════════════════════════════════════════════════'));
  lines.push('');
  lines.push(`  ${chalk.cyan.bold('ID:')}          ${b.id}`);
  lines.push(`  ${chalk.cyan.bold('Slug:')}        ${b.slug}`);
  lines.push(`  ${chalk.cyan.bold('Status:')}      ${b.status === 'OPEN' ? chalk.green.bold('OPEN (Escrow Locked)') : chalk.yellow(b.status)}`);
  lines.push(`  ${chalk.cyan.bold('Reward:')}      ${chalk.green.bold('$' + b.reward.amount.toLocaleString() + ' ' + b.reward.symbol)} (${chalk.gray('Est. USD: $' + b.reward.usdValue)})`);
  lines.push(`  ${chalk.cyan.bold('Deadline:')}    ${chalk.yellow(b.deadline)}`);
  lines.push(`  ${chalk.cyan.bold('ROI Score:')}   ${chalk.green.bold(b.roiScore + '/100')} ${chalk.gray('(Calculated prize/effort balance)')}`);
  lines.push(`  ${chalk.cyan.bold('Skills:')}      ${b.skills.map((s) => chalk.magenta.bold(s)).join(' • ')}`);
  lines.push(`  ${chalk.cyan.bold('Tags:')}        ${b.tags.map((t) => chalk.blue(`#${t}`)).join(' ')}`);
  lines.push('');
  lines.push(chalk.bold.white('  SOLANA ESCROW DETAILS:'));
  lines.push(`    ${chalk.gray('Escrow Address:')}  ${chalk.yellow(b.escrow.address)}`);
  lines.push(`    ${chalk.gray('Token Mint:')}     ${chalk.yellow(b.escrow.mintAddress)}`);
  lines.push(`    ${chalk.gray('Network:')}        ${chalk.magenta(b.escrow.network)} (Confirmed: ${b.escrow.confirmed ? chalk.green('✓') : chalk.red('✗')})`);
  lines.push('');
  lines.push(chalk.bold.white('  SPONSOR & REPUTATION:'));
  lines.push(`    ${chalk.gray('Name:')}           ${chalk.white(b.sponsor.name)} ${b.sponsor.verified ? chalk.green('✓ Verified Sponsor') : chalk.gray('Unverified')}`);
  lines.push(`    ${chalk.gray('Wallet:')}         ${chalk.yellow(b.sponsor.walletAddress)}`);
  lines.push(`    ${chalk.gray('Trust Rating:')}   ${chalk.yellow('★'.repeat(Math.round(b.sponsor.rating)) + ` (${b.sponsor.rating}/5.0)`)}`);
  lines.push('');
  lines.push(divider);
  lines.push(chalk.bold.white('  SPECIFICATION & DESCRIPTION:'));
  lines.push(
    b.description
      .split('\n')
      .map((l) => `    ${chalk.white(l)}`)
      .join('\n'),
  );
  lines.push('');
  lines.push(divider);
  lines.push(chalk.bold.white('  REQUIREMENTS CHECKLIST (DETERMINISTIC VERIFIER):'));

  for (let i = 0; i < b.requirements.length; i++) {
    const req = b.requirements[i];
    const badge = req.mandatory ? chalk.red.bold('[MANDATORY]') : chalk.gray('[OPTIONAL]');
    lines.push(`    ${chalk.cyan.bold(`${i + 1}.`)} ${chalk.white.bold(req.title)} ${badge} ${chalk.gray(`(Weight: ${req.weight}pts)`)}`);
    lines.push(`       ${chalk.gray(req.description)}`);
    if (req.target) {
      lines.push(`       ${chalk.gray('Target:')} ${chalk.yellow(req.target)}`);
    }
  }

  lines.push('');
  lines.push(divider);
  lines.push(chalk.gray(`  To verify your workspace: `) + chalk.cyan.bold(`gibwork-cli verify ${b.slug} ./path/to/project`));
  lines.push(chalk.gray(`  To submit proof:          `) + chalk.cyan.bold(`gibwork-cli submit ${b.slug} --url <github-pr-or-repo>`));
  lines.push('');

  return lines.join('\n');
}

export function formatVerificationReport(report: DeliverableVerificationReport): string {
  const lines: string[] = [];
  const divider = chalk.gray('─'.repeat(70));

  const scoreColor =
    report.score >= 80 ? chalk.green.bold : report.score >= 60 ? chalk.yellow.bold : chalk.red.bold;

  const statusBadge = report.passed
    ? chalk.bgGreen.black.bold(' ✓ VERIFICATION PASSED ')
    : chalk.bgRed.white.bold(' ✗ VERIFICATION FAILED ');

  lines.push('');
  lines.push(chalk.bold.hex('#9945FF')('══════════════════════════════════════════════════════════════════════'));
  lines.push(chalk.bold.white(`  DELIVERABLE VERIFICATION REPORT `) + statusBadge);
  lines.push(chalk.bold.hex('#14F195')('══════════════════════════════════════════════════════════════════════'));
  lines.push('');
  lines.push(`  ${chalk.cyan.bold('Bounty ID:')}          ${report.bountyId}`);
  lines.push(`  ${chalk.cyan.bold('Bounty Title:')}       ${report.bountyTitle}`);
  lines.push(`  ${chalk.cyan.bold('Workspace Path:')}     ${report.workspacePath}`);
  lines.push(`  ${chalk.cyan.bold('Files Scanned:')}      ${report.fileCount}`);
  lines.push(`  ${chalk.cyan.bold('Fingerprint (SHA256):')} ${chalk.yellow(report.deliverableFingerprint.slice(0, 32))}...`);
  lines.push(`  ${chalk.cyan.bold('Compliance Score:')}   ${scoreColor(`${report.score}/100`)} ${chalk.gray(`(Passing threshold: ${report.passingThreshold}/100)`)}`);
  lines.push(`  ${chalk.cyan.bold('Mandatory Failures:')} ${report.mandatoryFailedCount === 0 ? chalk.green('0') : chalk.red.bold(report.mandatoryFailedCount.toString())}`);
  lines.push('');
  lines.push(divider);
  lines.push(chalk.bold.white('  REQUIREMENTS BREAKDOWN:'));

  for (const check of report.checks) {
    const icon =
      check.status === 'PASSED'
        ? chalk.green.bold('  ✓ [PASS]')
        : check.status === 'WARNING'
          ? chalk.yellow.bold('  ⚠ [WARN]')
          : chalk.red.bold('  ✗ [FAIL]');

    const reqType = check.mandatory ? chalk.red('[MANDATORY]') : chalk.gray('[OPTIONAL]');
    lines.push(`${icon} ${chalk.white.bold(check.title)} ${reqType} ${chalk.gray(`(+${check.scoreEarned}/${check.weight} pts)`)}`);
    lines.push(`      ${chalk.gray(check.details)}`);
  }

  if (report.recommendations.length > 0) {
    lines.push('');
    lines.push(divider);
    lines.push(chalk.bold.yellow('  RECOMMENDATIONS & ACTION ITEMS:'));
    for (const rec of report.recommendations) {
      lines.push(`    ${chalk.yellow('•')} ${rec}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function formatSubmissionReceipt(receipt: SubmissionReceipt): string {
  const lines: string[] = [];
  const divider = chalk.gray('─'.repeat(70));

  lines.push('');
  lines.push(chalk.bold.hex('#14F195')('══════════════════════════════════════════════════════════════════════'));
  lines.push(chalk.bold.white('  GIBWORK BOUNTY SUBMISSION PROOF ') + chalk.bgGreen.black.bold(' ✓ SIGNED '));
  lines.push(chalk.bold.hex('#9945FF')('══════════════════════════════════════════════════════════════════════'));
  lines.push('');
  lines.push(`  ${chalk.cyan.bold('Proof ID:')}          ${receipt.proofId}`);
  lines.push(`  ${chalk.cyan.bold('Bounty ID:')}         ${receipt.bountyId} (${receipt.bountyTitle})`);
  lines.push(`  ${chalk.cyan.bold('Hunter Address:')}    ${chalk.yellow(receipt.hunterAddress)}`);
  lines.push(`  ${chalk.cyan.bold('Submission URL:')}    ${chalk.blue.underline(receipt.submissionUrl)}`);
  lines.push(`  ${chalk.cyan.bold('Fingerprint:')}       ${chalk.yellow(receipt.deliverableFingerprint)}`);
  lines.push(`  ${chalk.cyan.bold('Score Verified:')}    ${chalk.green.bold(receipt.verificationScore + '/100')}`);
  lines.push(`  ${chalk.cyan.bold('Status:')}            ${chalk.green.bold(receipt.status)}`);
  lines.push(`  ${chalk.cyan.bold('Idempotency Key:')}   ${receipt.idempotencyKey}`);
  lines.push(`  ${chalk.cyan.bold('Signed At:')}         ${receipt.signedAt}`);
  lines.push('');
  lines.push(divider);
  lines.push(chalk.bold.white('  CRYPTOGRAPHIC ATTESTATION:'));
  lines.push(`    ${chalk.gray('Payload Digest (SHA256):')} ${receipt.messageDigest}`);
  lines.push(`    ${chalk.gray('Ed25519 Solana Sig:')}     ${chalk.green(receipt.signature)}`);
  lines.push(`    ${chalk.gray('Target Escrow Address:')}  ${chalk.yellow(receipt.escrowAddress)}`);
  if (receipt.gibworkIntentId) {
    lines.push(`    ${chalk.gray('Gibwork Intent ID:')}      ${chalk.cyan(receipt.gibworkIntentId)}`);
  }
  if (receipt.solanaTxHash) {
    lines.push(`    ${chalk.gray('Solana Tx Hash:')}         ${chalk.cyan(receipt.solanaTxHash)}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format markdown for MCP tool responses
 */
export function formatBountiesMarkdown(bounties: Bounty[]): string {
  if (bounties.length === 0) {
    return 'No bounties match your query filters.';
  }

  const lines: string[] = [];
  lines.push(`### 🎯 Gibwork Active Bounties (${bounties.length} found)\n`);
  lines.push('| ID / Slug | Title | Reward | Skills | ROI | Status | Deadline |');
  lines.push('|---|---|---|---|---|---|---|');

  for (const b of bounties) {
    const slug = `\`${b.slug}\``;
    const reward = `**$${b.reward.amount.toLocaleString()} ${b.reward.symbol}**`;
    const skills = b.skills.slice(0, 3).join(', ');
    const roi = `**${b.roiScore}/100**`;
    lines.push(`| ${slug} | ${b.title} | ${reward} | ${skills} | ${roi} | ${b.status} | ${b.deadline} |`);
  }

  lines.push('\n> Use `gibwork_get_bounty` with the bounty slug/id to view complete requirements and escrow verification.');
  return lines.join('\n');
}

export function formatBountyMarkdown(b: Bounty): string {
  const lines: string[] = [];
  lines.push(`# 💰 ${b.title}`);
  lines.push(`**Reward:** $${b.reward.amount.toLocaleString()} ${b.reward.symbol} (Est. USD: $${b.reward.usdValue})`);
  lines.push(`**Status:** ${b.status} | **ROI Score:** ${b.roiScore}/100 | **Deadline:** ${b.deadline}`);
  lines.push(`**Skills:** ${b.skills.join(', ')} | **Tags:** ${b.tags.map((t) => `#${t}`).join(' ')}\n`);

  lines.push(`### 🛡️ Solana Escrow Details`);
  lines.push(`- **Escrow Address:** \`${b.escrow.address}\``);
  lines.push(`- **Token Mint:** \`${b.escrow.mintAddress}\``);
  lines.push(`- **Network:** ${b.escrow.network} (Locked & Confirmed: ${b.escrow.confirmed ? '✅' : '❌'})`);
  lines.push(`- **Sponsor:** ${b.sponsor.name} (${b.sponsor.verified ? 'Verified ✅' : 'Unverified'}) - Rating: ★${b.sponsor.rating}/5.0\n`);

  lines.push(`### 📋 Description & Specification`);
  lines.push(b.description + '\n');

  lines.push(`### 🔍 Requirements Checklist`);
  for (let i = 0; i < b.requirements.length; i++) {
    const req = b.requirements[i];
    const badge = req.mandatory ? '**[MANDATORY]**' : '_[Optional]_';
    lines.push(`${i + 1}. **${req.title}** ${badge} (${req.weight} pts)`);
    lines.push(`   - ${req.description}`);
    if (req.target) {
      lines.push(`   - Target: \`${req.target}\``);
    }
  }

  lines.push(`\n### 🚀 Next Steps`);
  lines.push(`1. Run \`gibwork_verify_deliverable\` to check your local codebase against this checklist.`);
  lines.push(`2. When ready, run \`gibwork_submit_proof\` with your project repository URL.`);

  return lines.join('\n');
}
