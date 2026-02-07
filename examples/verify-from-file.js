#!/usr/bin/env node
/**
 * WINDI Reader SDK — Verify from File Example
 *
 * Demonstrates verification of a local PDF/document file.
 * The SDK computes the SHA-256 hash locally before sending to API.
 *
 * Usage:
 *   FILE=./invoice.pdf WINDI_API_KEY=your-key node examples/verify-from-file.js
 */

import { WindiVerifyClient, Hash } from "../src/index.js";

const filePath = process.env.FILE || "./invoice.pdf";

const client = new WindiVerifyClient({
  baseUrl: process.env.WINDI_BASE_URL || "https://verify.windi.eu/api",
  apiKey: process.env.WINDI_API_KEY || "DEMO_KEY"
});

try {
  // Show local hash computation
  console.log(`\nFile: ${filePath}`);
  console.log(`Hash: ${Hash.sha256UrnFromFile(filePath)}`);
  console.log("");

  const res = await client.verifyFromFile({
    filePath: filePath,
    documentId: process.env.DOC_ID || "windi:doc:demo",
    issuerKeyId: process.env.ISSUER_KEY || "windi:key:demo",
    proofLevel: process.env.PROOF || "L2"
  });

  console.log("Verification Result:");
  console.log(JSON.stringify(res, null, 2));

} catch (err) {
  if (err.code === "ENOENT") {
    console.error(`File not found: ${filePath}`);
    console.error("Set FILE environment variable to a valid file path");
  } else {
    console.error("Verification Error:", err.message);
    if (err.data) console.error("Details:", err.data);
  }
  process.exit(1);
}
