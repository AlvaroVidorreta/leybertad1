import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boeHandler, __test_reset_rate, RATE_LIMIT_MAX } from './boe';

function mockReq(query: any = {}, headers: any = {}, ip = '127.0.0.1') {
  return {
    query,
    headers,
    ip,
    connection: { remoteAddress: ip },
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => {
    res._status = code;
    return res;
  };
  res.json = (payload: any) => {
    res._json = payload;
    return res;
  };
  return res;
}

const fakeSummary = {
  status: { code: '200' },
  data: {
    seccion: {
      item: [
        {
          titulo: 'Ley de IVA',
          referencia: 'BOE-A-1992-28740',
          url_pdf: { texto: 'https://boe.es/ley.pdf' },
          subtitulo: 'Regula el IVA'
        }
      ]
    }
  }
};

beforeEach(async () => {
  await __test_reset_rate();
  // mock global.fetch
  (global as any).fetch = vi.fn(async () => ({ ok: true, json: async () => fakeSummary }));
});

describe('boeHandler', () => {
  it('returns 400 when q missing', async () => {
    const req = mockReq();
    const res = mockRes();
    await boeHandler(req, res as any, () => {});
    expect(res._status).toBe(400);
    expect(res._json).toHaveProperty('error');
  });

  it('returns results when q matches', async () => {
    const req = mockReq({ q: 'iva' });
    const res = mockRes();
    await boeHandler(req, res as any, () => {});
    expect(res._json).toBeDefined();
    expect(Array.isArray(res._json.results)).toBe(true);
    expect(res._json.results.length).toBeGreaterThan(0);
    expect(res._json.results[0].title).toContain('IVA');
    expect(res._json.results[0].pdf_url).toBe('https://boe.es/ley.pdf');
  });

  it('enforces rate limit', async () => {
    const req = mockReq({ q: 'iva' });
    // consume allowed requests
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      await boeHandler(req, mockRes() as any, () => {});
    }
    // next one should be 429
    const last = mockRes();
    await boeHandler(req, last as any, () => {});
    expect(last._status).toBe(429);
    expect(last._json).toHaveProperty('error', 'rate_limit_exceeded');
  });
});
