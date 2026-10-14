# Fairline Research — website

Mã nguồn của [fairlineresearch.com](https://fairlineresearch.com): trang chủ, thư viện bài phân tích, trang pháp lý.

- **Website tĩnh**: HTML, CSS, JavaScript thuần, không framework, không gói npm. Không có máy chủ chạy code,
  không có cơ sở dữ liệu phía web; trình duyệt chỉ tải các file có sẵn trong repo.
- **Repo công khai**: mọi file đã push, kể cả trong lịch sử git, ai cũng xem được. Không đưa mật khẩu, đường dẫn
  máy hay nhận định nội bộ vào đây.
- **Push lên `main` = công bố ngay**: Cloudflare lấy nhánh `main` và phát ra trang thật, không có bước duyệt ở giữa.

## Cây thư mục

```
index.html                 Trang chủ: bài mới, phương pháp, số liệu thị trường, công cụ định giá, danh mục, bảng giá, form
terms.html, privacy.html   Điều khoản sử dụng, chính sách quyền riêng tư
styles.css                 Toàn bộ giao diện; màu, phông, bo góc là biến trong :root
nav.js                     Nút menu ☰ trên màn hẹp (mọi trang đều nạp)
main.js                    Trang chủ: biểu đồ đầu trang, công cụ định giá, form liên hệ, form đăng ký (mở ứng dụng email)
market-charts.js           Trang chủ: vẽ mục Thị trường và Danh mục từ data/market-data.js
data/market-data.js        Số liệu thị trường — SINH TỰ ĐỘNG bởi scripts/export_chart_data.py
scripts/export_chart_data.py  Đọc cơ sở dữ liệu cổ phiếu (chỉ đọc), tính số liệu, ghi data/market-data.js
scripts/portfolio.py       Các cách phân bổ danh mục (Markowitz, Black-Litterman…) dùng cho script trên
phan-tich/index.html       Thư viện bài phân tích
phan-tich/<mã>/index.html  Bài phân tích từng mã (hiện có mcm, qns)
phan-tich/<mã>/dashboard.html  Dashboard của bài — SINH TỰ ĐỘNG từ dự án Quarto nội bộ (xem bên dưới)
phan-tich/mcm/*.xlsx, *.pdf    File định giá công khai, đã làm sạch ghi chú nội bộ và metadata trước khi đưa vào
```

## Xem thử trên máy

```powershell
python -m http.server 8765
```

Mở http://localhost:8765 (Ctrl+C để tắt). Nên xem qua máy chủ này thay vì bấm đúp file HTML.

## Cập nhật số liệu thị trường

Script đọc cơ sở dữ liệu PostgreSQL trên máy tác giả, ở chế độ chỉ đọc. Kết nối theo biến môi trường chuẩn của
PostgreSQL: `PGHOST`, `PGPORT`, `PGPASSWORD`…; `PGDATABASE` mặc định là `financial_statement`, `PGUSER` mặc định
là `postgres`. Cần các thư viện Python numpy, pandas, psycopg2, scipy. Trong PowerShell, ở thư mục gốc repo:

```powershell
$env:PGPASSWORD = "mật khẩu PostgreSQL"   # chỉ đặt trong cửa sổ đang mở, không ghi vào file nào
python scripts/export_chart_data.py       # ghi lại data/market-data.js
```

Lợi suất yêu cầu 14% và tăng trưởng dài hạn 4% ở đầu script phải khớp giá trị mặc định của thanh trượt trong
công cụ định giá (`index.html`, ô `r` và `g2`). Đổi một bên thì đổi cả bên kia.

## Dashboard

`phan-tich/<mã>/dashboard.html` được sinh từ dự án Quarto nội bộ trên máy tác giả, bằng script `dung_ban_web.py`:
script đọc file `.qmd` nội bộ, ẩn phần không công bố, render rồi chép file kết quả vào `phan-tich/<mã>/`. Trước khi
chép, script soát chuỗi cấm (đường dẫn máy, nhận định nội bộ); thấy là dừng, không chép.

Script và file `.qmd` cố ý để **ngoài repo**: file `.qmd` có nhận định và ghi chú nội bộ không công bố, đưa vào
repo công khai là lộ. Muốn đổi dashboard thì sửa ở dự án Quarto rồi chạy lại script, không sửa file trong repo.

## File KHÔNG sửa tay

- `data/market-data.js`: chạy lại `scripts/export_chart_data.py`.
- `phan-tich/*/dashboard.html`: sửa nguồn ở dự án Quarto rồi chạy lại `dung_ban_web.py`. Vá tay một lần là lần
  render sau mất bản vá.

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

1. Xem thử qua `python -m http.server 8765` ở 4 khổ: **1440, 390, 360, 320px** (DevTools → chế độ thiết bị).
   Không trang nào bị tràn ngang; nút ☰ mở/đóng được; biểu đồ vẽ đủ.
2. Mở Console của trình duyệt: không có lỗi đỏ.
3. Bấm thử các link vừa đổi.
4. `git status` và `git diff`: chỉ đúng những file định đổi; không có file nội bộ, mật khẩu, đường dẫn máy.
5. Nhớ: push lên `main` là khách thấy ngay.
