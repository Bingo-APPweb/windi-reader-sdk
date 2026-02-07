import axios from "axios";
import { WindiConfigError, WindiHttpError } from "./errors.js";
import { sha256UrnFromFile, sha256UrnFromBuffer } from "./hash.js";

/**
 * WINDI Verify client for institutional environments.
 *
 * @example
 * const client = new WindiVerifyClient({
 *   baseUrl: "https://verify.windi.eu/api",
 *   apiKey: process.env.WINDI_API_KEY
 * });
 *
 * const result = await client.verifyFromFile({
 *   filePath: "./invoice.pdf",
 *   documentId: "windi:doc:inv-2026-001",
 *   issuerKeyId: "windi:key:bank-de"
 * });
 */
export class WindiVerifyClient {
  /**
   * @param {import("./types.js").ClientOptions} opts
   */
  constructor(opts) {
    if (!opts?.baseUrl) throw new WindiConfigError("baseUrl is required");
    if (!opts?.apiKey) throw new WindiConfigError("apiKey is required");

    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 15_000;

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
      headers: {
        "X-WINDI-API-KEY": this.apiKey,
        "Content-Type": "application/json"
      }
    });
  }

  /**
   * Verify using document hash (preferred method).
   *
   * @param {import("./types.js").VerifyRequest} req
   * @returns {Promise<import("./types.js").VerifyResponse>}
   *
   * @example
   * const result = await client.verify({
   *   document_id: "windi:doc:inv-001",
   *   document_hash: "sha256:abc123...",
   *   issuer_key_id: "windi:key:bank",
   *   proof_level: "L2"
   * });
   */
  async verify(req) {
    try {
      const res = await this.http.post("/verify", req);
      return res.data;
    } catch (err) {
      throw this.#normalizeAxiosError(err);
    }
  }

  /**
   * Convenience: verify from file (PDF or any binary) by hashing locally.
   *
   * @param {{
   *   filePath: string,
   *   documentId: string,
   *   issuerKeyId: string,
   *   manifestId?: string,
   *   proofLevel?: "L1"|"L2"|"L3"
   * }} args
   * @returns {Promise<import("./types.js").VerifyResponse>}
   *
   * @example
   * const result = await client.verifyFromFile({
   *   filePath: "./invoice.pdf",
   *   documentId: "windi:doc:inv-001",
   *   issuerKeyId: "windi:key:bank"
   * });
   */
  async verifyFromFile(args) {
    const document_hash = sha256UrnFromFile(args.filePath);
    return this.verify({
      document_id: args.documentId,
      document_hash,
      issuer_key_id: args.issuerKeyId,
      manifest_id: args.manifestId,
      proof_level: args.proofLevel ?? "L2"
    });
  }

  /**
   * Convenience: verify from in-memory bytes.
   *
   * @param {{
   *   bytes: Buffer,
   *   documentId: string,
   *   issuerKeyId: string,
   *   manifestId?: string,
   *   proofLevel?: "L1"|"L2"|"L3"
   * }} args
   * @returns {Promise<import("./types.js").VerifyResponse>}
   */
  async verifyFromBytes(args) {
    const document_hash = sha256UrnFromBuffer(args.bytes);
    return this.verify({
      document_id: args.documentId,
      document_hash,
      issuer_key_id: args.issuerKeyId,
      manifest_id: args.manifestId,
      proof_level: args.proofLevel ?? "L2"
    });
  }

  /**
   * Verify using a WVC (WINDI Verification Code) string.
   * Requires backend support for /verify/wvc endpoint.
   *
   * @param {{ wvc: string, proofLevel?: "L1"|"L2"|"L3" }} args
   * @returns {Promise<import("./types.js").VerifyResponse>}
   */
  async verifyWvc({ wvc, proofLevel = "L2" }) {
    try {
      const res = await this.http.post("/verify/wvc", { wvc, proof_level: proofLevel });
      return res.data;
    } catch (err) {
      throw this.#normalizeAxiosError(err);
    }
  }

  /**
   * Health check for the verification API.
   * @returns {Promise<{ status: string, version?: string }>}
   */
  async healthCheck() {
    try {
      const res = await this.http.get("/health");
      return res.data;
    } catch (err) {
      throw this.#normalizeAxiosError(err);
    }
  }

  #normalizeAxiosError(err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const requestId = err?.response?.headers?.["x-request-id"] || data?.request_id;

    if (status) {
      return new WindiHttpError(`WINDI HTTP ${status}`, { status, data, requestId });
    }
    return new WindiHttpError(`WINDI network/error: ${err?.message ?? "unknown"}`, {
      status: 0,
      data: { message: err?.message }
    });
  }
}
