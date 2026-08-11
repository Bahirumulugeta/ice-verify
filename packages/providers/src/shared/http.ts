import https from 'node:https';
import http from 'node:http';

export async function fetchBuffer(
  url: string,
  options: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    insecureTls?: boolean;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<{ status: number; buffer: ArrayBuffer; contentType: string }> {
  if (options.insecureTls) {
    return fetchBufferInsecure(url, options);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers,
      },
    });
    const buffer = await response.arrayBuffer();
    return {
      status: response.status,
      buffer,
      contentType: response.headers.get('content-type') ?? '',
    };
  } finally {
    clearTimeout(timer);
  }
}

function fetchBufferInsecure(
  url: string,
  options: { timeoutMs?: number; headers?: Record<string, string> },
): Promise<{ status: number; buffer: ArrayBuffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'http:' ? 80 : 443),
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...options.headers,
        },
        timeout: options.timeoutMs ?? 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode ?? 0,
            buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
            contentType: String(res.headers['content-type'] ?? ''),
          });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    req.end();
  });
}

export async function fetchJson<T>(
  url: string,
  options: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<{ status: number; data: T }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ICE-Verification/1.0',
        ...options.headers,
      },
    });
    const data = (await response.json()) as T;
    return { status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export function parseMoney(raw?: string | null): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d.]/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : undefined;
}
