# Fairline Research — website

Mã nguồn của [fairlineresearch.com](https://fairlineresearch.com): trang chủ, thư viện bài phân tích, trang pháp lý.

- **Website tĩnh dựng bằng [Astro](https://astro.build)**: Astro chỉ chạy lúc build, ghép khung chung (đầu trang,
  menu, chân trang) với nội dung từng trang rồi ra HTML tĩnh trong `dist/`. Trình duyệt nhận HTML, CSS, JavaScript
  thuần như trước; Astro không gửi thêm JavaScript nào. Không có máy chủ chạy code, không có cơ sở dữ liệu phía web.
- **Repo công khai**: mọi file đã push, kể cả trong lịch sử git, ai cũng xem được. Không đưa mật khẩu, đường dẫn
  máy hay nhận định nội bộ vào đây. Ghi chú cho người sửa code viết bằng `{/* */}` trong file `.astro` (không lên
  web), không dùng `<!-- -->` (lên web, ai xem nguồn trang cũng đọc được).
- **Push lên `main` = công bố ngay**: Cloudflare Workers Builds lấy nhánh `main`, chạy `npm run build` rồi phát
  thư mục `dist/` (cấu hình trong `wrangler.jsonc`). Chỉ những gì nằm trong `dist/` lên web; README, `scripts/`,
  `src/` thì không.

## Cây thư mục

```
src/layouts/Base.astro     Khung chung mọi trang: <head>, menu, chân trang. Sửa ở đây là đổi cả site
src/pages/index.astro      Trang chủ: bài mới, phương pháp, số liệu thị trường, công cụ định giá, danh mục, bảng giá, form
src/pages/terms.astro, privacy.astro   Điều khoản sử dụng, chính sách quyền riêng tư (ra terms.html, privacy.html)
src/pages/phan-tich/index.astro        Thư viện bài phân tích
src/pages/phan-tich/<mã>/index.astro   Bài phân tích từng mã (hiện có mcm, qns)
src/pages/404.astro        Trang báo không tìm thấy (Cloudflare trả kèm mã 404)
src/pages/sitemap.xml.ts   Sinh sitemap.xml từ danh sách trang, tự có trang mới
src/data/bai-viet.yaml     Thông tin và số định giá của từng bài: SỬA SỐ Ở ĐÂY (xem mục bên dưới)
src/content.config.ts      Kiểm kiểu dữ liệu của bai-viet.yaml lúc build
src/components/TheBai.astro  Thẻ bài ở trang chủ và thư viện
src/lib/bai-viet.ts        Đọc bai-viet.yaml, định dạng số và ngày kiểu Việt Nam
public/                    Chép nguyên vào dist/, giữ nguyên đường dẫn:
  styles.css               Toàn bộ giao diện; màu, phông, bo góc là biến trong :root
  nav.js                   Nút menu ☰ trên màn hẹp (mọi trang đều nạp)
  main.js                  Trang chủ: biểu đồ đầu trang, công cụ định giá, form liên hệ, form đăng ký (mở ứng dụng email)
  market-charts.js         Trang chủ: vẽ mục Thị trường và Danh mục từ data/market-data.js
  data/market-data.js      Số liệu thị trường — SINH TỰ ĐỘNG bởi scripts/export_chart_data.py
  phan-tich/<mã>/dashboard.html  Dashboard của bài — SINH TỰ ĐỘNG từ dự án Quarto nội bộ (xem bên dưới)
  phan-tich/mcm/*.xlsx, *.pdf    File định giá công khai, đã làm sạch ghi chú nội bộ và metadata trước khi đưa vào
  favicon.svg              Biểu tượng tab trình duyệt (cùng hình logo)
  favicon.ico, apple-touch-icon.png, og.png   SINH TỰ ĐỘNG bởi scripts/tao_anh.py
  robots.txt               Cho máy tìm kiếm biết sitemap ở đâu
  _headers                 Header bảo mật Cloudflare gắn vào mọi trang (file này không bị phát ra web)
scripts/export_chart_data.py  Đọc cơ sở dữ liệu cổ phiếu (chỉ đọc), tính số liệu, ghi public/data/market-data.js
scripts/portfolio.py       Các cách phân bổ danh mục (Markowitz, Black-Litterman…) dùng cho script trên
scripts/kiem-tra-dist.mjs  Chạy sau mỗi lần build: chữ cấm, link hỏng → build thất bại, không lên web
scripts/tao_anh.py         Sinh favicon.ico, apple-touch-icon.png và og.png (ảnh khi chia sẻ link)
astro.config.mjs           Cấu hình Astro (giữ URL dạng terms.html, không nén HTML)
wrangler.jsonc             Cấu hình Cloudflare: phát thư mục dist/
package.json, package-lock.json   Phiên bản Astro và wrangler, ghim cứng
```

Trong file `.astro`, link và file dùng đường dẫn tuyệt đối (`/styles.css`, `/#methods`), script nạp bằng
`<script is:inline src="…">` để Astro để nguyên, không đóng gói lại.

## Cài lần đầu

Cần Node.js 24 (ghi trong `.node-version`). Ở thư mục gốc repo:

```powershell
npm ci
```

## Xem thử trên máy

```powershell
npm run dev        # http://localhost:4321 — sửa file là trang tự tải lại
npm run preview    # build rồi chạy giả lập Cloudflare ở http://localhost:8787 — giống trang thật nhất
```

Ctrl+C để tắt.

## Sửa số định giá, thêm bài mới

Mọi con số và chữ trên thẻ bài nằm ở `src/data/bai-viet.yaml`. Sửa ở đó là trang chủ, thư viện `/phan-tich/` và
trang bài cùng đổi. Số tiền ghi không có dấu chấm (`26694`), ngày ghi `2026-10-15`; gõ sai kiểu thì `npm run build`
báo đúng dòng sai và dừng.

Thêm bài mới: thêm một mục vào `bai-viet.yaml`, tạo `src/pages/phan-tich/<mã>/index.astro` (chép trang có sẵn rồi
sửa nội dung), đưa dashboard/Excel vào `public/phan-tich/<mã>/`. Thẻ bài ở trang chủ, thư viện và sitemap tự có.

## Ảnh chia sẻ link, favicon

Sau khi đổi logo (`public/favicon.svg`) hoặc bảng màu (`public/styles.css`), sinh lại ảnh:

```powershell
python scripts/tao_anh.py    # cần playwright và pillow
```

## Cập nhật số liệu thị trường

Script đọc cơ sở dữ liệu PostgreSQL trên máy tác giả, ở chế độ chỉ đọc. Kết nối theo biến môi trường chuẩn của
PostgreSQL: `PGHOST`, `PGPORT`, `PGPASSWORD`…; `PGDATABASE` mặc định là `financial_statement`, `PGUSER` mặc định
là `postgres`. Cần các thư viện Python numpy, pandas, psycopg2, scipy. Trong PowerShell, ở thư mục gốc repo:

```powershell
$env:PGPASSWORD = "mật khẩu PostgreSQL"   # chỉ đặt trong cửa sổ đang mở, không ghi vào file nào
python scripts/export_chart_data.py       # ghi lại public/data/market-data.js
```

Lợi suất yêu cầu 14% và tăng trưởng dài hạn 4% ở đầu script phải khớp giá trị mặc định của thanh trượt trong
công cụ định giá (`src/pages/index.astro`, ô `r` và `g2`). Đổi một bên thì đổi cả bên kia.

## Dashboard

`public/phan-tich/<mã>/dashboard.html` được sinh từ dự án Quarto nội bộ trên máy tác giả, bằng script
`dung_ban_web.py`: script đọc file `.qmd` nội bộ, ẩn phần không công bố, render rồi chép file kết quả vào
`public/phan-tich/<mã>/`. Trước khi chép, script soát chuỗi cấm (đường dẫn máy, nhận định nội bộ); thấy là dừng,
không chép.

Sau khi chép, `dung_ban_web.py` gọi `tach_thu_vien.py` (cũng ở dự án Quarto): Plotly, CSS, font và script dùng
chung được tách ra `public/lib/` với tên có dấu vân tay nội dung, dashboard chỉ còn ~1 MB và mọi dashboard dùng chung
một bản thư viện. Vì vậy dashboard **không mở được bằng file://**, xem thử qua `npm run dev` hoặc `npm run preview`.
`npm run build` báo lỗi nếu dashboard nào chưa tách hoặc thiếu thư viện.

Script và file `.qmd` cố ý để **ngoài repo**: file `.qmd` có nhận định và ghi chú nội bộ không công bố, đưa vào
repo công khai là lộ. Muốn đổi dashboard thì sửa ở dự án Quarto rồi chạy lại script, không sửa file trong repo.

## File KHÔNG sửa tay

- `public/data/market-data.js`: chạy lại `scripts/export_chart_data.py`.
- `public/phan-tich/*/dashboard.html`: sửa nguồn ở dự án Quarto rồi chạy lại `dung_ban_web.py`. Vá tay một lần là
  lần render sau mất bản vá.
- `public/lib/*`: do `tach_thu_vien.py` sinh. Không sửa đè (trình duyệt giữ 1 năm theo tên file); file nào
  `npm run build` báo "không dashboard nào dùng" thì xóa được.
- `public/favicon.ico`, `public/apple-touch-icon.png`, `public/og.png`: chạy lại `scripts/tao_anh.py`.
- `dist/`: kết quả build, không đưa lên git.

## Điểm ngắt màn hình

| Độ rộng | Ở đâu | Đổi gì |
|---|---|---|
| ≤ 1200px | styles.css | Hàng liên kết menu ẩn, thay bằng nút ☰ (nav.js) |
| ≤ 1080px | styles.css | Lưới biểu đồ và cột bên của trang bài xuống một cột |
| ≤ 960px | styles.css | Đầu trang, công cụ định giá, liên hệ, đăng ký, hỏi đáp, phương pháp, bảng giá, thẻ bài thành một cột |
| ≤ 600px | styles.css | Khổ điện thoại: thu khoảng cách, menu gọn, ẩn chữ “Research” ở logo |
| ≤ 400px | styles.css | Bảng trong trang bài thu cỡ chữ và lề ô |
| ≤ 380px | styles.css | Ẩn bớt nút trên menu: chữ “miễn phí” của nút đăng ký, nút “← Trang chủ” ở trang pháp lý |
| < 560px | market-charts.js | Biểu đồ thấp hơn, thưa nhãn trục (tính theo độ rộng khung biểu đồ, không phải màn hình) |

Dashboard có điểm ngắt riêng (560px) nằm trong phần giao diện của dự án Quarto.

## Trước khi push

1. `npm run build` chạy không lỗi (đã gồm bước soát chữ cấm và link hỏng).
2. Xem thử qua `npm run preview` ở 4 khổ: **1440, 390, 360, 320px** (DevTools → chế độ thiết bị).
   Không trang nào bị tràn ngang; nút ☰ mở/đóng được; biểu đồ vẽ đủ.
3. Mở Console của trình duyệt: không có lỗi đỏ.
4. Bấm thử các link vừa đổi.
5. `git status` và `git diff`: chỉ đúng những file định đổi; không có file nội bộ, mật khẩu, đường dẫn máy.
6. Nhớ: push lên `main` là khách thấy ngay.
