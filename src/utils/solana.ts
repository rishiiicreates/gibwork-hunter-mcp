import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import crypto from 'crypto';

export interface HunterKeypair {
  publicKey: string;
  keypair: Keypair;
  isEphemeral: boolean;
}

/**
 * Parses a Solana private key from multiple formats:
 * - Base58 encoded 64-byte secret key or 32-byte seed
 * - JSON array string "[1, 2, 3, ...]"
 * - Raw array of byte numbers
 * Or generates an ephemeral keypair if no key is provided.
 */
export function resolveHunterKeypair(rawKey?: string | null): HunterKeypair {
  if (!rawKey || rawKey.trim() === '') {
    const keypair = Keypair.generate();
    return {
      publicKey: keypair.publicKey.toBase58(),
      keypair,
      isEphemeral: true,
    };
  }

  const trimmed = rawKey.trim();

  // Try JSON array format [12, 34, ...]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && (parsed.length === 64 || parsed.length === 32)) {
        const bytes = Uint8Array.from(parsed);
        const keypair = bytes.length === 64 ? Keypair.fromSecretKey(bytes) : Keypair.fromSeed(bytes);
        return {
          publicKey: keypair.publicKey.toBase58(),
          keypair,
          isEphemeral: false,
        };
      }
    } catch {
      // Fall through to base58 parsing
    }
  }

  // Try Base58 format
  try {
    const decoded = bs58.decode(trimmed);
    if (decoded.length === 64) {
      const keypair = Keypair.fromSecretKey(decoded);
      return {
        publicKey: keypair.publicKey.toBase58(),
        keypair,
        isEphemeral: false,
      };
    } else if (decoded.length === 32) {
      const keypair = Keypair.fromSeed(decoded);
      return {
        publicKey: keypair.publicKey.toBase58(),
        keypair,
        isEphemeral: false,
      };
    }
  } catch {
    // If invalid, throw descriptive error
  }

  throw new Error(
    `Invalid Solana private key provided. Expected 32-byte seed or 64-byte secret key in Base58 or JSON array format.`,
  );
}

/**
 * Validates whether a string is a valid Solana public key address (base58).
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Computes a SHA-256 hash of any string or buffer.
 */
export function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Signs an arbitrary message using the Solana Ed25519 keypair.
 * Returns the Base58-encoded signature.
 */
export function signMessage(message: string | Uint8Array, keypair: Keypair): string {
  const bytes = typeof message === 'string' ? Buffer.from(message, 'utf-8') : message;
  const signature = nacl.sign.detached(bytes, keypair.secretKey);
  return bs58.encode(signature);
}

/**
 * Verifies an Ed25519 signature against a message and public key (base58).
 */
export function verifySignature(
  message: string | Uint8Array,
  signatureBase58: string,
  publicKeyBase58: string,
): boolean {
  try {
    const messageBytes = typeof message === 'string' ? Buffer.from(message, 'utf-8') : message;
    const signatureBytes = bs58.decode(signatureBase58);
    const publicKeyBytes = bs58.decode(publicKeyBase58);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
