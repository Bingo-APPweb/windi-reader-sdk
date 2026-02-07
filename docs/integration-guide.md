# WINDI Reader SDK — Integration Guide

This guide explains how to integrate the WINDI Reader SDK into your application to verify WINDI-governed documents.

## Overview

The WINDI Reader SDK provides:

- **Document Verification** — Verify document integrity and governance status
- **Virtue Receipt Parsing** — Extract and validate governance proofs
- **Chain Integrity Checks** — Verify Merkle chain links
- **Offline Mode** — Verify documents without network access

## Installation

```bash
npm install @windi/reader-sdk
```

Or include directly:

```javascript
const { WindiVerifyClient } = require('./sdk/windi-verify-client');
```

## Quick Start

```javascript
const { WindiVerifyClient } = require('@windi/reader-sdk');

// Create client
const client = new WindiVerifyClient();

// Verify a document
const result = await client.verifyDocument('document.pdf');

if (result.verified) {
  console.log('✓ Document is WINDI verified');
  console.log('Governance Level:', result.governanceLevel);
  console.log('ISP Profile:', result.ispProfile);
} else {
  console.log('✗ Verification failed:', result.errors);
}
```

## API Reference

### WindiVerifyClient

The main client for document verification.

#### Constructor Options

```javascript
const client = new WindiVerifyClient({
  apiEndpoint: null,        // WINDI API endpoint (optional)
  offlineMode: true,        // Enable offline verification
  strictMode: false         // Require all checks to pass
});
```

#### Methods

##### `verifyDocument(filePath)`

Verify a document from file path.

```javascript
const result = await client.verifyDocument('./governed-doc.pdf');
```

**Returns:** `VerificationResult`

##### `verifyBuffer(buffer, virtueReceipt)`

Verify a document from buffer with known Virtue Receipt.

```javascript
const buffer = fs.readFileSync('./document.pdf');
const receipt = { /* Virtue Receipt */ };
const result = client.verifyBuffer(buffer, receipt);
```

##### `verifyReceipt(virtueReceipt)`

Validate a Virtue Receipt structure and chain integrity.

```javascript
const validation = client.verifyReceipt(virtueReceipt);
console.log(validation.valid);
console.log(validation.chainIntact);
```

##### `computeHash(filePath)`

Compute SHA-256 hash of a document.

```javascript
const hash = await client.computeHash('./document.pdf');
console.log('Document hash:', hash);
```

### VerificationResult

Result object returned by verification methods.

```typescript
{
  verified: boolean;          // True if document is verified
  status: VerificationStatus; // Status code
  documentHash: string;       // Computed document hash
  virtueReceipt: VirtueReceipt | null;
  governanceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  ispProfile: string | null;  // Institutional Style Profile ID
  chainIntact: boolean;       // True if chain verified
  errors: string[];           // Verification errors
  warnings: string[];         // Verification warnings
  verifiedAt: number;         // Timestamp (ms)
}
```

### VerificationStatus

```javascript
const { VerificationStatus } = require('@windi/reader-sdk');

VerificationStatus.VERIFIED      // Document verified successfully
VerificationStatus.INVALID       // Verification failed
VerificationStatus.PENDING       // Verification in progress
VerificationStatus.ERROR         // System error occurred
VerificationStatus.NO_GOVERNANCE // No WINDI metadata found
```

### GovernanceLevel

```javascript
const { GovernanceLevel } = require('@windi/reader-sdk');

GovernanceLevel.HIGH    // High-risk governance (banking, legal)
GovernanceLevel.MEDIUM  // Medium-risk governance (corporate)
GovernanceLevel.LOW     // Low-risk governance (general)
```

## Hash Utilities

The SDK includes hash utility functions:

```javascript
const {
  sha256,
  sha256File,
  hashJSON,
  canonicalizeJSON,
  verifyChainLink,
  GENESIS_HASH
} = require('@windi/reader-sdk');

// Hash a string or buffer
const hash = sha256('Hello, World!');

// Hash a file
const fileHash = await sha256File('./document.pdf');

// Hash JSON deterministically
const jsonHash = hashJSON({ foo: 'bar', baz: 123 });

// Verify a chain link
const valid = verifyChainLink(prevHash, payload, expectedHash);
```

## Virtue Receipt Format

A Virtue Receipt contains:

```json
{
  "document_id": "DOC-2026-001",
  "hash": "a1b2c3d4...",
  "prev_hash": "0000000...",
  "chain_hash": "e5f6g7h8...",
  "timestamp": "2026-02-07T12:00:00Z",
  "governance_level": "HIGH",
  "isp_profile": "deutsche-bank",
  "sge_scores": {
    "R0": 0.1,
    "R1": 0.2,
    "R2": 0.3,
    "R3": 0.4,
    "R4": 0.5,
    "R5": 0.6
  },
  "actor": "user@example.com"
}
```

## Integration Examples

### Bank Document Verification

```javascript
const { WindiVerifyClient, GovernanceLevel } = require('@windi/reader-sdk');

async function verifyBankDocument(filePath) {
  const client = new WindiVerifyClient({ strictMode: true });
  const result = await client.verifyDocument(filePath);

  if (!result.verified) {
    throw new Error('Document verification failed');
  }

  // Enforce HIGH governance for banking
  if (result.governanceLevel !== GovernanceLevel.HIGH) {
    throw new Error('Document requires HIGH governance level');
  }

  return {
    verified: true,
    hash: result.documentHash,
    governanceLevel: result.governanceLevel,
    timestamp: result.virtueReceipt.timestamp
  };
}
```

### Audit Trail Integration

```javascript
const { WindiVerifyClient } = require('@windi/reader-sdk');

async function auditDocument(filePath, auditLog) {
  const client = new WindiVerifyClient();
  const result = await client.verifyDocument(filePath);

  // Log to audit trail
  auditLog.append({
    action: 'DOCUMENT_VERIFICATION',
    documentHash: result.documentHash,
    verified: result.verified,
    governanceLevel: result.governanceLevel,
    chainIntact: result.chainIntact,
    timestamp: new Date().toISOString()
  });

  return result;
}
```

### React Integration

```jsx
import { useState } from 'react';
import { WindiVerifyClient } from '@windi/reader-sdk';

function DocumentVerifier() {
  const [result, setResult] = useState(null);

  const handleVerify = async (file) => {
    const client = new WindiVerifyClient();
    const buffer = await file.arrayBuffer();
    const result = client.verifyBuffer(Buffer.from(buffer), virtueReceipt);
    setResult(result);
  };

  return (
    <div>
      <input type="file" onChange={e => handleVerify(e.target.files[0])} />
      {result?.verified && <span>✓ WINDI Verified</span>}
    </div>
  );
}
```

## Security Considerations

1. **Hash Verification** — Always verify document hash matches Virtue Receipt
2. **Chain Integrity** — Verify chain links for tamper detection
3. **Governance Level** — Enforce appropriate level for use case
4. **Offline Mode** — SDK works without network for privacy
5. **No Sensitive Data** — SDK never processes document content

## Troubleshooting

### "No WINDI governance metadata found"

The document does not contain WINDI governance data. Ensure the document was processed through a WINDI-enabled editor.

### "Document hash does not match Virtue Receipt"

The document content has been modified after governance was applied. The document should be considered invalid.

### "Chain integrity verification failed"

The Merkle chain link verification failed. This may indicate tampering or an incomplete Virtue Receipt.

## Support

- Documentation: https://github.com/Bingo-APPweb/windi-core-reference
- Issues: https://github.com/Bingo-APPweb/windi-reader-sdk/issues
- Security: security@windi.systems

## License

Apache 2.0 — See [LICENSE](../LICENSE)
