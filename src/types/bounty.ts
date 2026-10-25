export type RequirementType =
  | 'file_exists'
  | 'pattern_match'
  | 'command_exit_zero'
  | 'custom';

export interface BountyRequirement {
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  target?: string;
  pattern?: string;
  mandatory: boolean;
  weight: number;
}

export interface BountyEscrow {
  address: string;
  amount: number;
  symbol: string;
  mintAddress: string;
  network: 'mainnet-beta' | 'devnet' | 'mock';
  confirmed: boolean;
}

export interface BountySponsor {
  id: string;
  name: string;
  walletAddress: string;
  verified: boolean;
  rating: number;
  avatarUrl?: string;
}

export interface BountyReward {
  amount: number;
  symbol: string;
  mintAddress: string;
  usdValue: number;
}

export type BountyStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Bounty {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  tags: string[];
  reward: BountyReward;
  status: BountyStatus;
  sponsor: BountySponsor;
  escrow: BountyEscrow;
  requirements: BountyRequirement[];
  minSubmissionAmount: number;
  submissionsCount: number;
  maxSubmissions?: number;
  deadline: string;
  createdAt: string;
  roiScore: number;
  isOpen: boolean;
  allowOnlyVerified: boolean;
}

export type SortByOption = 'reward' | 'roi' | 'deadline' | 'submissions';

export interface BountyFilterQuery {
  minReward?: number;
  skill?: string;
  status?: string;
  keyword?: string;
  sortBy?: SortByOption;
  order?: 'asc' | 'desc';
  limit?: number;
}

export type CheckStatus = 'PASSED' | 'FAILED' | 'WARNING';

export interface RequirementCheckResult {
  requirementId: string;
  title: string;
  description: string;
  status: CheckStatus;
  details: string;
  mandatory: boolean;
  weight: number;
  scoreEarned: number;
}

export interface DeliverableVerificationReport {
  bountyId: string;
  bountyTitle: string;
  workspacePath: string;
  score: number;
  passed: boolean;
  passingThreshold: number;
  mandatoryFailedCount: number;
  deliverableFingerprint: string;
  fileCount: number;
  checks: RequirementCheckResult[];
  recommendations: string[];
  verifiedAt: string;
}

export interface ProofSubmissionRequest {
  bountyId: string;
  submissionUrl: string;
  notes?: string;
  workspacePath?: string;
  hunterPrivateKey?: string;
  dryRun?: boolean;
}

export interface SubmissionFee {
  amount: string;
  symbol: string;
}

export interface SubmissionReceipt {
  proofId: string;
  bountyId: string;
  bountyTitle: string;
  hunterAddress: string;
  submissionUrl: string;
  notes: string;
  deliverableFingerprint: string;
  verificationScore: number;
  idempotencyKey: string;
  messageDigest: string;
  signature: string;
  signedAt: string;
  status: 'PREPARED' | 'SIGNED' | 'SUBMITTED' | 'MOCK_CONFIRMED';
  gibworkIntentId?: string;
  solanaTxHash?: string;
  fee: SubmissionFee;
  escrowAddress: string;
}
