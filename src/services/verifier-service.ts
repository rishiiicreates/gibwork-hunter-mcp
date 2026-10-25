import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  Bounty,
  BountyRequirement,
  DeliverableVerificationReport,
  RequirementCheckResult,
} from '../types/bounty.js';
import { computeWorkspaceFingerprint } from '../utils/hasher.js';
import { logger } from '../utils/logger.js';

export interface VerifyWorkspaceOptions {
  runTests?: boolean;
  passingThreshold?: number;
}

export class VerifierService {
  /**
   * Deterministically verifies a local workspace directory against a bounty's requirements checklist.
   */
  async verifyWorkspace(
    bounty: Bounty,
    workspacePath: string,
    options: VerifyWorkspaceOptions = {},
  ): Promise<DeliverableVerificationReport> {
    const resolvedPath = path.resolve(workspacePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Target workspace directory does not exist: ${resolvedPath}`);
    }

    const passingThreshold = options.passingThreshold ?? 75;
    const checks: RequirementCheckResult[] = [];
    const recommendations: string[] = [];

    let totalWeight = 0;
    let earnedWeight = 0;
    let mandatoryFailedCount = 0;

    for (const req of bounty.requirements) {
      totalWeight += req.weight;
      const result = await this.evaluateRequirement(resolvedPath, req, options);
      checks.push(result);

      if (result.status === 'PASSED') {
        earnedWeight += result.scoreEarned;
      } else if (result.status === 'WARNING') {
        earnedWeight += Math.round(result.scoreEarned * 0.5);
      }

      if (req.mandatory && result.status === 'FAILED') {
        mandatoryFailedCount++;
        recommendations.push(
          `Fix mandatory requirement: "${req.title}". ${result.details}`,
        );
      } else if (result.status !== 'PASSED') {
        recommendations.push(
          `Improve: "${req.title}". ${result.details}`,
        );
      }
    }

    // Calculate normalized score (0-100)
    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    const passed = score >= passingThreshold && mandatoryFailedCount === 0;

    // Calculate deliverable fingerprint
    let fingerprint = '0'.repeat(64);
    let fileCount = 0;
    try {
      const fpResult = computeWorkspaceFingerprint(resolvedPath);
      fingerprint = fpResult.fingerprint;
      fileCount = fpResult.fileCount;
    } catch (err) {
      logger.warn(`Could not compute workspace fingerprint: ${(err as Error).message}`);
    }

    if (passed) {
      recommendations.push('Deliverable is compliant and ready for proof submission!');
    }

    return {
      bountyId: bounty.id,
      bountyTitle: bounty.title,
      workspacePath: resolvedPath,
      score,
      passed,
      passingThreshold,
      mandatoryFailedCount,
      deliverableFingerprint: fingerprint,
      fileCount,
      checks,
      recommendations,
      verifiedAt: new Date().toISOString(),
    };
  }

  private async evaluateRequirement(
    workspacePath: string,
    req: BountyRequirement,
    options: VerifyWorkspaceOptions,
  ): Promise<RequirementCheckResult> {
    switch (req.type) {
      case 'file_exists': {
        const targetPath = req.target ? path.join(workspacePath, req.target) : workspacePath;
        const exists = fs.existsSync(targetPath);
        if (exists) {
          return {
            requirementId: req.id,
            title: req.title,
            description: req.description,
            status: 'PASSED',
            details: `Found required file/directory: "${req.target}"`,
            mandatory: req.mandatory,
            weight: req.weight,
            scoreEarned: req.weight,
          };
        }
        return {
          requirementId: req.id,
          title: req.title,
          description: req.description,
          status: 'FAILED',
          details: `Missing file or directory: "${req.target}" at ${targetPath}`,
          mandatory: req.mandatory,
          weight: req.weight,
          scoreEarned: 0,
        };
      }

      case 'pattern_match': {
        const targetPath = req.target ? path.join(workspacePath, req.target) : workspacePath;
        if (!fs.existsSync(targetPath)) {
          return {
            requirementId: req.id,
            title: req.title,
            description: req.description,
            status: 'FAILED',
            details: `Target file "${req.target}" does not exist.`,
            mandatory: req.mandatory,
            weight: req.weight,
            scoreEarned: 0,
          };
        }

        try {
          const content = fs.readFileSync(targetPath, 'utf-8');
          const pattern = req.pattern || '';
          const matched = content.includes(pattern) || new RegExp(pattern, 'i').test(content);

          if (matched) {
            return {
              requirementId: req.id,
              title: req.title,
              description: req.description,
              status: 'PASSED',
              details: `Pattern "${pattern}" verified in "${req.target}"`,
              mandatory: req.mandatory,
              weight: req.weight,
              scoreEarned: req.weight,
            };
          }

          return {
            requirementId: req.id,
            title: req.title,
            description: req.description,
            status: 'FAILED',
            details: `Pattern "${pattern}" not found in "${req.target}"`,
            mandatory: req.mandatory,
            weight: req.weight,
            scoreEarned: 0,
          };
        } catch (err) {
          return {
            requirementId: req.id,
            title: req.title,
            description: req.description,
            status: 'FAILED',
            details: `Error reading "${req.target}": ${(err as Error).message}`,
            mandatory: req.mandatory,
            weight: req.weight,
            scoreEarned: 0,
          };
        }
      }

      case 'command_exit_zero': {
        if (!options.runTests) {
          return {
            requirementId: req.id,
            title: req.title,
            description: req.description,
            status: 'WARNING',
            details: `Command execution skipped (--no-tests active): "${req.target}"`,
            mandatory: req.mandatory,
            weight: req.weight,
            scoreEarned: Math.round(req.weight * 0.5),
          };
        }

        try {
          execSync(req.target || 'npm test', {
            cwd: workspacePath,
            stdio: 'pipe',
            timeout: 20000,
          });
          return {
            requirementId: req.id,
            title: req.title,
            description: req.description,
            status: 'PASSED',
            details: `Command exited successfully (0): "${req.target}"`,
            mandatory: req.mandatory,
            weight: req.weight,
            scoreEarned: req.weight,
          };
        } catch (err) {
          return {
            requirementId: req.id,
            title: req.title,
            description: req.description,
            status: 'FAILED',
            details: `Command failed or exited with non-zero code: "${req.target}"`,
            mandatory: req.mandatory,
            weight: req.weight,
            scoreEarned: 0,
          };
        }
      }

      case 'custom':
      default: {
        // Heuristic analysis: check common standards
        const titleLower = req.title.toLowerCase();
        if (titleLower.includes('test') || titleLower.includes('spec')) {
          const hasTestDir =
            fs.existsSync(path.join(workspacePath, 'test')) ||
            fs.existsSync(path.join(workspacePath, 'tests')) ||
            fs.existsSync(path.join(workspacePath, '__tests__'));
          if (hasTestDir) {
            return {
              requirementId: req.id,
              title: req.title,
              description: req.description,
              status: 'PASSED',
              details: `Found test suite directory in workspace`,
              mandatory: req.mandatory,
              weight: req.weight,
              scoreEarned: req.weight,
            };
          }
        }

        // Default heuristic passed if target exists or workspace has files
        const targetPath = req.target ? path.join(workspacePath, req.target) : workspacePath;
        if (fs.existsSync(targetPath)) {
          return {
            requirementId: req.id,
            title: req.title,
            description: req.description,
            status: 'PASSED',
            details: `Specification target exists at "${req.target || '.'}"`,
            mandatory: req.mandatory,
            weight: req.weight,
            scoreEarned: req.weight,
          };
        }

        return {
          requirementId: req.id,
          title: req.title,
          description: req.description,
          status: 'WARNING',
          details: `Manual review needed for custom requirement: "${req.description}"`,
          mandatory: req.mandatory,
          weight: req.weight,
          scoreEarned: Math.round(req.weight * 0.5),
        };
      }
    }
  }
}

export const verifierService = new VerifierService();
