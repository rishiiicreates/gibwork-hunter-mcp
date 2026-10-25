import { describe, it, expect } from 'vitest';
import { bountyService } from '../src/services/bounty-service.js';

describe('Bounty Service & Query Engine', () => {
  it('lists default seed bounties', async () => {
    const list = await bountyService.listBounties();
    expect(list.length).toBeGreaterThanOrEqual(5);
  });

  it('filters bounties by minimum reward in USDC', async () => {
    const list = await bountyService.listBounties({ minReward: 700 });
    for (const b of list) {
      expect(b.reward.amount).toBeGreaterThanOrEqual(700);
    }
  });

  it('filters bounties by skill', async () => {
    const list = await bountyService.listBounties({ skill: 'Anchor' });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((b) => b.id === 'anchor-idl-docgen')).toBe(true);
  });

  it('searches bounties by keyword', async () => {
    const list = await bountyService.listBounties({ keyword: 'hackathon' });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].id).toBe('gibwork-hackathon-2026');
  });

  it('fetches a single bounty by id and slug', async () => {
    const byId = await bountyService.getBounty('gibwork-hackathon-2026');
    const bySlug = await bountyService.getBounty('solana-blinks-mcp');

    expect(byId).not.toBeNull();
    expect(byId?.title).toContain('Gibwork Developer Hackathon');
    expect(bySlug).not.toBeNull();
    expect(bySlug?.reward.amount).toBe(800);
  });

  it('returns null for nonexistent bounties', async () => {
    const result = await bountyService.getBounty('nonexistent-bounty-id');
    expect(result).toBeNull();
  });

  it('calculates dynamic ROI score correctly', async () => {
    const bounty = await bountyService.getBounty('gibwork-hackathon-2026');
    expect(bounty).not.toBeNull();
    const roi = bountyService.calculateRoi(bounty!);
    expect(roi).toBeGreaterThan(0);
    expect(roi).toBeLessThanOrEqual(100);
  });
});
