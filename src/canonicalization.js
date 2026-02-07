/**
 * WINDI Canonicalization Utilities
 *
 * Deterministic normalization rules for critical document fields.
 * Future: integrate with windi-proof-spec for complete rules.
 */

/**
 * Trim + collapse whitespace.
 * @param {string} s
 */
export function canonText(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Uppercase + NFKC-like handling.
 * @param {string} s
 */
export function canonTextUpper(s) {
  return canonText(s).normalize("NFKC").toUpperCase();
}

/**
 * IBAN canonical: remove spaces/hyphens, uppercase.
 * @param {string} iban
 */
export function canonIBAN(iban) {
  return canonText(iban).replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Currency symbol/name to ISO 4217 mapping
 */
const CURRENCY_MAP = {
  "€": "EUR", "EURO": "EUR", "EUR": "EUR",
  "$": "USD", "DOLLAR": "USD", "USD": "USD",
  "£": "GBP", "POUND": "GBP", "GBP": "GBP",
  "¥": "JPY", "YEN": "JPY", "JPY": "JPY",
  "CHF": "CHF", "FRANC": "CHF"
};

/**
 * ISO currency canonical.
 * @param {string} cur
 */
export function canonCurrency(cur) {
  const upper = canonTextUpper(cur);
  return CURRENCY_MAP[upper] || upper;
}

/**
 * Amount canonical: accepts "€ 1.234,50" or "1,234.50" or "1234.5" → "1234.50"
 * WARNING: this is a pragmatic canonicalizer for Reader-side checks, not accounting grade.
 * @param {string|number} amount
 */
export function canonAmount2(amount) {
  let raw = canonText(String(amount ?? ""));
  if (!raw) return "0.00";

  // Strip currency symbols and whitespace
  raw = raw.replace(/[€$£¥\s]/g, "");
  if (!raw) return "0.00";

  // Detect format: if last separator is comma, it's German format (1.234,50)
  // if last separator is dot, it's US format (1,234.50)
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");

  let normalized;
  if (lastComma > lastDot) {
    // German format: 1.234,50 → remove dots, replace comma with dot
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    // US format or no thousands separator: 1,234.50 → remove commas
    normalized = raw.replace(/,/g, "");
  }

  const num = Number.parseFloat(normalized);
  if (Number.isNaN(num)) return "0.00";

  // HALF_UP to 2 decimals using integer math
  const cents = Math.round(num * 100);
  return (cents / 100).toFixed(2);
}

/**
 * Canonical shelf strings (Reader-side reconstruction)
 */
export function shelfPaytoIban(iban) {
  return `PAYTO|IBAN|${canonIBAN(iban)}`;
}

export function shelfAmountDec2(amount) {
  return `AMOUNT|DEC|${canonAmount2(amount)}`;
}

export function shelfCurrencyIso(cur) {
  return `CURRENCY|ISO4217|${canonCurrency(cur)}`;
}

export function shelfBeneficiaryName(name) {
  return `BENEFICIARY|NAME|${canonTextUpper(name)}`;
}

export function shelfReferenceE2E(ref) {
  return `REFERENCE|E2E|${canonTextUpper(ref)}`;
}
