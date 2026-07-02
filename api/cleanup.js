// api/cleanup.js
// 7일 지난 Banner Preview Gist 자동 삭제 (Vercel Cron으로 매일 실행)

export default async function handler(req, res) {
  const GIST_TOKEN = process.env.GIST_TOKEN;
  if (!GIST_TOKEN) return res.status(500).json({ error: 'GIST_TOKEN 환경변수가 설정되지 않았습니다' });

  const RETENTION_DAYS = 7;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  try {
    let deleted = 0;
    let page = 1;

    // 페이지네이션으로 내 Gist 목록 순회 (최대 5페이지 = 500개)
    while (page <= 5) {
      const listResp = await fetch('https://api.github.com/gists?per_page=100&page=' + page, {
        headers: {
          'Authorization': 'token ' + GIST_TOKEN,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!listResp.ok) break;
      const gists = await listResp.json();
      if (!gists.length) break;

      for (const gist of gists) {
        // Banner Preview로 생성된 Gist만 대상
        const isPreview = (gist.description || '').startsWith('Banner Preview');
        const createdAt = new Date(gist.created_at).getTime();
        if (isPreview && createdAt < cutoff) {
          const delResp = await fetch('https://api.github.com/gists/' + gist.id, {
            method: 'DELETE',
            headers: {
              'Authorization': 'token ' + GIST_TOKEN,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          if (delResp.ok || delResp.status === 204) deleted++;
        }
      }
      page++;
    }

    return res.status(200).json({ ok: true, deleted, retentionDays: RETENTION_DAYS });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
