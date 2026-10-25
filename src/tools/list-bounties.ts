import { z } from 'zod';
import { bountyService } from '../services/bounty-service.js';
import { formatBountiesMarkdown } from '../utils/formatter.js';
import { BountyFilterQuery } from '../types/bounty.js';

export const listBountiesSchema = {
  min_reward: z
    .number()
    .optional()
    .describe('Minimum reward in USDC (e.g. 500)'),
  skill: z
    .string()
    .optional()
    .describe('Filter by required skill or tag (e.g. "TypeScript", "MCP", "Solana", "Rust")'),
  status: z
    .string()
    .optional()
    .describe('Bounty status: OPEN, IN_PROGRESS, COMPLETED'),
  keyword: z
    .string()
    .optional()
    .describe('Search keyword in title, description, or tags'),
  sort_by: z
    .enum(['reward', 'roi', 'deadline', 'submissions'])
    .optional()
    .describe('Sort bounties by reward, roi, deadline, or submissions (default: roi)'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of bounties to return (default: 15)'),
};

export async function handleListBounties(args: {
  min_reward?: number;
  skill?: string;
  status?: string;
  keyword?: string;
  sort_by?: 'reward' | 'roi' | 'deadline' | 'submissions';
  limit?: number;
}) {
  const query: BountyFilterQuery = {
    minReward: args.min_reward,
    skill: args.skill,
    status: args.status,
    keyword: args.keyword,
    sortBy: args.sort_by || 'roi',
    limit: args.limit || 15,
  };

  const bounties = await bountyService.listBounties(query);
  const markdown = formatBountiesMarkdown(bounties);

  return {
    content: [
      {
        type: 'text' as const,
        text: markdown,
      },
    ],
  };
}
