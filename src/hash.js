import fs from "node:fs";
import crypto from "node:crypto";

/** @param {Buffer} buf */
export function sha256HexFromBuffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** @param {string} text */
export function sha256HexFromUtf8(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/** @param {string} filePath */
export function sha256HexFromFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return sha256HexFromBuffer(buf);
}

/** @param {string} filePath */
export function sha256UrnFromFile(filePath) {
  return `sha256:${sha256HexFromFile(filePath)}`;
}

/** @param {Buffer} buf */
export function sha256UrnFromBuffer(buf) {
  return `sha256:${sha256HexFromBuffer(buf)}`;
}
