"""Sinh ảnh tĩnh của site từ public/favicon.svg và public/styles.css:
favicon.ico (tab trình duyệt), apple-touch-icon.png (biểu tượng trên màn hình điện thoại),
og.png (ảnh hiện khi dán link lên Zalo, Facebook…).

Chạy lại sau khi đổi logo hoặc bảng màu:  python scripts/tao_anh.py   (cần playwright, pillow)
"""
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

PUBLIC = Path(__file__).resolve().parent.parent / "public"
SVG = (PUBLIC / "favicon.svg").read_text(encoding="utf-8")
CSS = (PUBLIC / "styles.css").read_text(encoding="utf-8")
FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:'
         'ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&display=swap" rel="stylesheet">')

# Ảnh chia sẻ: dựng lại đầu trang chủ ở khổ 1200×630 bằng chính styles.css
OG = f"""<!doctype html><html lang="vi"><head><meta charset="utf-8">{FONTS}<style>{CSS}
body {{ margin: 0; }}
.og {{ width: 1200px; height: 630px; padding: 60px 76px 56px; display: flex; flex-direction: column;
       justify-content: space-between; color: #fff; }}
.og .logo__text {{ font-size: 2rem; }}
.og .logo__text span {{ font-size: 1.15rem; }}
.og h1 {{ font-size: 82px; max-width: 13.5em; }}
.og .eyebrow {{ font-size: 1rem; margin-bottom: 22px; }}
.og__chan {{ font-size: 1.25rem; color: rgba(255, 255, 255, .72); letter-spacing: .02em; }}
</style></head><body>
<div class="hero og">
  <span class="logo" style="display:flex;align-items:center;gap:14px">
    <span style="width:52px;height:52px">{SVG.replace('width="32" height="32"', 'width="52" height="52"')}</span>
    <span class="logo__text">Fairline <span>Research</span></span>
  </span>
  <div>
    <p class="eyebrow">Nghiên cứu định giá độc lập · HOSE · HNX · UPCoM</p>
    <h1>Biết cổ phiếu đáng giá bao nhiêu <em>trước khi</em> mua.</h1>
  </div>
  <p class="og__chan">fairlineresearch.com</p>
</div>
</body></html>"""


def ve_bieu_tuong(pg, canh: int, nen: str | None) -> Image.Image:
    svg = SVG.replace('width="32" height="32"', f'width="{canh}" height="{canh}"')
    pg.set_viewport_size({"width": canh, "height": canh})
    pg.set_content(f'<body style="margin:0;background:{nen or "transparent"}">{svg}</body>')
    return Image.open(BytesIO(pg.screenshot(omit_background=nen is None)))


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.set_content(OG, wait_until="networkidle")
    pg.evaluate("document.fonts.ready")
    Image.open(BytesIO(pg.screenshot())).convert("RGB").save(PUBLIC / "og.png", optimize=True)

    ve_bieu_tuong(pg, 64, None).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # iOS tự bo góc và tô đen phần trong suốt, nên biểu tượng điện thoại cần nền kín
    ve_bieu_tuong(pg, 180, "#fff").convert("RGB").save(PUBLIC / "apple-touch-icon.png", optimize=True)
    b.close()

for f in ("og.png", "favicon.ico", "apple-touch-icon.png"):
    print(f"{f}: {(PUBLIC / f).stat().st_size / 1024:.0f} KB")
