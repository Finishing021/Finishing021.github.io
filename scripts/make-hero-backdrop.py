"""把站主头像处理成首屏封面用的背景资源。

设计取舍：
  * 首屏要求「轻微模糊，能看清头像轮廓」，所以**不再预烘模糊**——
    预烘的模糊量会随视口缩放而失真，改成由 CSS filter: blur() 精确控制。
  * 这里只做两件事：格式转 WebP 压体积、限制像素尺寸（1080px 源图铺满
    1440 视口已是 1.33 倍放大，再大没有意义）。

用法：
  python scripts/make-hero-backdrop.py [源图路径] [输出路径]
"""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "assets-source" / "avatar-original.jpg"
DEFAULT_OUT = ROOT / "public" / "hero" / "avatar.webp"

# 铺满 1440x900 视口需要约 1440px 宽（方形图按 cover 裁切），但成品还要经
# CSS blur(6px)，细节会被抹平。实测 864px / q78 放大到 1440 再模糊后，
# 与 1080px / q84 的逐像素平均差异仅 0.60/255，体积却从 99.5KB 降到 60KB。
MAX_EDGE = 864
QUALITY = 78

src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
out = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT

if not src.exists():
    raise SystemExit(f"找不到源图：{src}")

source = Image.open(src).convert("RGB")
print(f"源图 {src.name}  {source.size}  {src.stat().st_size / 1024:.1f} KB")

image = source
if max(source.size) > MAX_EDGE:
    scale = MAX_EDGE / max(source.size)
    image = source.resize(
        (round(source.width * scale), round(source.height * scale)), Image.LANCZOS
    )

out.parent.mkdir(parents=True, exist_ok=True)
image.save(out, format="WEBP", quality=QUALITY, method=6)

print(f"输出 {out.relative_to(ROOT)}  {image.size}  {out.stat().st_size / 1024:.1f} KB")
print(f"体积变化 {src.stat().st_size / 1024:.1f} KB -> {out.stat().st_size / 1024:.1f} KB")

# 采样确认画面内容还在（模糊改由 CSS 负责，这里应该保留全部细节）
rgb = image.convert("RGB")
w, h = rgb.size
for name, box in {
    "左上": (0, 0, w // 3, h // 3),
    "中心": (w // 3, h // 3, w * 2 // 3, h * 2 // 3),
    "右下": (w * 2 // 3, h * 2 // 3, w, h),
}.items():
    print(f"  {name}: {rgb.crop(box).resize((1, 1)).getpixel((0, 0))}")

diffs = []
for y in range(0, h, 7):
    for x in range(0, w - 1, 7):
        a = rgb.getpixel((x, y))
        b = rgb.getpixel((x + 1, y))
        diffs.append(max(abs(p - q) for p, q in zip(a, b)))
print(f"  相邻像素最大跳变: {max(diffs)}  （应保持较大值，说明细节未被抹掉）")
