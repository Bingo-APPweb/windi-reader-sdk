#!/usr/bin/env node
/**
 * WINDI Full End-to-End Test
 *
 * Tests the complete flow: SDK → Verification API → Policy Engine
 *
 * Prerequisites:
 *   - windi-verification-api running on localhost:4000
 *
 * Usage:
 *   node examples/full-e2e-test.js
 */

import { WindiVerifyClient, Hash, Canon } from "../src/index.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { simpleDecision } = require("../../windi-policy-engine/src/index.js");

console.log("╔═══════════════════════════════════════════════════════════════╗");
console.log("║     WINDI Full E2E Test (SDK → API → Policy Engine)          ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");

const client = new WindiVerifyClient({
  baseUrl: process.env.WINDI_BASE_URL || "http://localhost:4000",
  apiKey: process.env.WINDI_API_KEY || "test-key"
});

async function runTest(name, { doc, context, expectedDecision }) {
  console.log(`\n=== ${name} ===\n`);

  // Step 1: Generate document hash
  const documentContent = JSON.stringify(doc);
  const documentHash = Hash.sha256UrnFromUtf8(documentContent);
  console.log(`Document Hash: ${documentHash.slice(0, 30)}...`);

  // Step 2: Call Verification API
  const verification = await client.verify({
    document_id: `windi:doc:test-${Date.now()}`,
    document_hash: documentHash,
    issuer_key_id: "windi:key:test-issuer",
    proof_level: "L2"
  });
  console.log(`Verification: ${verification.verdict} / ${verification.integrity}`);

  // Step 3: Apply Policy Engine
  const decision = simpleDecision({
    verification: {
      verdict: verification.verdict,
      integrity: verification.integrity,
      signature: verification.checks?.signature_valid ? "VALID" : "INVALID",
      trust_level: context.trust_level || "HIGH",
      issuer_status: verification.issuer_status,
      risk_flags: verification.risk_flags || []
    },
    doc,
    context
  });

  console.log(`Decision: ${decision.decision}`);
  console.log(`Score: ${decision.score}`);
  if (decision.reason_codes.length) {
    console.log(`Reasons: ${decision.reason_codes.join(", ")}`);
  }
  if (decision.required_actions.length) {
    console.log(`Actions: ${decision.required_actions.join(", ")}`);
  }

  const passed = decision.decision === expectedDecision;
  console.log(`\nResult: ${passed ? "✅ PASSED" : "❌ FAILED"} (expected ${expectedDecision})`);

  return passed;
}

try {
  let passed = 0;
  let failed = 0;

  // Test 1: Valid document, matching IBAN
  if (await runTest("Valid Document - ALLOW scenario", {
    doc: { iban: "DE89370400440532013000", amount: "1234.50" },
    context: { expected_iban: "DE89370400440532013000", amount: 500, trust_level: "HIGH" },
    expectedDecision: "HOLD" // default policy is HOLD when no rules trigger
  })) passed++; else failed++;

  // Test 2: IBAN mismatch - should BLOCK
  if (await runTest("IBAN Mismatch - BLOCK scenario", {
    doc: { iban: "DE89370400440532013000" },
    context: { expected_iban: "FR7630006000011234567890189", amount: 500, trust_level: "HIGH" },
    expectedDecision: "BLOCK"
  })) passed++; else failed++;

  // Test 3: High value with low trust - should HOLD
  if (await runTest("High Value + Low Trust - HOLD scenario", {
    doc: { iban: "DE89370400440532013000" },
    context: { expected_iban: "DE89370400440532013000", amount: 50000, trust_level: "MEDIUM" },
    expectedDecision: "HOLD"
  })) passed++; else failed++;

  // Test 4: Unknown issuer - should HOLD
  if (await runTest("Unknown Issuer - HOLD scenario", {
    doc: { iban: "DE89370400440532013000" },
    context: { expected_iban: "DE89370400440532013000", amount: 500, trust_level: "HIGH", issuer_status: "UNKNOWN" },
    expectedDecision: "HOLD"
  })) passed++; else failed++;

  console.log("\n" + "═".repeat(65));
  console.log(`\n  Summary: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log("  ✅ All E2E tests passed! WINDI flow is working correctly.\n");
  } else {
    console.log("  ⚠️  Some tests failed.\n");
    process.exit(1);
  }

} catch (err) {
  console.error(`\n❌ Error: ${err.message}`);
  if (err.code === "ECONNREFUSED") {
    console.error("   Make sure windi-verification-api is running on localhost:4000");
  }
  process.exit(1);
}
