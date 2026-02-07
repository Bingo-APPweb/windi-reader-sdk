#!/usr/bin/env node
/**
 * WINDI Reader SDK — PDF Verification Example
 *
 * Demonstrates how to verify a WINDI-governed PDF document.
 *
 * Usage:
 *   node verify-from-pdf.js <path-to-pdf>
 *   node verify-from-pdf.js ./sample-governed-document.pdf
 *
 * @license Apache-2.0
 */

'use strict';

const path = require('path');
const { WindiVerifyClient, VerificationStatus, GovernanceLevel } = require('../sdk/windi-verify-client');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

/**
 * Format governance level with color
 */
function formatGovernanceLevel(level) {
  const levelColors = {
    [GovernanceLevel.HIGH]: colors.red,
    [GovernanceLevel.MEDIUM]: colors.yellow,
    [GovernanceLevel.LOW]: colors.green
  };
  return `${levelColors[level] || ''}${level}${colors.reset}`;
}

/**
 * Format verification status with icon
 */
function formatStatus(status) {
  const icons = {
    [VerificationStatus.VERIFIED]: `${colors.green}✓ VERIFIED${colors.reset}`,
    [VerificationStatus.INVALID]: `${colors.red}✗ INVALID${colors.reset}`,
    [VerificationStatus.PENDING]: `${colors.yellow}⏳ PENDING${colors.reset}`,
    [VerificationStatus.ERROR]: `${colors.red}⚠ ERROR${colors.reset}`,
    [VerificationStatus.NO_GOVERNANCE]: `${colors.gray}○ NO GOVERNANCE${colors.reset}`
  };
  return icons[status] || status;
}

/**
 * Print verification result
 */
function printResult(result, filePath) {
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}  WINDI Document Verification Result${colors.reset}`);
  console.log('═'.repeat(60));

  console.log(`\n  File: ${colors.blue}${filePath}${colors.reset}`);
  console.log(`  Status: ${formatStatus(result.status)}`);

  if (result.documentHash) {
    console.log(`  Hash: ${colors.gray}${result.documentHash.substring(0, 16)}...${colors.reset}`);
  }

  if (result.verified) {
    console.log(`\n  ${colors.green}┌─────────────────────────────────────┐${colors.reset}`);
    console.log(`  ${colors.green}│     WINDI VERIFIED ✓                │${colors.reset}`);
    console.log(`  ${colors.green}└─────────────────────────────────────┘${colors.reset}`);

    if (result.governanceLevel) {
      console.log(`\n  Governance Level: ${formatGovernanceLevel(result.governanceLevel)}`);
    }

    if (result.ispProfile) {
      console.log(`  ISP Profile: ${colors.blue}${result.ispProfile}${colors.reset}`);
    }

    if (result.virtueReceipt) {
      console.log(`\n  ${colors.gray}Virtue Receipt:${colors.reset}`);
      console.log(`    Document ID: ${result.virtueReceipt.document_id}`);
      console.log(`    Timestamp: ${result.virtueReceipt.timestamp}`);
      console.log(`    Chain Intact: ${result.chainIntact ? colors.green + 'Yes' : colors.red + 'No'}${colors.reset}`);
    }
  }

  if (result.errors.length > 0) {
    console.log(`\n  ${colors.red}Errors:${colors.reset}`);
    result.errors.forEach(err => {
      console.log(`    ${colors.red}•${colors.reset} ${err}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log(`\n  ${colors.yellow}Warnings:${colors.reset}`);
    result.warnings.forEach(warn => {
      console.log(`    ${colors.yellow}•${colors.reset} ${warn}`);
    });
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
${colors.bold}WINDI Reader SDK — PDF Verification${colors.reset}

Usage:
  node verify-from-pdf.js <path-to-pdf>

Example:
  node verify-from-pdf.js ./governed-document.pdf

Options:
  --strict    Enable strict mode (all checks must pass)
  --help      Show this help message
`);
    process.exit(0);
  }

  const filePath = args.find(arg => !arg.startsWith('--'));
  const strictMode = args.includes('--strict');

  if (!filePath) {
    console.error(`${colors.red}Error: No file path provided${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.gray}Verifying document...${colors.reset}`);

  // Create verification client
  const client = new WindiVerifyClient({
    offlineMode: true,
    strictMode
  });

  try {
    // Verify the document
    const result = await client.verifyDocument(filePath);

    // Print result
    printResult(result, filePath);

    // Exit with appropriate code
    process.exit(result.verified ? 0 : 1);

  } catch (error) {
    console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);
    process.exit(1);
  }
}

// Run main
main().catch(console.error);
