import { GibworkAdapter } from '../client/gibwork-adapter.js';
import { BountyService, bountyService } from './bounty-service.js';
import { VerifierService, verifierService } from './verifier-service.js';
import { ProofSubmissionRequest, SubmissionReceipt } from '../types/bounty.js';

export interface SubmitOptions extends ProofSubmissionRequest {
  force?: boolean;
}

export class SubmitterService {
  private adapter: GibworkAdapter;
  private bounties: BountyService;
  private verifier: VerifierService;

  constructor() {
    this.adapter = new GibworkAdapter();
    this.bounties = bountyService;
    this.verifier = verifierService;
  }

  async submit(options: SubmitOptions): Promise<SubmissionReceipt> {
    const bounty = await this.bounties.getBounty(options.bountyId);
    if (!bounty) {
      throw new Error(`Bounty not found: ${options.bountyId}`);
    }

    let verificationScore = 100;

    // If a workspace path is provided, run verification first
    if (options.workspacePath) {
      const report = await this.verifier.verifyWorkspace(bounty, options.workspacePath);
      verificationScore = report.score;

      if (!report.passed && !options.force) {
        throw new Error(
          `Deliverable verification failed with score ${report.score}/100 (${report.mandatoryFailedCount} mandatory failures). Pass --force or fix requirements before submitting.\nFailures:\n` +
            report.recommendations.map((r) => ` - ${r}`).join('\n'),
        );
      }
    }

    const receipt = await this.adapter.submitProof(options);
    receipt.verificationScore = verificationScore;
    return receipt;
  }
}

export const submitterService = new SubmitterService();
