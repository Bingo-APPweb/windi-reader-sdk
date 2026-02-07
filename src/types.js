/**
 * WINDI Reader SDK Type Definitions
 *
 * JSDoc types for IDE support and bank/IT integration.
 */

/**
 * @typedef {"L1"|"L2"|"L3"} TrustLevel
 * L1 = Offline/cached verification
 * L2 = Standard online verification
 * L3 = Enhanced verification with full chain validation
 */

/**
 * @typedef {"VALID"|"SUSPECT"|"INVALID"} VerifyVerdict
 * VALID = Document verified successfully
 * SUSPECT = Document has warnings but may be valid
 * INVALID = Document failed verification
 */

/**
 * @typedef {"INTACT"|"MODIFIED"|"UNKNOWN"} IntegrityStatus
 * INTACT = Document has not been modified
 * MODIFIED = Document has been altered
 * UNKNOWN = Cannot determine integrity status
 */

/**
 * @typedef {"TRUSTED"|"UNKNOWN"|"REVOKED"} IssuerStatus
 * TRUSTED = Issuer key is valid and trusted
 * UNKNOWN = Issuer key not found in registry
 * REVOKED = Issuer key has been revoked
 */

/**
 * @typedef {Object} VerifyRequest
 * @property {string} document_id - WINDI document identifier
 * @property {string} document_hash - "sha256:<hex>" format
 * @property {string} issuer_key_id - WINDI issuer key identifier
 * @property {string} [manifest_id] - Optional manifest reference
 * @property {TrustLevel} [proof_level] - Required proof level (default: L2)
 */

/**
 * @typedef {Object} VerifyResponse
 * @property {VerifyVerdict} verdict - Verification result
 * @property {IntegrityStatus} integrity - Document integrity status
 * @property {TrustLevel} trust_level - Achieved trust level
 * @property {IssuerStatus} [issuer_status] - Issuer key status
 * @property {Object} [checks] - Detailed check results
 * @property {string[]} [risk_flags] - Risk indicators found
 * @property {string} [request_id] - Request tracking ID
 */

/**
 * @typedef {Object} ClientOptions
 * @property {string} baseUrl - WINDI Verification API base URL
 * @property {string} apiKey - API authentication key
 * @property {number} [timeoutMs] - Request timeout in milliseconds (default: 15000)
 */

export {};
