#!/usr/bin/env node
/**
 * WINDI Reader SDK — Verify by Hash Example
 *
 * Demonstrates verification using a pre-computed document hash.
 *
 * Usage:
 *   WINDI_API_KEY=your-key node examples/verify-by-hash.js
 */

import { WindiVerifyClient } from "../src/index.js";

const client = new WindiVerifyClient({
  baseUrl: process.env.WINDI_BASE_URL || "https://verify.windi.eu/api",
  apiKey: process.env.WINDI_API_KEY || "DEMO_KEY"
});

try {
  const res = await client.verify({
    document_id: "windi:doc:demo",
    document_hash: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    issuer_key_id: "windi:key:demo",
    proof_level: "L2"
  });

  console.log("Verification Result:");
  console.log(JSON.stringify(res, null, 2));

} catch (err) {
  console.error("Verification Error:", err.message);
  if (err.data) console.error("Details:", err.data);
  process.exit(1);
}
