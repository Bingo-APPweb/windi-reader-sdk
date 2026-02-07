# WINDI Reader SDK

Part of the **WINDI** (Worldwide Infrastructure for Non-repudiable Document Integrity) ecosystem.

This repository provides the **Document Governance Reader** component of the WINDI trust and verification architecture.

## Purpose

This module enables secure, verifiable, and privacy-preserving document integrity workflows for institutional and financial environments.

The Reader SDK allows applications to:
- Parse WINDI-governed documents
- Extract governance metadata and Virtue Receipts
- Verify document integrity without external dependencies
- Display governance status in user interfaces

## Position in the WINDI Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WINDI Ecosystem                       │
├─────────────────────────────────────────────────────────┤
│  windi-reader-sdk ◄── YOU ARE HERE                      │
│  windi-policy-engine                                     │
│  windi-proof-spec                                        │
│  windi-verification-api                                  │
│  windi-forensics-engine                                  │
│  windi-wcaf-toolkit                                      │
│  windi-core-reference                                    │
└─────────────────────────────────────────────────────────┘
```

See: https://github.com/Bingo-APPweb/windi-core-reference

## Security Principles

- No sensitive data processing
- Cryptographic integrity by design
- Deterministic verification
- Auditability and compliance readiness

## Status

Early public technical release — interfaces may evolve.

## License

Apache 2.0 — See [LICENSE](LICENSE)
