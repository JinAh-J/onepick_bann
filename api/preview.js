import { kv } from '@vercel/kv';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: 미리보기 데이터 저장
  if (req.method === 'POST') {
    try {
      const { captures, meta } = req.body;
      if (!captures || !Array.isArray(captures)) {
        return res.status(400).json({ error: 'captures 필드가 필요합니다' });
      }

      // 고유 ID 생성
      const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

      // KV에 저장 (7일 TTL)
      await kv.set(`preview:${id}`, JSON.stringify({ captures, meta, createdAt: Date.now() }), { ex: 60 * 60 * 24 * 7 });

      return res.status(200).json({ id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: 미리보기 데이터 조회
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id가 필요합니다' });

    try {
      const raw = await kv.get(`preview:${id}`);
      if (!raw) return res.status(404).json({ error: '미리보기를 찾을 수 없습니다' });

      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
