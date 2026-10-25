import dotenv from 'dotenv';
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { bountyService } from './services/bounty-service.js';
import { verifierService } from './services/verifier-service.js';
import { submitterService } from './services/submitter-service.js';
import {
  formatBountiesTable,
  formatBountyCard,
  formatVerificationReport,
  formatSubmissionReceipt,
} from './utils/formatter.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createGibworkMcpServer } from './server.js';
import { logger } from './utils/logger.js';
import { BountyFilterQuery } from './types/bounty.js';

dotenv.config();

const program = new Command();

program
  .name('gibwork-cli')
  .description('Autonomous AI Agent Bounty Hunting CLI and Toolset for Gibwork on Solana')
  .version('0.1.0');

// Banner helper
function printHeader() {
  console.log(
    chalk.bold.hex('#9945FF')('╔══════════════════════════════════════════════════════════════════════╗'),
  );
  console.log(
    chalk.bold.hex('#9945FF')('║ ') +
      chalk.bold.white('GIBWORK HUNTER CLI ') +
      chalk.bold.hex('#14F195')('— Autonomous Bounty Toolset for Solana           ') +
      chalk.bold.hex('#9945FF')('║'),
  );
  console.log(
    chalk.bold.hex('#9945FF')('╚══════════════════════════════════════════════════════════════════════╝'),
  );
}

// Command: hunt
program
  .command('hunt')
  .description('Search and display active Gibwork bounties sorted by prize/ROI')
  .option('-m, --min-reward <number>', 'Filter by minimum USDC reward', (val) => parseFloat(val))
  .option('-s, --skill <skill>', 'Filter by required skill (e.g. TypeScript, MCP, Solana)')
  .option('-k, --keyword <keyword>', 'Keyword search across bounty title & tags')
  .option('--status <status>', 'Filter by status (default: OPEN)')
  .option('--sort <type>', 'Sort by: reward, roi, deadline, submissions', 'roi')
  .option('--limit <number>', 'Limit result count', (val) => parseInt(val, 10), 15)
  .option('--json', 'Output results as raw JSON')
  .action(async (opts) => {
    try {
      const query: BountyFilterQuery = {
        minReward: opts.minReward,
        skill: opts.skill,
        keyword: opts.keyword,
        status: opts.status,
        sortBy: opts.sort,
        limit: opts.limit,
      };

      const bounties = await bountyService.listBounties(query);

      if (opts.json) {
        console.log(JSON.stringify(bounties, null, 2));
        return;
      }

      printHeader();
      console.log(
        chalk.gray(`Found ${chalk.bold.white(bounties.length)} active bounties matching criteria.\n`),
      );
      console.log(formatBountiesTable(bounties));
      console.log('');
      console.log(
        chalk.gray(
          `Run ${chalk.cyan.bold('gibwork-cli inspect <id>')} to view requirements and escrow details.`,
        ),
      );
    } catch (err) {
      console.error(chalk.red.bold('Error hunting bounties:'), (err as Error).message);
      process.exit(1);
    }
  });

// Command: inspect
program
  .command('inspect <id>')
  .description('Show full bounty specification, requirements, and escrow verification')
  .option('--json', 'Output as raw JSON')
  .action(async (id, opts) => {
    try {
      const bounty = await bountyService.getBounty(id);

      if (!bounty) {
        console.error(chalk.red.bold(`Bounty not found for ID or slug: "${id}"`));
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(bounty, null, 2));
        return;
      }

      console.log(formatBountyCard(bounty));
    } catch (err) {
      console.error(chalk.red.bold('Error inspecting bounty:'), (err as Error).message);
      process.exit(1);
    }
  });

// Command: verify
program
  .command('verify <id> [dir]')
  .description('Deterministically evaluate a local workspace against bounty requirements')
  .option('--run-tests', 'Execute test suite commands if defined')
  .option('--threshold <score>', 'Minimum passing score threshold (default: 75)', (v) => parseInt(v, 10), 75)
  .option('--json', 'Output verification report as JSON')
  .action(async (id, dir, opts) => {
    try {
      const bounty = await bountyService.getBounty(id);

      if (!bounty) {
        console.error(chalk.red.bold(`Bounty not found for ID or slug: "${id}"`));
        process.exit(1);
      }

      const workspacePath = path.resolve(dir || process.cwd());
      const report = await verifierService.verifyWorkspace(bounty, workspacePath, {
        runTests: !!opts.runTests,
        passingThreshold: opts.threshold,
      });

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log(formatVerificationReport(report));

      if (!report.passed) {
        process.exit(1);
      }
    } catch (err) {
      console.error(chalk.red.bold('Verification failed:'), (err as Error).message);
      process.exit(1);
    }
  });

// Command: submit
program
  .command('submit <id>')
  .description('Prepare and sign cryptographic submission proof with Solana Ed25519 signature')
  .requiredOption('-u, --url <url>', 'Public repository, PR, or deliverable URL')
  .option('-d, --dir <dir>', 'Local workspace path to verify and fingerprint', process.cwd())
  .option('-n, --notes <notes>', 'Submission notes or remarks')
  .option('-k, --key <solana-key>', 'Solana private key (overrides SOLANA_PRIVATE_KEY env)')
  .option('--force', 'Bypass verification failures and submit anyway')
  .option('--dry-run', 'Generate signature and proof without live Solana transaction fee', true)
  .option('--live', 'Submit to live Gibwork network using Solana wallet', false)
  .option('--json', 'Output submission receipt as JSON')
  .action(async (id, opts) => {
    try {
      const workspacePath = path.resolve(opts.dir);
      const isDryRun = opts.live ? false : opts.dryRun;

      const receipt = await submitterService.submit({
        bountyId: id,
        submissionUrl: opts.url,
        workspacePath,
        notes: opts.notes,
        hunterPrivateKey: opts.key,
        dryRun: isDryRun,
        force: !!opts.force,
      });

      if (opts.json) {
        console.log(JSON.stringify(receipt, null, 2));
        return;
      }

      console.log(formatSubmissionReceipt(receipt));
      console.log(
        chalk.green.bold('✓ Submission proof prepared and cryptographically signed successfully!'),
      );
    } catch (err) {
      console.error(chalk.red.bold('Submission error:'), (err as Error).message);
      process.exit(1);
    }
  });

// Command: serve
program
  .command('serve')
  .description('Start Model Context Protocol (MCP) server on stdio')
  .action(async () => {
    logger.setMcpMode(true);
    const server = createGibworkMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  });

program.parse(process.argv);
