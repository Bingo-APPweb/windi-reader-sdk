#!/usr/bin/env node
/**
 * WINDI End-to-End Test
 *
 * Tests the full flow: SDK → Verification API
 *
 * Prerequisites:
 *   - windi-verification-api running on localhost:4000
 *
 * Usage:
 *   node examples/e2e-test.js
 */

import { WindiVerifyClient, Hash, Canon } from "../src/index.js";

console.log("╔════════════════════════════════════════════════════╗");
console.log("║     WINDI End-to-End Test (SDK → API)              ║");
console.log("╚════════════════════════════════════════════════════╝\n");

// Test 1: Hash utilities
console.log("=== Test 1: Hash Utilities ===\n");

const testText = "PAYTO|IBAN|DE89370400440532013000";
const hash = Hash.sha256UrnFromUtf8(testText);
console.log(`Input:  "${testText}"`);
console.log(`Hash:   ${hash}`);
console.log(`Format: ${/^sha256:[a-f0-9]{64}$/.test(hash) ? "✅ Valid" : "❌ Invalid"}`);

// Test 2: Canonicalization
console.log("\n=== Test 2: Canonicalization ===\n");

const testIBAN = "DE89 3704 0044 0532 0130 00";
const canonIBAN = Canon.canonIBAN(testIBAN);
console.log(`IBAN Input:  "${testIBAN}"`);
console.log(`IBAN Canon:  "${canonIBAN}"`);
console.log(`Valid: ${canonIBAN === "DE89370400440532013000" ? "✅" : "❌"}`);

const testAmount = "€ 1.234,50";
const canonAmount = Canon.canonAmount2(testAmount);
console.log(`\nAmount Input: "${testAmount}"`);
console.log(`Amount Canon: "${canonAmount}"`);
console.log(`Valid: ${canonAmount === "1234.50" ? "✅" : "❌"}`);

// Test 3: API Connection
console.log("\n=== Test 3: API Connection ===\n");

const client = new WindiVerifyClient({
  baseUrl: process.env.WINDI_BASE_URL || "http://localhost:4000",
  apiKey: process.env.WINDI_API_KEY || "test-key"
});

try {
  // Generate a document hash
  const documentContent = "This is a test invoice document content";
  const documentHash = Hash.sha256UrnFromUtf8(documentContent);

  console.log(`Document Hash: ${documentHash}`);
  console.log(`Calling API...`);

  const result = await client.verify({
    document_id: "windi:doc:e2e-test-001",
    document_hash: documentHash,
    issuer_key_id: "windi:key:test-issuer",
    proof_level: "L2"
  });

  console.log(`\nAPI Response:`);
  console.log(`  Verdict:      ${result.verdict === "VALID" ? "✅" : "❌"} ${result.verdict}`);
  console.log(`  Integrity:    ${result.integrity}`);
  console.log(`  Trust Level:  ${result.trust_level}`);
  console.log(`  Issuer:       ${result.issuer_status}`);
  console.log(`  Request ID:   ${result.request_id}`);

  if (result.checks) {
    console.log(`  Checks:`);
    for (const [key, val] of Object.entries(result.checks)) {
      console.log(`    - ${key}: ${val ? "✅" : "❌"}`);
    }
  }

  console.log("\n✅ End-to-End Test PASSED!\n");

} catch (err) {
  console.error(`\n❌ API Error: ${err.message}`);
  if (err.status) console.error(`   Status: ${err.status}`);
  if (err.data) console.error(`   Data: ${JSON.stringify(err.data)}`);
  process.exit(1);
}

// Test 4: Shelf generation
console.log("=== Test 4: Shelf Hash Generation ===\n");

const iban = Canon.canonIBAN("DE89 3704 0044 0532 0130 00");
const amount = Canon.canonAmount2("€ 1.234,50");
const currency = Canon.canonCurrency("Euro");

const paytoShelf = Canon.shelfPaytoIban(iban);
const amountShelf = `AMOUNT|DEC|${amount}`;
const currencyShelf = `CURRENCY|ISO4217|${currency}`;

console.log("Shelves:");
console.log(`  ${paytoShelf}`);
console.log(`  ${amountShelf}`);
console.log(`  ${currencyShelf}`);

console.log("\nShelf Hashes:");
console.log(`  payto_hash:    ${Hash.sha256UrnFromUtf8(paytoShelf)}`);
console.log(`  amount_hash:   ${Hash.sha256UrnFromUtf8(amountShelf)}`);
console.log(`  currency_hash: ${Hash.sha256UrnFromUtf8(currencyShelf)}`);

console.log("\n╔════════════════════════════════════════════════════╗");
console.log("║     All Tests Completed Successfully!              ║");
console.log("╚════════════════════════════════════════════════════╝\n");
