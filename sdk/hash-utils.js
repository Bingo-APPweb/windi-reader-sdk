/**
 * WINDI Hash Utilities
 *
 * Cryptographic hash functions for document verification.
 * Part of the WINDI Reader SDK.
 *
 * @module @windi/reader-sdk/hash-utils
 * @license Apache-2.0
 */

'use strict';

const crypto = require('crypto');

/**
 * Compute SHA-256 hash of a buffer or string
 * @param {Buffer|string} data - Input data
 * @returns {string} Hex-encoded SHA-256 hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compute SHA-256 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
async function sha256File(filePath) {
  const fs = require('fs').promises;
  const data = await fs.readFile(filePath);
  return sha256(data);
}

/**
 * Canonicalize JSON for deterministic hashing
 * Ensures consistent hash regardless of key order
 * @param {Object} obj - JSON object to canonicalize
 * @returns {string} Canonical JSON string
 */
function canonicalizeJSON(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJSON).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalizeJSON(obj[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Compute deterministic hash of a JSON object
 * Uses canonical JSON serialization for consistency
 * @param {Object} obj - JSON object to hash
 * @returns {string} Hex-encoded SHA-256 hash
 */
function hashJSON(obj) {
  const canonical = canonicalizeJSON(obj);
  return sha256(canonical);
}

/**
 * Verify a hash chain link
 * @param {string} prevHash - Previous hash in the chain
 * @param {string} payload - Current payload data
 * @param {string} expectedHash - Expected hash of current link
 * @returns {boolean} True if chain link is valid
 */
function verifyChainLink(prevHash, payload, expectedHash) {
  const computed = sha256(prevHash + payload);
  return computed === expectedHash;
}

/**
 * Generate a chain hash from previous hash and current payload
 * @param {string} prevHash - Previous hash in the chain
 * @param {string} payload - Current payload data
 * @returns {string} New chain hash
 */
function generateChainHash(prevHash, payload) {
  return sha256(prevHash + payload);
}

/**
 * Verify Merkle tree root (simplified)
 * @param {string[]} hashes - Leaf hashes
 * @param {string} expectedRoot - Expected Merkle root
 * @returns {boolean} True if root matches
 */
function verifyMerkleRoot(hashes, expectedRoot) {
  if (hashes.length === 0) return false;
  if (hashes.length === 1) return hashes[0] === expectedRoot;

  let level = [...hashes];

  while (level.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || left; // Duplicate last if odd
      nextLevel.push(sha256(left + right));
    }
    level = nextLevel;
  }

  return level[0] === expectedRoot;
}

/**
 * WINDI Genesis Hash — used as first prev_hash in chain
 */
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

module.exports = {
  sha256,
  sha256File,
  canonicalizeJSON,
  hashJSON,
  verifyChainLink,
  generateChainHash,
  verifyMerkleRoot,
  GENESIS_HASH
};
