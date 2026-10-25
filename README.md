# 🎯 gibwork-hunter-mcp

> **Autonomous AI Agent Bounty Hunting Toolset & Model Context Protocol (MCP) Server for Gibwork on Solana.**

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.7-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Protocol%201.32-purple.svg)](https://modelcontextprotocol.io/)
[![Solana](https://img.shields.io/badge/Solana-Web3.js-14F195.svg)](https://solana.com/)
[![Vitest](https://img.shields.io/badge/Tests-28%20Passed-green.svg)](https://vitest.dev/)

Built for the **Gibwork Developer Hackathon ($1,000 USDC)**, `gibwork-hunter-mcp` is a specialized, production-ready non-web-app developer tool that connects autonomous LLM coding assistants (Claude Desktop, Cursor, Antigravity, Gemini) directly to **Gibwork** on Solana.

---

## ⚡ Overview

Coding AI agents typically operate in isolation from real-world economic incentives. **Gibwork Hunter MCP** bridges this gap:

1. **Discovery**: Agents query active, funded bounties locked in Solana escrows, filtered by ROI, skills, and reward thresholds.
2. **Deterministic Verification**: Before submitting, agents evaluate their local workspace against the bounty's exact requirements checklist (file patterns, strict typechecks, test suite execution, and SHA-256 fingerprinting).
3. **Cryptographic Proof Submission**: Agents prepare, sign (Ed25519), and register verifiable deliverable proofs directly to Gibwork and Solana.

---

## 🏛️ Architecture & Workflow

```
 ┌─────────────────────────────────────────────────────────────┐
 │       LLM Coding Assistants / Autonomous AI Agents          │
 │       (Claude Desktop, Cursor, Antigravity, Gemini)         │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Stdio JSON-RPC (MCP)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                    gibwork-hunter-mcp                       │
 │                                                             │
 │   ┌───────────────────────┐     ┌───────────────────────┐   │
 │   │  Bounty Query Engine  │     │ Deterministic Verifier│   │
 │   │  - ROI Scoring        │     │ - File existence      │   │
 │   │  - Escrow Inspection  │     │ - Pattern matching    │   │
 │   │  - Skill Filtering    │     │ - Test suite runner   │   │
 │   └──────────┬────────────┘     │ - SHA256 Fingerprint  │   │
 │              │                  └───────────┬───────────┘   │
 │              │                              │               │
 │              ▼                              ▼               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │            Ed25519 Cryptographic Signer             │   │
 │   │         - Solana Keypair / TweetNaCl detached       │   │
 │   │         - Verifiable Payload Attestation            │   │
 │   └──────────────────────────┬──────────────────────────┘   │
 └──────────────────────────────┼──────────────────────────────┘
                                │ Live SDK / Staging API
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                     Gibwork on Solana                       │
 │   - Escrow Smart Contract (USDC / SPL)                      │
 │   - Task Registry & Submission Settlement                   │
 └─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ MCP Tools Exposed

When added to your LLM assistant (e.g. Claude Desktop or Cursor), the following 4 tools become available:

| Tool Name | Parameters | Description |
|---|---|---|
| `gibwork_list_bounties` | `min_reward`, `skill`, `status`, `keyword`, `sort_by`, `limit` | Lists open bounties sorted by prize/ROI with summary table |
| `gibwork_get_bounty` | `id` | Fetches full specification, requirements checklist, escrow address, and sponsor reputation |
| `gibwork_verify_deliverable` | `bounty_id`, `workspace_path`, `run_tests` | Deterministically validates local workspace code against requirements checklist |
| `gibwork_submit_proof` | `bounty_id`, `submission_url`, `workspace_path`, `notes`, `dry_run` | Prepares, cryptographically signs with Ed25519 Solana keypair, and submits proof |

---

## 💻 CLI Commands (`gibwork-cli`)

`gibwork-hunter-mcp` doubles as an interactive developer terminal utility:

### 1. Hunt Bounties
```bash
# List top bounties sorted by ROI
npx gibwork-cli hunt

# Filter by reward and skill
npx gibwork-cli hunt --min-reward 500 --skill TypeScript --sort reward
```

### 2. Inspect Bounty Details
```bash
npx gibwork-cli inspect gibwork-hackathon-2026
```

### 3. Verify Local Deliverables
```bash
# Deterministically evaluate current directory against requirements
npx gibwork-cli verify gibwork-hackathon-2026 .

# Run with automated test validation
npx gibwork-cli verify gibwork-hackathon-2026 . --run-tests
```

### 4. Cryptographically Sign & Submit Proof
```bash
# Generate signed proof receipt (simulated / dry-run)
npx gibwork-cli submit gibwork-hackathon-2026 \
  --url https://github.com/rishiiicreates/gibwork-hunter-mcp \
  --dir . \
  --notes "Production-grade TypeScript MCP Server and CLI"
```

---

## ⚙️ Configuration & Installation

### Option A: Use directly via npx
```bash
npx gibwork-hunter-mcp
```

### Option B: Clone & Build Locally
```bash
git clone https://github.com/rishiiicreates/gibwork-hunter-mcp.git
cd gibwork-hunter-mcp
npm install
npm run build
npm test
```

### Setup in Claude Desktop (`claude_desktop_config.json`)

Add this entry to your `claude_desktop_config.json`:

#### macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
#### Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gibwork-hunter": {
      "command": "node",
      "args": [
        "/Users/rishii/gibwork-hunter-mcp/dist/index.js"
      ],
      "env": {
        "SOLANA_PRIVATE_KEY": "",
        "GIBWORK_LIVE": "false"
      }
    }
  }
}
```

> **Note:** If `SOLANA_PRIVATE_KEY` is not provided, the server automatically operates in safe mock/simulation mode with ephemeral session keypairs, allowing instant inspection and verification without touching real mainnet funds.

---

## 🔒 Solana Escrow & Cryptographic Attestation

Each deliverable proof generated by `gibwork-hunter-mcp` contains:
- **Deliverable Fingerprint**: SHA-256 hash of all non-ignored project files (deterministic manifest hash).
- **Idempotency Key**: UUIDv4 ensuring replay protection against network instability.
- **Ed25519 Detached Signature**: Signed by the hunter's Solana keypair over the canonical JSON payload.
- **Escrow Verification**: Validates target smart contract escrow address on Solana mainnet.

```json
{
  "proofId": "proof-a92c817f",
  "bountyId": "gibwork-hackathon-2026",
  "hunterAddress": "7b5vF9...vXqN",
  "submissionUrl": "https://github.com/rishiiicreates/gibwork-hunter-mcp",
  "deliverableFingerprint": "63e0b2c2e13b916094170254765f3743...",
  "verificationScore": 100,
  "status": "MOCK_CONFIRMED",
  "signature": "3K6xU9...ed25519...base58",
  "messageDigest": "8f81ad562a...",
  "signedAt": "2026-10-25T16:50:00.000Z"
}
```

---

## 🧪 Testing

The test suite runs with Vitest in strict mode:

```bash
npm test
```

All 28 tests across 6 test suites verify:
- Solana Ed25519 signature creation & verification
- Deterministic workspace hasher & ignore logic
- Bounty query filtering & dynamic ROI scoring
- Verifier engine requirements evaluation (file existence, regex, exit codes)
- Submitter service & MCP tool endpoints

---

## 📄 License

MIT © [Rishii (Hrishikesh Yadav)](https://github.com/rishiiicreates)
