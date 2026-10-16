// Chạy ngay sau `astro build` (xem "build" trong package.json). Lỗi nào cũng làm build thất bại, nên Cloudflare
// không phát bản lỗi lên web.
//   1. Chữ cấm: đường dẫn máy, tên máy, nhận định nội bộ. Repo và web đều công khai.
//   2. Link nội bộ: mọi href/src trỏ tới file có thật trong dist/; mọi #neo trỏ tới id có thật.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const DIST = 'dist';

// Cùng bộ mẫu với dung_ban_web.py (dự án Quarto), trừ "người dùng": trang Bảng giá dùng từ này đúng nghĩa
const CHU_CAM = [/data_raw/i, /duylu/i, /onedrive/i, /kill criteria/i, /giảm tỷ trọng/i, /vùng hành động/i,
  /vùng (mua|giữ|bán)/i, /không mua thêm/i];
// Đường dẫn ổ đĩa (D:\, C:\Users): không soát trong dashboard vì thư viện JS nhúng sẵn có chuỗi dạng "a:\n"
const DUONG_DAN_MAY = /\b[A-Z]:\\/;
const LA_DASHBOARD = (f) => f.endsWith('dashboard.html');

const tatCaFile = (thuMuc) =>
  readdirSync(thuMuc, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? tatCaFile(join(thuMuc, d.name)) : [join(thuMuc, d.name)]);

const files = tatCaFile(DIST);
const loi = [];

// dist/phan-tich/index.html → /phan-tich/, dist/terms.html → /terms.html
const urlCua = (f) => '/' + relative(DIST, f).split(sep).join('/').replace(/(^|\/)index\.html$/, '$1');
const fileCua = (duong) => {
  const p = join(DIST, decodeURIComponent(duong));
  if (duong.endsWith('/')) return join(p, 'index.html');
  if (existsSync(p)) return p;
  // Cloudflare phát /terms cho terms.html và /phan-tich cho phan-tich/index.html
  return [p + '.html', join(p, 'index.html')].find(existsSync) ?? p;
};

for (const f of files.filter((f) => ['.html', '.js', '.css', '.xml', '.txt'].includes(extname(f)))) {
  const noiDung = readFileSync(f, 'utf8');
  for (const mau of [...CHU_CAM, ...(LA_DASHBOARD(f) ? [] : [DUONG_DAN_MAY])]) {
    const m = noiDung.match(mau);
    if (m) loi.push(`${f}: chữ cấm "${m[0]}"`);
  }
}

const idCua = new Map(); // file html → tập id
const layId = (f) => {
  if (!idCua.has(f)) idCua.set(f, new Set([...readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idCua.get(f);
};

// Dashboard không soát link: trong đó có cả mã JS nén chứa chuỗi kiểu href="…" mà biểu thức chính quy không phân biệt
// được với thẻ HTML thật; dashboard đã được dung_ban_web.py soát trước khi chép vào
for (const f of files.filter((f) => extname(f) === '.html' && !LA_DASHBOARD(f))) {
  const noiDung = readFileSync(f, 'utf8');
  const goc = 'https://x' + urlCua(f);
  for (const [, link] of noiDung.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    if (!link || /^(https?:|mailto:|tel:|data:|javascript:|blob:|\/\/)/i.test(link)) continue;
    const url = new URL(link, goc);
    const dich = fileCua(url.pathname);
    if (!existsSync(dich)) {
      loi.push(`${f}: link hỏng "${link}"`);
      continue;
    }
    // #neo: dashboard tự sinh id bằng JS lúc chạy nên không soát neo trỏ vào dashboard
    const neo = decodeURIComponent(url.hash.slice(1));
    if (neo && extname(dich) === '.html' && !LA_DASHBOARD(dich) && !layId(dich).has(neo)) {
      loi.push(`${f}: link "${link}" trỏ tới #${neo} nhưng ${relative(DIST, dich)} không có id đó`);
    }
  }
}

if (loi.length) {
  console.error(`\nkiem-tra-dist: ${loi.length} lỗi, không đưa bản này lên web\n  ` + loi.join('\n  '));
  process.exit(1);
}
console.log(`kiem-tra-dist: ${files.length} file, không có chữ cấm, link nội bộ đều tới đúng chỗ`);
