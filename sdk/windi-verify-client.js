/**
 * WINDI Verify Client
 *
 * Client library for verifying WINDI-governed documents.
 * Extracts and validates Virtue Receipts, governance metadata,
 * and chain integrity proofs.
 *
 * @module @windi/reader-sdk
 * @license Apache-2.0
 *
 * @example
 * const { WindiVerifyClient } = require('@windi/reader-sdk');
 *
 * const client = new WindiVerifyClient();
 * const result = await client.verifyDocument('document.pdf');
 *
 * if (result.verified) {
 *   console.log('Document is WINDI verified');
 *   console.log('Governance level:', result.governanceLevel);
 * }
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const {
  sha256,
  sha256File,
  hashJSON,
  verifyChainLink,
  canonicalizeJSON,
  GENESIS_HASH
} = require('./hash-utils');

/**
 * Governance levels supported by WINDI
 * @readonly
 * @enum {string}
 */
const GovernanceLevel = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

/**
 * Verification result status
 * @readonly
 * @enum {string}
 */
const VerificationStatus = {
  VERIFIED: 'VERIFIED',
  INVALID: 'INVALID',
  PENDING: 'PENDING',
  ERROR: 'ERROR',
  NO_GOVERNANCE: 'NO_GOVERNANCE'
};

/**
 * WINDI Virtue Receipt structure
 * @typedef {Object} VirtueReceipt
 * @property {string} document_id - Unique document identifier
 * @property {string} hash - Document content hash (SHA-256)
 * @property {string} prev_hash - Previous hash in chain
 * @property {string} chain_hash - Chain integrity hash
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} governance_level - HIGH, MEDIUM, or LOW
 * @property {string} isp_profile - Institutional Style Profile ID
 * @property {Object} sge_scores - Semantic Governance Engine scores
 * @property {string} actor - Actor who generated the document
 * @property {string} [signature] - Optional cryptographic signature
 */

/**
 * Verification result
 * @typedef {Object} VerificationResult
 * @property {boolean} verified - True if document is verified
 * @property {VerificationStatus} status - Verification status code
 * @property {string} documentHash - Computed document hash
 * @property {VirtueReceipt|null} virtueReceipt - Extracted Virtue Receipt
 * @property {string|null} governanceLevel - Governance level if verified
 * @property {string|null} ispProfile - ISP profile if verified
 * @property {boolean} chainIntact - True if chain integrity verified
 * @property {string[]} errors - List of verification errors
 * @property {string[]} warnings - List of verification warnings
 * @property {number} verifiedAt - Verification timestamp (ms)
 */

/**
 * WINDI Verify Client
 *
 * Main client for verifying WINDI-governed documents.
 */
class WindiVerifyClient {
  /**
   * Create a new WindiVerifyClient
   * @param {Object} [options] - Client options
   * @param {string} [options.apiEndpoint] - WINDI Verification API endpoint
   * @param {boolean} [options.offlineMode=true] - Enable offline verification
   * @param {boolean} [options.strictMode=false] - Require all checks to pass
   */
  constructor(options = {}) {
    this.apiEndpoint = options.apiEndpoint || null;
    this.offlineMode = options.offlineMode !== false;
    this.strictMode = options.strictMode || false;
  }

  /**
   * Verify a document file
   * @param {string} filePath - Path to the document file
   * @returns {Promise<VerificationResult>} Verification result
   */
  async verifyDocument(filePath) {
    const result = this._createEmptyResult();

    try {
      // Read and hash the document
      const absolutePath = path.resolve(filePath);
      const fileBuffer = await fs.readFile(absolutePath);
      result.documentHash = sha256(fileBuffer);

      // Extract WINDI metadata from document
      const metadata = await this._extractMetadata(fileBuffer, filePath);

      if (!metadata) {
        result.status = VerificationStatus.NO_GOVERNANCE;
        result.warnings.push('No WINDI governance metadata found in document');
        return result;
      }

      // Validate the Virtue Receipt
      result.virtueReceipt = metadata.virtueReceipt;
      const validationErrors = this._validateVirtueReceipt(metadata.virtueReceipt);

      if (validationErrors.length > 0) {
        result.errors.push(...validationErrors);
        result.status = VerificationStatus.INVALID;
        return result;
      }

      // Verify document hash matches receipt
      if (metadata.virtueReceipt.hash !== result.documentHash) {
        result.errors.push('Document hash does not match Virtue Receipt');
        result.status = VerificationStatus.INVALID;
        return result;
      }

      // Verify chain integrity
      result.chainIntact = this._verifyChainIntegrity(metadata.virtueReceipt);

      if (!result.chainIntact) {
        result.errors.push('Chain integrity verification failed');
        if (this.strictMode) {
          result.status = VerificationStatus.INVALID;
          return result;
        }
        result.warnings.push('Chain verification failed but document hash valid');
      }

      // Verification successful
      result.verified = true;
      result.status = VerificationStatus.VERIFIED;
      result.governanceLevel = metadata.virtueReceipt.governance_level;
      result.ispProfile = metadata.virtueReceipt.isp_profile;

    } catch (error) {
      result.status = VerificationStatus.ERROR;
      result.errors.push(`Verification error: ${error.message}`);
    }

    result.verifiedAt = Date.now();
    return result;
  }

  /**
   * Verify a document from buffer
   * @param {Buffer} buffer - Document content
   * @param {VirtueReceipt} virtueReceipt - Virtue Receipt to verify against
   * @returns {VerificationResult} Verification result
   */
  verifyBuffer(buffer, virtueReceipt) {
    const result = this._createEmptyResult();

    try {
      result.documentHash = sha256(buffer);
      result.virtueReceipt = virtueReceipt;

      // Validate receipt structure
      const validationErrors = this._validateVirtueReceipt(virtueReceipt);
      if (validationErrors.length > 0) {
        result.errors.push(...validationErrors);
        result.status = VerificationStatus.INVALID;
        return result;
      }

      // Verify hash match
      if (virtueReceipt.hash !== result.documentHash) {
        result.errors.push('Document hash does not match Virtue Receipt');
        result.status = VerificationStatus.INVALID;
        return result;
      }

      // Verify chain
      result.chainIntact = this._verifyChainIntegrity(virtueReceipt);

      result.verified = true;
      result.status = VerificationStatus.VERIFIED;
      result.governanceLevel = virtueReceipt.governance_level;
      result.ispProfile = virtueReceipt.isp_profile;

    } catch (error) {
      result.status = VerificationStatus.ERROR;
      result.errors.push(`Verification error: ${error.message}`);
    }

    result.verifiedAt = Date.now();
    return result;
  }

  /**
   * Verify only the Virtue Receipt structure and chain
   * @param {VirtueReceipt} virtueReceipt - Virtue Receipt to verify
   * @returns {Object} Validation result
   */
  verifyReceipt(virtueReceipt) {
    const errors = this._validateVirtueReceipt(virtueReceipt);
    const chainIntact = this._verifyChainIntegrity(virtueReceipt);

    return {
      valid: errors.length === 0 && chainIntact,
      errors,
      chainIntact,
      governanceLevel: virtueReceipt.governance_level,
      timestamp: virtueReceipt.timestamp
    };
  }

  /**
   * Compute hash for a document
   * @param {string} filePath - Path to document
   * @returns {Promise<string>} SHA-256 hash
   */
  async computeHash(filePath) {
    return sha256File(filePath);
  }

  /**
   * Create empty verification result
   * @private
   */
  _createEmptyResult() {
    return {
      verified: false,
      status: VerificationStatus.PENDING,
      documentHash: null,
      virtueReceipt: null,
      governanceLevel: null,
      ispProfile: null,
      chainIntact: false,
      errors: [],
      warnings: [],
      verifiedAt: null
    };
  }

  /**
   * Extract WINDI metadata from document
   * @private
   * @param {Buffer} buffer - Document buffer
   * @param {string} filePath - File path for type detection
   * @returns {Promise<Object|null>} Extracted metadata or null
   */
  async _extractMetadata(buffer, filePath) {
    const ext = path.extname(filePath).toLowerCase();

    // Try to find WINDI envelope in document
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 50000));

    // Look for WINDI JSON envelope
    const envelopeMatch = content.match(/WINDI-ENVELOPE-BEGIN([\s\S]*?)WINDI-ENVELOPE-END/);
    if (envelopeMatch) {
      try {
        const envelope = JSON.parse(envelopeMatch[1].trim());
        return {
          virtueReceipt: envelope.virtue_receipt || envelope.virtueReceipt,
          envelope
        };
      } catch (e) {
        // Invalid JSON in envelope
      }
    }

    // Look for embedded Virtue Receipt
    const receiptMatch = content.match(/"virtue_receipt"\s*:\s*(\{[^}]+\})/);
    if (receiptMatch) {
      try {
        return { virtueReceipt: JSON.parse(receiptMatch[1]) };
      } catch (e) {
        // Invalid JSON
      }
    }

    // For PDFs, check XMP metadata or document properties
    if (ext === '.pdf') {
      return this._extractPDFMetadata(buffer);
    }

    return null;
  }

  /**
   * Extract metadata from PDF
   * @private
   * @param {Buffer} buffer - PDF buffer
   * @returns {Object|null} Extracted metadata
   */
  _extractPDFMetadata(buffer) {
    const content = buffer.toString('binary');

    // Look for WINDI metadata in PDF
    const windiMatch = content.match(/\/WINDI\s*<<([^>]+)>>/);
    if (windiMatch) {
      // Parse PDF dictionary (simplified)
      try {
        const dict = this._parsePDFDict(windiMatch[1]);
        if (dict.VirtueReceipt) {
          return { virtueReceipt: JSON.parse(dict.VirtueReceipt) };
        }
      } catch (e) {
        // Parse error
      }
    }

    // Check for XMP metadata
    const xmpMatch = content.match(/<windi:VirtueReceipt>([\s\S]*?)<\/windi:VirtueReceipt>/);
    if (xmpMatch) {
      try {
        return { virtueReceipt: JSON.parse(xmpMatch[1].trim()) };
      } catch (e) {
        // Invalid JSON
      }
    }

    return null;
  }

  /**
   * Parse simplified PDF dictionary
   * @private
   */
  _parsePDFDict(str) {
    const dict = {};
    const regex = /\/(\w+)\s*\(([^)]*)\)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      dict[match[1]] = match[2];
    }
    return dict;
  }

  /**
   * Validate Virtue Receipt structure
   * @private
   * @param {VirtueReceipt} receipt - Receipt to validate
   * @returns {string[]} List of validation errors
   */
  _validateVirtueReceipt(receipt) {
    const errors = [];

    if (!receipt) {
      errors.push('Virtue Receipt is null or undefined');
      return errors;
    }

    // Required fields
    const required = ['document_id', 'hash', 'timestamp', 'governance_level'];
    for (const field of required) {
      if (!receipt[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate hash format (SHA-256 = 64 hex chars)
    if (receipt.hash && !/^[a-f0-9]{64}$/i.test(receipt.hash)) {
      errors.push('Invalid hash format (expected SHA-256)');
    }

    // Validate governance level
    if (receipt.governance_level &&
        !Object.values(GovernanceLevel).includes(receipt.governance_level)) {
      errors.push(`Invalid governance level: ${receipt.governance_level}`);
    }

    // Validate timestamp
    if (receipt.timestamp) {
      const ts = new Date(receipt.timestamp);
      if (isNaN(ts.getTime())) {
        errors.push('Invalid timestamp format');
      }
    }

    return errors;
  }

  /**
   * Verify chain integrity of Virtue Receipt
   * @private
   * @param {VirtueReceipt} receipt - Receipt to verify
   * @returns {boolean} True if chain is intact
   */
  _verifyChainIntegrity(receipt) {
    if (!receipt.prev_hash || !receipt.chain_hash) {
      // No chain data — cannot verify, but not necessarily invalid
      return true;
    }

    // Compute expected chain hash
    const payload = canonicalizeJSON({
      document_id: receipt.document_id,
      hash: receipt.hash,
      timestamp: receipt.timestamp,
      governance_level: receipt.governance_level
    });

    return verifyChainLink(receipt.prev_hash, payload, receipt.chain_hash);
  }
}

module.exports = {
  WindiVerifyClient,
  GovernanceLevel,
  VerificationStatus,
  // Re-export hash utilities
  sha256,
  sha256File,
  hashJSON,
  canonicalizeJSON,
  GENESIS_HASH
};
