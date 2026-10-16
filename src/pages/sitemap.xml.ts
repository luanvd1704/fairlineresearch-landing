// sitemap.xml cho máy tìm kiếm: mọi trang .astro trong src/pages (trừ 404), thêm trang là tự có mặt
import type { APIRoute } from 'astro';
import { tatCaBai } from '../lib/bai-viet';

const TRANG = Object.keys(import.meta.glob('./**/*.astro'))
  .filter((f) => !f.endsWith('/404.astro'))
  .map((f) => f.slice(1).replace(/index\.astro$/, '').replace(/\.astro$/, '')) // ./terms.astro → /terms
  .sort();

export const GET: APIRoute = async ({ site }) => {
  const ngayBai = new Map((await tatCaBai()).map((b) => [`/phan-tich/${b.id}/`, b.data.ngay]));
  const dong = TRANG.map((duong) => {
    const ngay = ngayBai.get(duong);
    const lastmod = ngay ? `<lastmod>${ngay.toISOString().slice(0, 10)}</lastmod>` : '';
    return `  <url><loc>${new URL(duong, site).href}</loc>${lastmod}</url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${dong.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
