# WINDI Reader SDK — Integration Guide (Bank/IT)

## Overview

The WINDI Reader SDK provides secure document verification for financial institutions. It enables banks and enterprise systems to verify document integrity without processing sensitive content.

## Minimal Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Customer  │────▶│  Bank System │────▶│  WINDI Verify   │
│  (Document) │     │  (SHA-256)   │     │      API        │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │                      │
                           ▼                      ▼
                    ┌──────────────┐     ┌─────────────────┐
                    │ Policy Engine│◀────│ Verify Response │
                    │ (ALLOW/HOLD) │     │ (trust + flags) │
                    └──────────────┘     └─────────────────┘
```

1. Customer submits a document (PDF or file)
2. Bank system computes `sha256` locally using SDK
3. Bank calls WINDI `/verify` with only:
   - `document_id` (WINDI identifier)
   - `document_hash` (sha256)
   - `issuer_key_id`
   - optional `manifest_id`
4. Bank receives `verify_result` (trust_level + checks + risk_flags)
5. Bank applies internal policy (ALLOW/HOLD/BLOCK)

## Privacy Guarantee

The Reader SDK does **not** extract or send invoice text, amounts, or personal data. Only cryptographic hashes and identifiers are transmitted.

## Installation

```bash
npm install @bingo-appweb/windi-reader-sdk
```

## Quick Start

```javascript
import { WindiVerifyClient } from "@bingo-appweb/windi-reader-sdk";

const client = new WindiVerifyClient({
  baseUrl: "https://verify.windi.eu/api",
  apiKey: process.env.WINDI_API_KEY
});

// Verify a local file
const result = await client.verifyFromFile({
  filePath: "./invoice.pdf",
  documentId: "windi:doc:inv-2026-001",
  issuerKeyId: "windi:key:bank-de"
});

if (result.verdict === "VALID") {
  console.log("Document verified at level:", result.trust_level);
}
```

## Verification Methods

### 1. Verify from File (Recommended)

```javascript
const result = await client.verifyFromFile({
  filePath: "./invoice.pdf",
  documentId: "windi:doc:inv-001",
  issuerKeyId: "windi:key:issuer",
  proofLevel: "L2"  // L1, L2, or L3
});
```

### 2. Verify from Bytes (In-memory)

```javascript
const buffer = await fs.readFile("./invoice.pdf");
const result = await client.verifyFromBytes({
  bytes: buffer,
  documentId: "windi:doc:inv-001",
  issuerKeyId: "windi:key:issuer"
});
```

### 3. Verify with Pre-computed Hash

```javascript
const result = await client.verify({
  document_id: "windi:doc:inv-001",
  document_hash: "sha256:abc123...",
  issuer_key_id: "windi:key:issuer",
  proof_level: "L2"
});
```

## Trust Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `L1` | Offline/cached verification | Low-value, internal documents |
| `L2` | Standard online verification | Normal transactions |
| `L3` | Enhanced chain verification | High-value, regulated transactions |

## Response Structure

```typescript
{
  verdict: "VALID" | "SUSPECT" | "INVALID",
  integrity: "INTACT" | "MODIFIED" | "UNKNOWN",
  trust_level: "L1" | "L2" | "L3",
  issuer_status: "TRUSTED" | "UNKNOWN" | "REVOKED",
  checks: { /* detailed check results */ },
  risk_flags: ["IBAN_MISMATCH", "AMOUNT_DEVIATION", ...],
  request_id: "req-abc123"
}
```

## Policy Integration

```javascript
function applyPolicy(paymentAmount, verifyResult) {
  // Block tampered documents
  if (verifyResult.verdict === "INVALID") {
    return { action: "BLOCK", reason: "TAMPERED" };
  }

  // Hold high-value without L3
  if (paymentAmount >= 50000 && verifyResult.trust_level !== "L3") {
    return { action: "HOLD", reason: "HIGH_VALUE_REQUIRES_L3" };
  }

  // Block IBAN mismatches
  if (verifyResult.risk_flags?.includes("IBAN_MISMATCH")) {
    return { action: "BLOCK", reason: "IBAN_MISMATCH" };
  }

  return { action: "ALLOW", reason: "OK" };
}
```

## Hash Utilities

The SDK includes cryptographic utilities:

```javascript
import { Hash } from "@bingo-appweb/windi-reader-sdk";

// Hash a file
const hash = Hash.sha256HexFromFile("./invoice.pdf");
const urn = Hash.sha256UrnFromFile("./invoice.pdf");
// -> "sha256:abc123..."

// Hash a buffer
const bufHash = Hash.sha256HexFromBuffer(buffer);

// Hash text
const textHash = Hash.sha256HexFromUtf8("Hello, World!");
```

## Canonicalization Utilities

For deterministic field comparison:

```javascript
import { Canon } from "@bingo-appweb/windi-reader-sdk";

Canon.canonIBAN("DE89 3704 0044 0532 0130 00");
// -> "DE89370400440532013000"

Canon.canonAmount2("1.234,50");
// -> "1234.50"

Canon.canonCurrency("eur");
// -> "EUR"

Canon.shelfPaytoIban("DE89370400440532013000");
// -> "PAYTO|IBAN|DE89370400440532013000"
```

## Error Handling

```javascript
import { WindiHttpError, WindiConfigError } from "@bingo-appweb/windi-reader-sdk";

try {
  const result = await client.verify(request);
} catch (err) {
  if (err instanceof WindiHttpError) {
    console.error(`HTTP ${err.status}:`, err.data);
    console.error("Request ID:", err.requestId);
  } else if (err instanceof WindiConfigError) {
    console.error("Configuration error:", err.message);
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WINDI_BASE_URL` | API endpoint | `https://verify.windi.eu/api` |
| `WINDI_API_KEY` | Authentication key | Required |

## Security Considerations

1. **No Content Transmission** — Only hashes and IDs are sent
2. **Local Hashing** — Document content never leaves your system
3. **TLS Required** — All API calls use HTTPS
4. **Key Rotation** — API keys should be rotated regularly
5. **Audit Trail** — Log all verification requests/responses

## Support

- Documentation: https://github.com/Bingo-APPweb/windi-core-reference
- Issues: https://github.com/Bingo-APPweb/windi-reader-sdk/issues
- Security: security@windi.systems
