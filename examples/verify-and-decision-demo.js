#!/usr/bin/env node
/**
 * WINDI Reader SDK — Verification + Policy Decision Demo
 *
 * Demonstrates how to combine WINDI verification with
 * bank policy engine decisions (ALLOW/HOLD/BLOCK).
 *
 * Usage:
 *   AMOUNT_EUR=75000 WINDI_API_KEY=your-key node examples/verify-and-decision-demo.js
 */

import { WindiVerifyClient } from "../src/index.js";

/**
 * Simple policy decision engine (mock).
 * In production, this would be replaced by windi-policy-engine.
 *
 * @param {{ paymentAmountEur: number, verify: object }} ctx
 * @returns {{ action: string, reason: string }}
 */
function simpleDecision({ paymentAmountEur, verify }) {
  // Rule 1: IBAN mismatch is always blocked
  if (verify.risk_flags?.includes("IBAN_MISMATCH")) {
    return { action: "BLOCK", reason: "IBAN_MISMATCH" };
  }

  // Rule 2: High-value transactions require L3 verification
  if (paymentAmountEur >= 50000 && verify.trust_level !== "L3") {
    return { action: "HOLD", reason: "HIGH_VALUE_REQUIRES_L3" };
  }

  // Rule 3: L1 (offline) verification requires manual review
  if (verify.trust_level === "L1") {
    return { action: "HOLD", reason: "OFFLINE_ONLY" };
  }

  // Rule 4: Tampered documents are always blocked
  if (verify.verdict === "INVALID" || verify.integrity === "MODIFIED") {
    return { action: "BLOCK", reason: "TAMPERED" };
  }

  // Rule 5: Suspect documents require review
  if (verify.verdict === "SUSPECT") {
    return { action: "HOLD", reason: "SUSPECT_DOCUMENT" };
  }

  // Default: Allow if all checks pass
  return { action: "ALLOW", reason: "OK" };
}

// Create client
const client = new WindiVerifyClient({
  baseUrl: process.env.WINDI_BASE_URL || "https://verify.windi.eu/api",
  apiKey: process.env.WINDI_API_KEY || "DEMO_KEY"
});

try {
  console.log("\n=== WINDI Verification + Policy Demo ===\n");

  // Step 1: Verify document
  const verify = await client.verify({
    document_id: process.env.DOC_ID || "windi:doc:demo",
    document_hash: process.env.DOC_HASH || "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    issuer_key_id: process.env.ISSUER_KEY || "windi:key:demo",
    proof_level: process.env.PROOF || "L2"
  });

  console.log("Verification Result:");
  console.log(`  Verdict: ${verify.verdict}`);
  console.log(`  Integrity: ${verify.integrity}`);
  console.log(`  Trust Level: ${verify.trust_level}`);
  if (verify.risk_flags?.length) {
    console.log(`  Risk Flags: ${verify.risk_flags.join(", ")}`);
  }

  // Step 2: Apply policy decision
  const paymentAmountEur = Number(process.env.AMOUNT_EUR || 75000);
  const decision = simpleDecision({ paymentAmountEur, verify });

  console.log("\nPolicy Decision:");
  console.log(`  Payment Amount: €${paymentAmountEur.toLocaleString()}`);
  console.log(`  Action: ${decision.action}`);
  console.log(`  Reason: ${decision.reason}`);

  // Step 3: Output summary
  console.log("\n=== Summary ===");
  console.log(JSON.stringify({ verify, decision }, null, 2));

} catch (err) {
  console.error("Error:", err.message);
  if (err.data) console.error("Details:", err.data);
  process.exit(1);
}
