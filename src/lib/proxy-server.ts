import { getLocal, generateCACertificate } from 'mockttp';
import type { HurlmanConfig, ProxyHandle } from '../types.js';
import { deriveResponseKey, getResponse, isResponseFresh, setResponse } from './response-cache.js';

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'proxy-connection', 'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

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

    const fetchRes = await fetch(req.url, {
      method: req.method,
      headers: forwardHeaders,
      body: body.length > 0 ? new Uint8Array(body) : undefined,
    });

    const resBody = Buffer.from(await fetchRes.arrayBuffer());
    const resHeaders: Record<string, string> = {};
    fetchRes.headers.forEach((v, k) => {
      if (!HOP_BY_HOP.has(k)) resHeaders[k] = v;
    });

    setResponse({
      key, method: req.method, url: req.url,
      statusCode: fetchRes.status,
      responseHeaders: resHeaders,
      responseBody: resBody,
      cachedAt: new Date().toISOString(),
    });

    return { statusCode: fetchRes.status, headers: resHeaders, rawBody: resBody };
  });

  if (config.url) {
    const parsed = new URL(config.url);
    await server.start(parseInt(parsed.port, 10));
    return { address: config.url, stop: () => server.stop() };
  }

  await server.start();
  return { address: `http://127.0.0.1:${server.port}`, stop: () => server.stop() };
}
