export function uuidv4(): string {
  // browser-safe uuid (requires secure context for crypto, which localhost is)
  return crypto.randomUUID();
}
