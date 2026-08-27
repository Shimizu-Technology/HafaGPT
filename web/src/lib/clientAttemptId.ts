let fallbackSequence = 0;

/** Create an RFC 4122 v4 identifier for retry-safe client writes. */
export function createClientAttemptId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Idempotency keys are uniqueness tokens, not secrets. Mix time and a
    // per-page sequence into the compatibility path so identical PRNG values
    // still cannot repeat an ID during the same browser session.
    fallbackSequence += 1;
    const timestamp = Date.now();
    for (let index = 0; index < bytes.length; index += 1) {
      const shift = (index % 4) * 8;
      const timeByte = (timestamp >>> shift) & 0xff;
      const sequenceByte = (fallbackSequence >>> shift) & 0xff;
      bytes[index] = Math.floor(Math.random() * 256) ^ timeByte ^ sequenceByte;
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}
