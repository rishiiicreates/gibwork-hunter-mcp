import { z } from 'zod';
import { bountyService } from '../services/bounty-service.js';
import { formatBountyMarkdown } from '../utils/formatter.js';

export const getBountySchema = {
  id: z.string().describe('Bounty ID or slug (e.g. "gibwork-hackathon-2026", "solana-blinks-mcp")'),
};

export async function handleGetBounty(args: { id: string }) {
  const bounty = await bountyService.getBounty(args.id);

  if (!bounty) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `⚠️ Bounty not found for ID or slug: "${args.id}". Use \`gibwork_list_bounties\` to see all active bounties.`,
        },
      ],
      isError: true,
    };
  }

  const markdown = formatBountyMarkdown(bounty);

  return {
    content: [
      {
        type: 'text' as const,
        text: markdown,
      },
      {
        type: 'text' as const,
        text: `\`\`\`json\n${JSON.stringify(bounty, null, 2)}\n\`\`\``,
      },
    ],
  };
}
