import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  listBountiesSchema,
  handleListBounties,
} from './tools/list-bounties.js';
import {
  getBountySchema,
  handleGetBounty,
} from './tools/get-bounty.js';
import {
  verifyDeliverableSchema,
  handleVerifyDeliverable,
} from './tools/verify-deliverable.js';
import {
  submitProofSchema,
  handleSubmitProof,
} from './tools/submit-proof.js';

export function createGibworkMcpServer(): McpServer {
  const server = new McpServer({
    name: 'gibwork-hunter-mcp',
    version: '0.1.0',
  });

  // Tool 1: List Bounties
  server.tool(
    'gibwork_list_bounties',
    'List live and ecosystem Gibwork bounties on Solana with query filters (min_reward, skill, status, keyword, sort_by).',
    listBountiesSchema,
    handleListBounties,
  );

  // Tool 2: Get Bounty Details
  server.tool(
    'gibwork_get_bounty',
    'Fetch full bounty metadata, escrow details, sponsor reputation, deadline, and requirements checklist.',
    getBountySchema,
    handleGetBounty,
  );

  // Tool 3: Verify Deliverable
  server.tool(
    'gibwork_verify_deliverable',
    'Deterministically analyzes a local workspace against a Gibwork bounty requirements checklist, scoring compliance from 0-100% and generating a cryptographic deliverable fingerprint.',
    verifyDeliverableSchema,
    handleVerifyDeliverable,
  );

  // Tool 4: Submit Proof
  server.tool(
    'gibwork_submit_proof',
    'Prepares, cryptographically signs with a Solana Ed25519 keypair, and registers a bounty submission proof packet on Gibwork.',
    submitProofSchema,
    handleSubmitProof,
  );

  return server;
}
