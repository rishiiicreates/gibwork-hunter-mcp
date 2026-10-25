import { GibworkAdapter, GibworkAdapterConfig } from '../client/gibwork-adapter.js';
import { Bounty, BountyFilterQuery } from '../types/bounty.js';

export class BountyService {
  private adapter: GibworkAdapter;

  constructor(config?: GibworkAdapterConfig) {
    this.adapter = new GibworkAdapter(config);
  }

  async listBounties(query: BountyFilterQuery = {}): Promise<Bounty[]> {
    return this.adapter.listBounties(query);
  }

  async getBounty(idOrSlug: string): Promise<Bounty | null> {
    return this.adapter.getBounty(idOrSlug);
  }

  /**
   * Calculates a dynamic ROI score balancing bounty reward, competition,
   * deadline urgency, and requirement complexity.
   */
  calculateRoi(bounty: Bounty): number {
    const rewardWeight = Math.min(50, (bounty.reward.amount / 1000) * 50); // up to 50 pts
    const competitionPenalty = Math.min(25, bounty.submissionsCount * 2.5); // penalize busy bounties
    const complexityPenalty = Math.min(15, bounty.requirements.length * 2); // penalize too many reqs

    const deadlineMs = new Date(bounty.deadline).getTime() - Date.now();
    const daysRemaining = Math.max(0, deadlineMs / (1000 * 60 * 60 * 24));
    const urgencyBonus = daysRemaining > 1 && daysRemaining < 14 ? 10 : 5;

    const baseScore = 40 + rewardWeight - competitionPenalty - complexityPenalty + urgencyBonus;
    return Math.max(10, Math.min(99, Math.round(baseScore)));
  }
}

export const bountyService = new BountyService();
