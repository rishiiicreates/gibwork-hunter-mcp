import { describe, it, expect } from 'vitest';
import { handleListBounties } from '../src/tools/list-bounties.js';
import { handleGetBounty } from '../src/tools/get-bounty.js';
import { handleVerifyDeliverable } from '../src/tools/verify-deliverable.js';
import { handleSubmitProof } from '../src/tools/submit-proof.js';
import { createGibworkMcpServer } from '../src/server.js';
import path from 'path';

describe('Model Context Protocol (MCP) Server & Tools', () => {
  it('creates an McpServer instance with registered tools', () => {
    const server = createGibworkMcpServer();
    expect(server).toBeDefined();
  });

  it('gibwork_list_bounties tool returns markdown formatted list', async () => {
    const res = await handleListBounties({ min_reward: 500 });
    expect(res.content).toBeDefined();
    expect(res.content[0].type).toBe('text');
    expect(res.content[0].text).toContain('Gibwork Active Bounties');
    expect(res.content[0].text).toContain('gibwork-hackathon-2026');
  });

  it('gibwork_get_bounty tool returns detailed bounty card and JSON', async () => {
    const res = await handleGetBounty({ id: 'gibwork-hackathon-2026' });
    expect(res.content).toBeDefined();
    expect(res.content[0].text).toContain('Gibwork Developer Hackathon');
    expect(res.content[0].text).toContain('Solana Escrow Details');
    expect(res.content[1].text).toContain('"id": "gibwork-hackathon-2026"');
  });

  it('gibwork_get_bounty tool returns error for unknown bounty', async () => {
    const res = await handleGetBounty({ id: 'unknown-id-123' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Bounty not found');
  });

  it('gibwork_verify_deliverable tool executes workspace checks', async () => {
    const res = await handleVerifyDeliverable({
      bounty_id: 'gibwork-hackathon-2026',
      workspace_path: path.resolve('.'),
    });
    expect(res.content).toBeDefined();
    expect(res.content[0].text).toContain('Deliverable Verification Report');
  });

  it('gibwork_submit_proof tool generates cryptographic receipt', async () => {
    const res = await handleSubmitProof({
      bounty_id: 'gibwork-hackathon-2026',
      submission_url: 'https://github.com/rishiiicreates/gibwork-hunter-mcp',
      dry_run: true,
    });
    expect(res.content).toBeDefined();
    expect(res.content[0].text).toContain('Gibwork Bounty Submission Proof');
    expect(res.content[0].text).toContain('Ed25519 Signature');
  });
});
