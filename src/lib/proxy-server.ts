import { getLocal, generateCACertificate } from 'mockttp';
import type { HurlmanConfig, ProxyHandle } from '../types.js';
import { deriveResponseKey, getResponse, isResponseFresh, setResponse } from './response-cache.js';

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'proxy-connection', 'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

function fetchRaw(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | undefined,
): Promise<{ statusCode: number; headers: Record<string, string>; rawBody: Buffer }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const mod = isHttps ? require('https') : require('http');

    const req = mod.request(
      url,
      { method, headers, rejectUnauthorized: false },
      (res: import('http').IncomingMessage) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const rawBody = Buffer.concat(chunks);
          const responseHeaders: Record<string, string> = {};
          // res.headers preserves multi-value headers as arrays or single strings
          for (const [k, v] of Object.entries(res.headers)) {
            if (HOP_BY_HOP.has(k.toLowerCase())) continue;
            if (Array.isArray(v)) responseHeaders[k] = v.join(', ');
            else if (v !== undefined) responseHeaders[k] = String(v);
          }
          resolve({ statusCode: res.statusCode ?? 0, headers: responseHeaders, rawBody });
        });
      },
    );

    req.on('error', reject);
    if (body && body.length > 0) req.write(body);
    req.end();
  });
}

export async function startProxy(config: HurlmanConfig['proxy']): Promise<ProxyHandle> {
  const caCert = await generateCACertificate();
  const server = getLocal({ https: caCert });
  const ttlMs = config.ttlMs;

  await server.forAnyRequest().thenCallback(async (req) => {
    const body = req.body.buffer;
    const key = deriveResponseKey(req.method, req.url, body.length > 0 ? body : undefined);

    const cached = getResponse(key);
    if (cached && isResponseFresh(cached, ttlMs)) {
      return { statusCode: cached.statusCode, headers: cached.responseHeaders, rawBody: cached.responseBody };
    }

    const forwardHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (HOP_BY_HOP.has(k.toLowerCase())) continue;
      if (Array.isArray(v)) forwardHeaders[k] = v.join(', ');
      else if (v !== undefined) forwardHeaders[k] = v;
    }

    const { statusCode, headers, rawBody } = await fetchRaw(req.url, req.method, forwardHeaders, body.length > 0 ? body : undefined);

    if (statusCode >= 200 && statusCode < 300) {
      setResponse({
        key, method: req.method, url: req.url,
        statusCode,
        responseHeaders: headers,
        responseBody: rawBody,
        cachedAt: new Date().toISOString(),
      });
    }

    return { statusCode, headers, rawBody };
  });

  if (config.url) {
    const parsed = new URL(config.url);
    await server.start(parseInt(parsed.port, 10));
    return { address: config.url, stop: () => server.stop() };
  }

  await server.start();
  return { address: `http://127.0.0.1:${server.port}`, stop: () => server.stop() };
}
