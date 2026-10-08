/**
 * Rate limiter simples em memória (janela fixa).
 * Suficiente para uma instância única. Em produção com múltiplas instâncias,
 * substitua por um armazenamento compartilhado (ex.: Redis/Upstash).
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { allowed: true };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= limit };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
