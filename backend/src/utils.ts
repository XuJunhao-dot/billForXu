import crypto from 'node:crypto';

export function nowIso() {
  return new Date().toISOString();
}

export function uuid() {
  return crypto.randomUUID();
}

export function parseMoneyToCents(amount: string): bigint {
  // Accepts "123", "123.4", "123.45"; rejects negatives.
  const s = amount.trim();
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(s)) {
    throw new Error('Invalid amount format');
  }
  const [i, d = ''] = s.split('.');
  const cents = BigInt(i) * 100n + BigInt((d + '00').slice(0, 2));
  return cents;
}

export function centsToMoney(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const abs = cents < 0n ? -cents : cents;
  const i = abs / 100n;
  const d = abs % 100n;
  return `${sign}${i.toString()}.${d.toString().padStart(2, '0')}`;
}
