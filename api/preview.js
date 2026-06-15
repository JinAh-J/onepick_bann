export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GIST_TOKEN = process.env.GIST_TOKEN;
  if (!GIST_TOKEN) return res.status(500).json({ error: 'GIST_TOKEN 환경변수가 설정되지 않았습니다' });

  // POST: 저장
  if (req.method === 'POST') {
    try {
      const { captures, meta } = req.body;
      const now = meta?.createdAt || new Date().toLocaleString('ko-KR');
      const payload = {
        description: 'Banner Preview ' + now,
        public: true,
        files: { 'preview.json': { content: JSON.stringify({ captures, meta }) } }
      };
      const resp = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': 'token ' + GIST_TOKEN,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const e = await resp.json();
        return res.status(resp.status).json({ error: e.message || 'Gist 저장 실패' });
      }
      const gist = await resp.json();
      return res.status(200).json({ id: gist.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: 조회
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id가 필요합니다' });
    try {
      const resp = await fetch('https://api.github.com/gists/' + id, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!resp.ok) return res.status(404).json({ error: '미리보기를 찾을 수 없습니다' });
      const gist = await resp.json();
      const raw = gist.files['preview.json']?.content;
      if (!raw) return res.status(404).json({ error: '데이터가 없습니다' });
      return res.status(200).json(JSON.parse(raw));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
