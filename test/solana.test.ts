import { describe, it, expect } from 'vitest';
import {
  resolveHunterKeypair,
  isValidSolanaAddress,
  sha256,
  signMessage,
  verifySignature,
} from '../src/utils/solana.js';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

describe('Solana Cryptography & Key Utilities', () => {
  it('generates an ephemeral keypair when no private key is provided', () => {
    const res = resolveHunterKeypair();
    expect(res.isEphemeral).toBe(true);
    expect(isValidSolanaAddress(res.publicKey)).toBe(true);
    expect(res.keypair).toBeInstanceOf(Keypair);
  });

  it('parses a base58 secret key correctly', () => {
    const original = Keypair.generate();
    const b58 = bs58.encode(original.secretKey);
    const resolved = resolveHunterKeypair(b58);

    expect(resolved.isEphemeral).toBe(false);
    expect(resolved.publicKey).toBe(original.publicKey.toBase58());
  });

  it('parses a JSON byte array string correctly', () => {
    const original = Keypair.generate();
    const jsonStr = JSON.stringify(Array.from(original.secretKey));
    const resolved = resolveHunterKeypair(jsonStr);

    expect(resolved.isEphemeral).toBe(false);
    expect(resolved.publicKey).toBe(original.publicKey.toBase58());
  });

  it('throws an error on invalid key strings', () => {
    expect(() => resolveHunterKeypair('invalid_key_content_12345')).toThrow();
  });

  it('validates legitimate and fraudulent Solana public key addresses', () => {
    const kp = Keypair.generate();
    expect(isValidSolanaAddress(kp.publicKey.toBase58())).toBe(true);
    expect(isValidSolanaAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true);
    expect(isValidSolanaAddress('not-a-solana-address')).toBe(false);
    expect(isValidSolanaAddress('')).toBe(false);
  });

  it('computes consistent SHA-256 digests', () => {
    const digest1 = sha256('hello world');
    const digest2 = sha256('hello world');
    expect(digest1).toBe(digest2);
    expect(digest1).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('signs and verifies messages using Ed25519 detached signatures', () => {
    const kp = Keypair.generate();
    const message = 'bounty-payload-digest-12345';
    const sig = signMessage(message, kp);

    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(40);

    const isValid = verifySignature(message, sig, kp.publicKey.toBase58());
    expect(isValid).toBe(true);

    const isInvalid = verifySignature('tampered-message', sig, kp.publicKey.toBase58());
    expect(isInvalid).toBe(false);
  });
});
