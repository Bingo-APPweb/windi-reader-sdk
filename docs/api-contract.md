# WINDI API Contract (Reader SDK → Verification API)

This document defines the API contract between the WINDI Reader SDK and the WINDI Verification API.

## Base URL

```
Production: https://verify.windi.eu/api
Staging:    https://verify-staging.windi.eu/api
```

## Authentication

All requests require the `X-WINDI-API-KEY` header:

```
X-WINDI-API-KEY: your-api-key
```

## Endpoints

### POST /verify

Verify a document by its cryptographic hash.

**Request:**

```json
{
  "document_id": "windi:doc:inv-2026-001",
  "document_hash": "sha256:abc123def456...",
  "issuer_key_id": "windi:key:bank-de",
  "manifest_id": "windi:manifest:v1",
  "proof_level": "L2"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_id` | string | Yes | WINDI document identifier |
| `document_hash` | string | Yes | SHA-256 hash in URN format (`sha256:<hex>`) |
| `issuer_key_id` | string | Yes | Issuer's key identifier |
| `manifest_id` | string | No | Optional manifest reference |
| `proof_level` | string | No | `L1`, `L2`, or `L3` (default: `L2`) |

**Response (200 OK):**

```json
{
  "verdict": "VALID",
  "integrity": "INTACT",
  "trust_level": "L2",
  "issuer_status": "TRUSTED",
  "checks": {
    "hash_match": true,
    "signature_valid": true,
    "chain_verified": true,
    "timestamp_valid": true
  },
  "risk_flags": [],
  "request_id": "req-abc123-def456"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `verdict` | string | `VALID`, `SUSPECT`, or `INVALID` |
| `integrity` | string | `INTACT`, `MODIFIED`, or `UNKNOWN` |
| `trust_level` | string | Achieved trust level (`L1`, `L2`, `L3`) |
| `issuer_status` | string | `TRUSTED`, `UNKNOWN`, or `REVOKED` |
| `checks` | object | Detailed check results |
| `risk_flags` | array | Risk indicators (e.g., `IBAN_MISMATCH`) |
| `request_id` | string | Request tracking identifier |

**Error Response (4xx/5xx):**

```json
{
  "error": "INVALID_HASH_FORMAT",
  "message": "Document hash must be in sha256:<hex> format",
  "request_id": "req-abc123-def456"
}
```

### POST /verify/wvc

Verify using a WINDI Verification Code (compact format).

**Request:**

```json
{
  "wvc": "WVC1-ABC123DEF456...",
  "proof_level": "L2"
}
```

**Response:** Same as `/verify`

### GET /health

Health check endpoint.

**Response (200 OK):**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-02-07T12:00:00Z"
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | Invalid or missing API key |
| `INVALID_HASH_FORMAT` | 400 | Hash not in `sha256:<hex>` format |
| `DOCUMENT_NOT_FOUND` | 404 | Document ID not registered |
| `ISSUER_NOT_FOUND` | 404 | Issuer key not found |
| `ISSUER_REVOKED` | 403 | Issuer key has been revoked |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limits

| Tier | Requests/minute | Requests/day |
|------|-----------------|--------------|
| Standard | 60 | 10,000 |
| Enterprise | 600 | 100,000 |

Rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1707300000
```

## Trust Levels

| Level | Verification Scope | Use Case |
|-------|-------------------|----------|
| `L1` | Hash + cached signature | Offline/low-value |
| `L2` | Hash + live signature + issuer | Standard transactions |
| `L3` | L2 + full chain verification | High-value/regulated |

## Risk Flags

| Flag | Description |
|------|-------------|
| `IBAN_MISMATCH` | IBAN in document differs from registration |
| `AMOUNT_DEVIATION` | Amount significantly differs from expected |
| `TIMESTAMP_DRIFT` | Document timestamp outside expected range |
| `ISSUER_UNKNOWN` | Issuer not in trusted registry |
| `CHAIN_GAP` | Missing links in verification chain |
| `SIGNATURE_WEAK` | Signature algorithm below minimum |

## Versioning

API version is specified in the URL path:

```
/api/v1/verify
/api/v2/verify
```

Current version: `v1` (implicit in `/api/verify`)

## Changelog

### v1.0.0 (2026-02-07)
- Initial API release
- Endpoints: `/verify`, `/verify/wvc`, `/health`
- Trust levels: L1, L2, L3
