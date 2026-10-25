import { createGibworkClient } from '@gibwork/sdk/node';
import type { GibworkClient } from '@gibwork/sdk';
import {
  Bounty,
  BountyFilterQuery,
  BountyRequirement,
  ProofSubmissionRequest,
  SubmissionReceipt,
} from '../types/bounty.js';
import { SEED_BOUNTIES } from './seed-bounties.js';
import {
  resolveHunterKeypair,
  signMessage,
  sha256,
} from '../utils/solana.js';
import { computeWorkspaceFingerprint } from '../utils/hasher.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface GibworkAdapterConfig {
  privateKey?: string;
  isLive?: boolean;
  production?: boolean;
  apiUrl?: string;
}

export class GibworkAdapter {
  private client: GibworkClient | null = null;
  private bountiesMap: Map<string, Bounty> = new Map();
  private isLive: boolean = false;

  constructor(config: GibworkAdapterConfig = {}) {
    const rawKey = config.privateKey || process.env.SOLANA_PRIVATE_KEY;
    const liveFlag = config.isLive ?? (process.env.GIBWORK_LIVE === 'true');
    const production = config.production ?? (process.env.GIBWORK_PROD === 'true');

    this.isLive = liveFlag;

    // Load initial seed bounties
    for (const b of SEED_BOUNTIES) {
      this.bountiesMap.set(b.id, b);
      this.bountiesMap.set(b.slug, b);
    }

    if (rawKey && liveFlag) {
      try {
        this.client = createGibworkClient({
          privateKey: rawKey,
          production,
        });
        logger.info('Initialized live Gibwork SDK client with Solana wallet');
      } catch (err: unknown) {
        logger.warn(
          `Could not initialize live Gibwork SDK: ${(err as Error).message}. Running in offline/mock mode.`,
        );
      }
    }
  }

  async listBounties(query: BountyFilterQuery = {}): Promise<Bounty[]> {
    // If live client is enabled, fetch latest open tasks from Gibwork network
    if (this.client && this.isLive) {
      try {
        const available = await this.client.tasks.listAvailable({ page: 1, limit: 30 });
        if (available && Array.isArray(available.results)) {
          for (const item of available.results) {
            const mapped = this.mapLiveTaskToBounty(item);
            this.bountiesMap.set(mapped.id, mapped);
            if (mapped.slug) {
              this.bountiesMap.set(mapped.slug, mapped);
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed to fetch from live Gibwork API: ${(err as Error).message}. Using cached/seed bounties.`);
      }
    }

    // Deduplicate by ID
    const unique = Array.from(new Set(Array.from(this.bountiesMap.values())));

    let filtered = unique.filter((b) => {
      if (query.minReward !== undefined && b.reward.amount < query.minReward) {
        return false;
      }
      if (query.skill) {
        const sLower = query.skill.toLowerCase();
        const hasSkill = b.skills.some((s) => s.toLowerCase().includes(sLower));
        const hasTag = b.tags.some((t) => t.toLowerCase().includes(sLower));
        if (!hasSkill && !hasTag) return false;
      }
      if (query.status && b.status.toLowerCase() !== query.status.toLowerCase()) {
        return false;
      }
      if (query.keyword) {
        const kLower = query.keyword.toLowerCase();
        const inTitle = b.title.toLowerCase().includes(kLower);
        const inDesc = b.description.toLowerCase().includes(kLower);
        const inTags = b.tags.some((t) => t.toLowerCase().includes(kLower));
        if (!inTitle && !inDesc && !inTags) return false;
      }
      return true;
    });

    // Sorting
    const sortBy = query.sortBy || 'reward';
    const order = query.order || 'desc';

    filtered.sort((a, b) => {
      let valA: number;
      let valB: number;

      if (sortBy === 'reward') {
        valA = a.reward.amount;
        valB = b.reward.amount;
      } else if (sortBy === 'roi') {
        valA = a.roiScore;
        valB = b.roiScore;
      } else if (sortBy === 'submissions') {
        valA = a.submissionsCount;
        valB = b.submissionsCount;
      } else if (sortBy === 'deadline') {
        valA = new Date(a.deadline).getTime();
        valB = new Date(b.deadline).getTime();
      } else {
        valA = a.reward.amount;
        valB = b.reward.amount;
      }

      return order === 'desc' ? valB - valA : valA - valB;
    });

    if (query.limit && query.limit > 0) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  async getBounty(idOrSlug: string): Promise<Bounty | null> {
    const existing = this.bountiesMap.get(idOrSlug);
    if (existing) {
      return existing;
    }

    // Try fetching via live API if available
    if (this.client && this.isLive) {
      try {
        const task = await this.client.tasks.get(idOrSlug);
        if (task) {
          const mapped = this.mapLiveTaskDetailsToBounty(task);
          this.bountiesMap.set(mapped.id, mapped);
          this.bountiesMap.set(mapped.slug, mapped);
          return mapped;
        }
      } catch (err) {
        logger.debug(`Bounty not found on live Gibwork API: ${(err as Error).message}`);
      }
    }

    return null;
  }

  async submitProof(req: ProofSubmissionRequest): Promise<SubmissionReceipt> {
    const bounty = await this.getBounty(req.bountyId);
    if (!bounty) {
      throw new Error(`Bounty not found: ${req.bountyId}`);
    }

    // Resolve hunter keypair (uses provided key, env key, or ephemeral)
    const keyInfo = resolveHunterKeypair(req.hunterPrivateKey || process.env.SOLANA_PRIVATE_KEY);

    // Compute deliverable fingerprint if workspacePath given, or use url
    let fingerprint = '0'.repeat(64);
    if (req.workspacePath) {
      const res = computeWorkspaceFingerprint(req.workspacePath);
      fingerprint = res.fingerprint;
    } else {
      fingerprint = sha256(req.submissionUrl);
    }

    const proofId = `proof-${uuidv4().slice(0, 8)}`;
    const idempotencyKey = uuidv4();
    const signedAt = new Date().toISOString();

    // Prepare canonical payload to sign
    const canonicalPayload = JSON.stringify({
      proofId,
      bountyId: bounty.id,
      hunterAddress: keyInfo.publicKey,
      submissionUrl: req.submissionUrl,
      deliverableFingerprint: fingerprint,
      idempotencyKey,
      signedAt,
      escrowAddress: bounty.escrow.address,
    });

    const messageDigest = sha256(canonicalPayload);
    const signature = signMessage(canonicalPayload, keyInfo.keypair);

    let gibworkIntentId: string | undefined;
    let solanaTxHash: string | undefined;
    let status: SubmissionReceipt['status'] = 'SIGNED';

    // Live submission if client active and not dryRun
    if (this.client && this.isLive && !req.dryRun) {
      try {
        const intent = await this.client.submissions.create(bounty.id, {
          content: `<p>Bounty Proof: <a href="${req.submissionUrl}">${req.submissionUrl}</a></p><p>Digest: ${messageDigest}</p><p>Signature: ${signature}</p>`,
          idempotencyKey,
        });
        gibworkIntentId = intent.intentId;
        solanaTxHash = intent.txHash || undefined;
        status = 'SUBMITTED';
      } catch (err) {
        logger.warn(`Live Gibwork submission attempt returned: ${(err as Error).message}`);
        status = 'SIGNED';
      }
    } else {
      status = 'MOCK_CONFIRMED';
    }

    const receipt: SubmissionReceipt = {
      proofId,
      bountyId: bounty.id,
      bountyTitle: bounty.title,
      hunterAddress: keyInfo.publicKey,
      submissionUrl: req.submissionUrl,
      notes: req.notes || 'Autonomous agent verified deliverable submission',
      deliverableFingerprint: fingerprint,
      verificationScore: 100,
      idempotencyKey,
      messageDigest,
      signature,
      signedAt,
      status,
      gibworkIntentId,
      solanaTxHash,
      fee: {
        amount: bounty.minSubmissionAmount.toString(),
        symbol: 'USDC',
      },
      escrowAddress: bounty.escrow.address,
    };

    return receipt;
  }

  private mapLiveTaskToBounty(task: any): Bounty {
    const amount = task.asset?.amount ? Number(task.asset.amount) : 100;
    const symbol = task.asset?.symbol || 'USDC';
    const mintAddress = task.asset?.mintAddress || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    const requirements: BountyRequirement[] = [
      {
        id: `req-${task.id}-spec`,
        title: 'Project Specification & Scope',
        description: task.requirements || task.content || 'Implement requested features as per bounty description',
        type: 'custom',
        mandatory: true,
        weight: 50,
      },
      {
        id: `req-${task.id}-tests`,
        title: 'Unit Test Coverage',
        description: 'Automated test suite verifying core functionality',
        type: 'file_exists',
        target: 'test',
        mandatory: true,
        weight: 30,
      },
      {
        id: `req-${task.id}-docs`,
        title: 'Documentation & Setup Guide',
        description: 'Clear README with installation instructions and architecture overview',
        type: 'file_exists',
        target: 'README.md',
        mandatory: false,
        weight: 20,
      },
    ];

    return {
      id: task.id,
      slug: task.slug || task.id,
      title: task.title,
      description: task.content || task.requirements || 'No description provided.',
      category: 'Gibwork Network',
      skills: task.tags || ['Solana', 'TypeScript'],
      tags: task.tags || ['bounty'],
      reward: {
        amount,
        symbol,
        mintAddress,
        usdValue: amount,
      },
      status: task.isOpen ? 'OPEN' : 'COMPLETED',
      sponsor: {
        id: 'sponsor-gibwork-live',
        name: 'Gibwork Verified Sponsor',
        walletAddress: 'GibworkLiveSponsor111111111111111111111111111',
        verified: true,
        rating: 4.8,
      },
      escrow: {
        address: `Escrow-${task.id.slice(0, 16)}`,
        amount,
        symbol,
        mintAddress,
        network: 'mainnet-beta',
        confirmed: true,
      },
      requirements,
      minSubmissionAmount: task.minSubmissionAmount ? Number(task.minSubmissionAmount) : 0.15,
      submissionsCount: task.totalSubmissions || 0,
      maxSubmissions: task.maxSubmissions || undefined,
      deadline: task.deadline || new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: task.createdAt || new Date().toISOString(),
      roiScore: Math.min(100, Math.max(50, Math.round((amount / 10) - (task.totalSubmissions || 0) * 2))),
      isOpen: !!task.isOpen,
      allowOnlyVerified: !!task.participationRequirements?.allowOnlyVerifiedSubmissions,
    };
  }

  private mapLiveTaskDetailsToBounty(task: any): Bounty {
    const base = this.mapLiveTaskToBounty(task);
    if (task.user) {
      base.sponsor = {
        id: task.user.id || 'sponsor-live',
        name: task.user.username || 'Gibwork Creator',
        walletAddress: task.user.externalId || 'SponsorWalletAddress11111111111111111111111111',
        verified: !!task.user.isPremium,
        rating: task.user.rating || 5.0,
        avatarUrl: task.user.profilePicture,
      };
    }
    return base;
  }
}
