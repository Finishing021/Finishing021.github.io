"""把照片压成网页可用的尺寸，并按需生成 TS 清单。

原本只服务成长档案（叫 optimize-diary.py）。摄影墙需要「缩略图 + 全尺寸」两档，
于是泛化成通用脚本 —— 两条内容线共用同一套 EXIF 摆正与压缩逻辑，
不重复维护参数、也不会有两条管线各自漂移的问题。

做四件事：
  1. 按 EXIF 摆正方向 —— 手机竖拍的照片常带旋转标记，不处理会横过来；
  2. 长边压到上限 —— 手机直出 3~5 MB，直接丢进 public/ 会让页面卡死；
  3. 重新编码成渐进式 JPEG —— 先出模糊轮廓再逐步清晰；
  4. （可选）额外输出缩略图、从 EXIF 读拍摄日期、生成 TS 清单。

用法：
  python scripts/optimize-images.py                  # 默认行为，与旧 diary 脚本一致
  python scripts/optimize-images.py --in-place       # 就地重压 public/diary
  python scripts/optimize-images.py 源目录 输出目录

  # 摄影墙：双档 + 生成清单
  python scripts/optimize-images.py assets-source/photos public/photos \\
      --max-edge 2000 --thumb --manifest src/content/photos.generated.ts

⚠️ 文件名规范（读屏的 alt 直接取自文件名，务必注意）：
  - **只用英文、数字、连字符、下划线。不要用中文文件名。**
    中文文件名在 git 输出、URL 百分号编码、跨平台传输上都是无谓的噪音。
  - **描述要有意义**，`.jpg` 前的部分会被当作 alt 念给读屏用户：
        ✅ yangzhou-rain.jpg        -> alt "yangzhou rain"
        ✅ dorm-window-cloud-02.jpg -> alt "dorm window cloud 02"
        ❌ photo_01.jpg             -> alt 退化为「摄影作品」，等于没说
  - **日期不要写进文件名**，脚本从 EXIF 读，比手写更准。
    只有没有 EXIF 的图（截图、二次导出）才用 YYYY-MM-DD_ 前缀覆盖。
  - 想要中文 alt，在源目录放可选的 alt.json：{"photo_01.jpg": "宿舍窗外的云"}

日期解析优先级：EXIF DateTimeOriginal -> EXIF DateTime -> 文件名前缀 -> 文件修改时间。
兜底到修改时间时脚本会警告 —— 因为文件一拷贝时间就失真了。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent

MAX_EDGE = 1600
THUMB_EDGE = 640
QUALITY = 82
# 已经小于这个体积就认为压过了，跳过，避免反复重编码导致画质累积劣化
SKIP_BELOW_KB = 500

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}

# EXIF 标签号
EXIF_IFD = 0x8769  # Exif 子 IFD —— DateTimeOriginal 按规范住在这里面
TAG_DATETIME_ORIGINAL = 36867  # 拍摄时间，手机/相机直出都有
TAG_DATETIME_DIGITIZED = 36868  # 数字化时间，没有 36867 时的次选
TAG_DATETIME = 306  # 文件修改时间，部分导出工具只写这个

# 日期前缀。文档里写的是 YYYY-MM-DD_描述，但人手改名时 `-` 和空格一样常见，
# 与其让它们悄无声息地退回 mtime，不如一并认了。
# 结尾用前瞻而不是直接吃掉分隔符，这样 sub() 之后描述部分还留着。
DATE_PREFIX = re.compile(r"^(\d{4})-(\d{2})-(\d{2})(?=[_\-\s]|$)")
SEQ_PREFIX = re.compile(r"^\d{2}_")

# 这些词单独出现（或后面只跟数字）时没有信息量，不配当 alt
MEANINGLESS_WORDS = {
    "photo", "photos", "img", "image", "images",
    "pic", "pics", "picture", "pictures", "dsc", "dscf", "snap",
}

ALT_FALLBACK = "摄影作品"
ALT_MAX_LEN = 120
THUMB_SUFFIX = "_thumb"

# 输出格式：webp 体积小、解码快、不渐进（不会出现「先糊后清」）。
# 命令行 --format 可改回 jpeg（老设备兜底时）。
OUTPUT_FORMAT = "webp"
# 体积预算：超过就自动降质直到达标，避免手机端加载几 MB 原图。
# 全尺寸上限压到 100KB：手机端超过 100KB 的图片会出现「从上到下渐显」的卡顿，
# 100KB 以内基本能一次性解码、点开瞬间清晰。
FULL_MAX_KB = 100   # 全尺寸图（灯箱 / 轮播用）上限
THUMB_MAX_KB = 70   # 缩略图（网格用）上限，同样收紧，给手机让出带宽
QUALITY_FLOOR = 45  # 降质下限，避免画质崩塌


# ---------------------------------------------------------------- 参数

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="压缩图片，可选生成缩略图与 TS 清单",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("source", nargs="?", help="源目录，默认 assets-source/diary")
    parser.add_argument("target", nargs="?", help="目标目录，默认 public/diary")
    parser.add_argument("--in-place", action="store_true", help="就地优化目标目录里的图")
    parser.add_argument("--max-edge", type=int, default=MAX_EDGE, help=f"长边上限，默认 {MAX_EDGE}")
    parser.add_argument("--thumb", action="store_true", help=f"额外输出 <名字>{THUMB_SUFFIX}.jpg")
    parser.add_argument("--thumb-edge", type=int, default=THUMB_EDGE, help=f"缩略图长边，默认 {THUMB_EDGE}")
    parser.add_argument("--manifest", metavar="PATH", help="生成 TS 清单到该路径")
    parser.add_argument("--quality", type=int, default=QUALITY, help=f"起始质量，默认 {QUALITY}")
    parser.add_argument("--format", choices=("webp", "jpeg"), default=OUTPUT_FORMAT,
                        help=f"输出格式，默认 {OUTPUT_FORMAT}（webp 更小更快、不渐进）")

    # ---- 清单的命名 / 排序（为作品集这类「非照片」内容线准备）----
    # 默认值就是摄影墙的行为，所以不传这些参数时输出与从前逐字一致。
    parser.add_argument("--manifest-export", default="photos", metavar="NAME",
                        help="清单里导出的数组名，默认 photos")
    parser.add_argument("--manifest-type", default="Photo", metavar="NAME",
                        help="清单里声明的接口名，默认 Photo")
    parser.add_argument("--manifest-command", default="npm run photos:build", metavar="TEXT",
                        help="写进清单头部的「重新生成」命令提示")
    parser.add_argument("--manifest-order", choices=("desc", "asc"), default="desc",
                        help="清单排序。照片按日期倒序（新在前）；课件这类有序内容用 asc（第 1 页在前）")
    parser.add_argument("--no-date-warning", action="store_true",
                        help="不提示「日期靠 mtime 兜底」。课件截图没有 EXIF，这个提示只是噪音")
    return parser


# ---------------------------------------------------------------- 采集

def collect(directory: Path) -> list[Path]:
    """收集目录下的图片。跳过隐藏文件、_ 开头的中间产物、以及缩略图产物本身。"""
    if not directory.is_dir():
        return []
    return sorted(
        path
        for path in directory.iterdir()
        if path.is_file()
        and path.suffix.lower() in IMAGE_SUFFIXES
        and not path.stem.startswith((".", "_"))
        and not path.stem.endswith(THUMB_SUFFIX)
    )


def find_stem_collisions(files: list[Path]) -> dict[str, list[str]]:
    """同名不同扩展名会在输出目录里互相覆盖，必须先拦下来。"""
    grouped: dict[str, list[str]] = {}
    for path in files:
        grouped.setdefault(path.stem, []).append(path.name)
    return {stem: names for stem, names in grouped.items() if len(names) > 1}


def load_alt_overrides(source_dir: Path) -> dict[str, str]:
    """可选的 alt.json。没有它不是错误 —— 默认完全靠文件名推导。"""
    path = source_dir / "alt.json"
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"⚠️  alt.json 读不动（{error}），本次忽略，改为从文件名推导")
        print()
        return {}
    if not isinstance(data, dict):
        print("⚠️  alt.json 顶层不是对象，本次忽略")
        print()
        return {}
    return {str(key): str(value) for key, value in data.items()}


def load_caption_overrides(source_dir: Path) -> dict[str, str]:
    """可选的中文图注 captions.json。没有它不是错误 —— 图注由 AI 看图后人工补。

    键是源文件名（含扩展名），值是「10 字以内、文艺、有画面感」的中文短句，
    会原样写进清单的 caption 字段，组件在照片正下方渲染。空串表示未填。
    """
    path = source_dir / "captions.json"
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"⚠️  captions.json 读不动（{error}），本次忽略")
        print()
        return {}
    if not isinstance(data, dict):
        print("⚠️  captions.json 顶层不是对象，本次忽略")
        print()
        return {}
    return {str(key): str(value) for key, value in data.items()}


# ---------------------------------------------------------------- 元数据

def read_exif_datetime(image: Image.Image) -> datetime | None:
    """读拍摄时间。必须在 exif_transpose 之前调用，转置后的副本不保证还带 EXIF。

    这里有两个坑，都踩过：

    1. **DateTimeOriginal 不在 0th IFD 里。** 按 EXIF 规范，36867 住在
       Exif 子 IFD（0x8769）—— 真实相机和手机都写在那儿。而 Pillow 的
       `exif.get(36867)` 只查 0th IFD，于是对着一张真照片返回 None，
       悄悄退回文件修改时间：页面照渲染，排序全错。必须显式下钻
       `exif.get_ifd(0x8769)`。
    2. **但有些导出工具图省事**，把时间塞进 0th IFD 的 DateTime(306)，
       甚至塞进 0th IFD 的 36867。所以两张表都得看。

    优先级：拍摄时间（Exif 子 IFD 优先于 0th）-> 数字化时间 -> 文件时间。
    """
    try:
        exif = image.getexif()
    except Exception:
        return None

    candidates: list[object] = []
    for tag in (TAG_DATETIME_ORIGINAL, TAG_DATETIME_DIGITIZED):
        # Exif 子 IFD 里的更权威，排在前面
        try:
            candidates.append(exif.get_ifd(EXIF_IFD).get(tag))
        except Exception:
            pass
        candidates.append(exif.get(tag))
    candidates.append(exif.get(TAG_DATETIME))

    for raw in candidates:
        if not raw:
            continue
        # 相机固件常留一串尾部 NUL，不 strip 掉 strptime 会失败
        text = str(raw).strip().strip("\x00").strip()
        for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y:%m:%d"):
            try:
                return datetime.strptime(text, fmt)
            except ValueError:
                continue
    return None


def match_date_prefix(stem: str) -> str | None:
    """文件名开头的 YYYY-MM-DD 前缀，合法才返回归一化日期，否则 None。

    必须校验：放宽分隔符之后，`2019-2020-review.jpg` 这种年份区间
    也会落进正则（2019 年 20 月 20 日），不校验就会生成一个假日期。
    """
    match = DATE_PREFIX.match(stem)
    if not match:
        return None
    try:
        day = datetime(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    except ValueError:
        return None
    return day.strftime("%Y-%m-%d")


def resolve_date(path: Path, taken: datetime | None) -> tuple[str, str]:
    """返回 (YYYY-MM-DD, 来源)。来源要暴露出来，好让「靠兜底」这件事在开发期可见。"""
    if taken:
        return taken.strftime("%Y-%m-%d"), "exif"

    from_name = match_date_prefix(path.stem)
    if from_name:
        return from_name, "filename"

    fallback = datetime.fromtimestamp(path.stat().st_mtime)
    return fallback.strftime("%Y-%m-%d"), "mtime"


def derive_alt(path: Path, overrides: dict[str, str]) -> str:
    """从文件名推导 alt。推不出有信息量的结果时退化为通用描述。"""
    if path.name in overrides:
        return overrides[path.name][:ALT_MAX_LEN]

    stem = path.stem
    # 只在日期真的合法时才剥前缀，否则会连 2019-2020 这类描述一起吃掉
    if match_date_prefix(stem):
        stem = DATE_PREFIX.sub("", stem)
    text = SEQ_PREFIX.sub("", stem)
    text = re.sub(r"\s+", " ", text.replace("-", " ").replace("_", " ")).strip()

    if not text:
        return ALT_FALLBACK

    tokens = text.split(" ")
    if all(token.isdigit() for token in tokens):
        return ALT_FALLBACK
    # photo_01 / img-3 这类：首个词没信息量，后面全是数字
    if tokens[0].lower() in MEANINGLESS_WORDS and all(token.isdigit() for token in tokens[1:]):
        return ALT_FALLBACK

    return text[:ALT_MAX_LEN]


# ---------------------------------------------------------------- 图像处理

def to_rgb(image: Image.Image) -> Image.Image:
    return image if image.mode == "RGB" else image.convert("RGB")


def downscale(image: Image.Image, max_edge: int) -> Image.Image:
    longest = max(image.size)
    if longest <= max_edge:
        return image
    scale = max_edge / longest
    return image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.LANCZOS,
    )


def save_image(image: Image.Image, target: Path, quality: int, *, max_kb: int = 0) -> int:
    """按 target 后缀选编码器写出。

    - webp：解码快、体积小、天然不渐进（不会「先糊后清」）；
    - jpeg：保留渐进式，作为老设备兜底。
    若给了 max_kb 且产物超限，自动降质（每次 -6）直到达标或触到 QUALITY_FLOOR，
    返回实际使用的质量值，供缩略图沿用，避免同一张图两张质量差太多。
    """
    ext = target.suffix.lower().lstrip(".")
    fmt = "WEBP" if ext == "webp" else "JPEG"
    target.parent.mkdir(parents=True, exist_ok=True)
    q = quality
    while True:
        if fmt == "WEBP":
            image.save(target, format="WEBP", quality=q, method=4)
        else:
            image.save(target, format="JPEG", quality=q, optimize=True, progressive=True)
        if max_kb and target.stat().st_size > max_kb * 1024 and q > QUALITY_FLOOR:
            q -= 6
            continue
        break
    return q


def process(
    source: Path,
    target: Path,
    thumb_target: Path | None,
    *,
    max_edge: int,
    thumb_edge: int,
    quality: int,
) -> tuple[tuple[int, int], tuple[int, int] | None, datetime | None]:
    with Image.open(source) as opened:
        # EXIF 要在转置前读，转置后的副本不保证保留全部标签
        taken = read_exif_datetime(opened)
        image = to_rgb(ImageOps.exif_transpose(opened))

        # 体积预算兜底：先按 max_edge 压，若仍超 200KB（已触质量下限），
        # 逐级降长边重试，确保手机端不会加载超限大图。
        edge = max_edge
        while True:
            full = downscale(image, edge)
            used_quality = save_image(full, target, quality, max_kb=FULL_MAX_KB)
            # 体积兜底下限 760px：再小的图在手机灯箱里也够清晰，但能确保严格 ≤100KB。
            if target.stat().st_size <= FULL_MAX_KB * 1024 or edge <= 760:
                break
            edge = int(edge * 0.8)

        thumb_size = None
        if thumb_target is not None:
            thumb = downscale(image, thumb_edge)
            save_image(thumb, thumb_target, used_quality, max_kb=THUMB_MAX_KB)
            thumb_size = thumb.size

        return full.size, thumb_size, taken


# ---------------------------------------------------------------- 清单

def url_for(target_dir: Path, name: str) -> str:
    """把物理路径换成运行时 URL。产物在 public/ 下时取其相对路径。"""
    public_root = (ROOT / "public").resolve()
    try:
        relative = target_dir.resolve().relative_to(public_root)
        return f"/{relative.as_posix()}/{name}"
    except ValueError:
        return f"/{target_dir.name}/{name}"


def ts_str(value: str) -> str:
    """输出符合仓库风格的 TS 字符串：优先单引号。

    仓库里所有 TS 都是单引号 + 无分号，生成的文件如果满屏双引号，
    会让人以为它不是这个项目的一部分。含单引号或反斜杠时退回 JSON 的双引号，
    免得为了风格把转义写错。
    """
    if "'" in value or "\\" in value:
        return json.dumps(value, ensure_ascii=False)
    return f"'{value}'"


def _manifest_style(args) -> dict:
    """把命令行里的清单命名选项收成一组关键字参数，两个调用点共用。"""
    return {
        "export_name": args.manifest_export,
        "type_name": args.manifest_type,
        "command": args.manifest_command,
    }


def write_manifest(
    manifest_path: Path,
    entries: list[dict],
    *,
    export_name: str = "photos",
    type_name: str = "Photo",
    command: str = "npm run photos:build",
) -> None:
    lines = [
        "// 本文件由 scripts/optimize-images.py 自动生成，请勿手动修改。",
        f"// 重新生成：{command}",
        "",
        f"export interface {type_name} {{",
        "  /** 全尺寸图 URL，灯箱用 */",
        "  src: string",
        "  /** 缩略图 URL，网格用 */",
        "  thumb: string",
        "  /** 缩略图宽高比 = 宽 / 高，用于占位、避免布局抖动 */",
        "  aspect: number",
        "  /** 拍摄日期 YYYY-MM-DD */",
        "  date: string",
        "  /** 读屏描述，由文件名推导（或 alt.json 覆盖） */",
        "  alt: string",
        "  /** 中文图注，由 AI 看图生成（captions.json 覆盖）；空串表示未填 */",
        "  caption: string",
        "  /** 源文件名，排查问题时用 */",
        "  file: string",
        "  /** 日期来源；mtime 表示靠兜底，建议人工确认 */",
        "  dateSource: 'exif' | 'filename' | 'mtime'",
        "}",
        "",
        "/** 排序见 --manifest-order：照片是新到旧，课件这类有序内容用 asc（第 1 页在前） */",
        f"export const {export_name}: {type_name}[] = [",
    ]

    for entry in entries:
        lines += [
            "  {",
            f"    src: {ts_str(entry['src'])},",
            f"    thumb: {ts_str(entry['thumb'])},",
            f"    aspect: {entry['aspect']},",
            f"    date: {ts_str(entry['date'])},",
            f"    alt: {ts_str(entry['alt'])},",
            f"    caption: {ts_str(entry.get('caption', ''))},",
            f"    file: {ts_str(entry['file'])},",
            f"    dateSource: {ts_str(entry['dateSource'])},",
            "  },",
        ]

    lines += ["]", ""]

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------- 主流程

def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.in_place and (args.thumb or args.manifest):
        print("--in-place 不能与 --thumb / --manifest 一起用。")
        print("  就地重压时源目录就是产物目录，再生成缩略图会污染 public/diary/，")
        print("  而且清单也读不出有意义的源文件名。")
        return 2

    source_dir = Path(args.source) if args.source else (
        ROOT / "public" / "diary" if args.in_place else ROOT / "assets-source" / "diary"
    )
    target_dir = Path(args.target) if args.target else (ROOT / "public" / "diary")

    if not source_dir.is_absolute():
        source_dir = ROOT / source_dir
    if not target_dir.is_absolute():
        target_dir = ROOT / target_dir

    files = collect(source_dir)

    if not files:
        # 要生成清单时，空源目录是一个合法状态（站主清空了所有照片），
        # 此时必须写出空清单 —— 否则清单会残留一批指向已删文件的死条目，
        # 页面就会去加载不存在的图。
        if args.manifest:
            manifest_path = Path(args.manifest)
            if not manifest_path.is_absolute():
                manifest_path = ROOT / manifest_path
            write_manifest(manifest_path, [], **_manifest_style(args))
            print(f"{source_dir} 里没有图片，已写出空清单。")
            print(f"  {manifest_path.relative_to(ROOT).as_posix()}")
            print("  摄影墙会显示空态，这是预期行为。")
            return 0

        print(f"在 {source_dir} 里没找到任何图片")
        print()
        print(f"请把照片放进：{source_dir}")
        print("建议命名：yangzhou-rain.jpg（英文短词，日期由 EXIF 自动读取）")
        return 1

    collisions = find_stem_collisions(files)
    if collisions:
        print("发现同名不同扩展名的文件，输出时会互相覆盖：")
        for stem, names in sorted(collisions.items()):
            print(f"  {stem}: {', '.join(names)}")
        print()
        print("请改名或删除其中一个后重试。")
        return 1

    overrides = load_alt_overrides(source_dir)
    captions = load_caption_overrides(source_dir)

    print(f"{source_dir.name}/ -> {target_dir.name}/   共 {len(files)} 个文件")
    print(f"长边 {args.max_edge}  q{args.quality}"
          + (f"  缩略图长边 {args.thumb_edge}" if args.thumb else ""))
    print()

    before_total = 0
    after_total = 0
    skipped: list[str] = []
    entries: list[dict] = []
    used_overrides: set[str] = set()
    mtime_files: list[str] = []
    generic_alt: list[str] = []

    for path in files:
        ext = ".webp" if args.format == "webp" else ".jpg"
        target = target_dir / f"{path.stem}{ext}"
        thumb_target = target_dir / f"{path.stem}{THUMB_SUFFIX}{ext}" if args.thumb else None
        before = path.stat().st_size
        before_total += before

        if args.in_place and path == target and before <= SKIP_BELOW_KB * 1024:
            skipped.append(path.name)
            after_total += before
            print(f"  {path.name:<28} 已是压缩态，跳过")
            continue

        full_size, thumb_size, taken = process(
            path,
            target,
            thumb_target,
            max_edge=args.max_edge,
            thumb_edge=args.thumb_edge,
            quality=args.quality,
        )
        after = target.stat().st_size
        after_total += after

        thumb_note = ""
        if thumb_size is not None and thumb_target is not None:
            thumb_bytes = thumb_target.stat().st_size
            after_total += thumb_bytes
            thumb_note = f"  +缩略图 {thumb_size[0]}x{thumb_size[1]} {thumb_bytes / 1024:.0f} KB"

        print(f"  {path.name:<28} {before / 1024:>8.0f} KB -> {after / 1024:>6.0f} KB"
              f"   {full_size[0]}x{full_size[1]}{thumb_note}")

        if args.manifest:
            date, date_source = resolve_date(path, taken)
            alt = derive_alt(path, overrides)
            if path.name in overrides:
                used_overrides.add(path.name)
            if date_source == "mtime":
                mtime_files.append(path.name)
            if alt == ALT_FALLBACK:
                generic_alt.append(path.name)

            # 网格用缩略图的比例；没开 --thumb 时退回全尺寸，保证比例一致
            aspect_base = thumb_size if thumb_size is not None else full_size
            thumb_name = f"{path.stem}{THUMB_SUFFIX}{ext}" if args.thumb else f"{path.stem}{ext}"

            entries.append({
                "src": url_for(target_dir, f"{path.stem}{ext}"),
                "thumb": url_for(target_dir, thumb_name),
                "aspect": round(aspect_base[0] / aspect_base[1], 4),
                "date": date,
                "alt": alt,
                "caption": captions.get(path.name, ""),
                "file": path.name,
                "dateSource": date_source,
            })

    print()
    print(f"合计 {before_total / 1024 / 1024:.1f} MB -> {after_total / 1024 / 1024:.1f} MB")
    if skipped:
        print(f"跳过 {len(skipped)} 个已压缩文件")
    print(f"输出目录：{target_dir}")

    if args.manifest:
        # 同一天按文件名排，保证输出稳定可复现。
        # desc = 照片（新的在前）；asc = 有序内容（课件第 1 页在最前）。
        entries.sort(
            key=lambda entry: (entry["date"], entry["file"]),
            reverse=(args.manifest_order == "desc"),
        )
        manifest_path = Path(args.manifest)
        if not manifest_path.is_absolute():
            manifest_path = ROOT / manifest_path
        write_manifest(manifest_path, entries, **_manifest_style(args))
        print()
        print(f"已生成清单：{manifest_path.relative_to(ROOT).as_posix()}   共 {len(entries)} 条")

        stale = sorted(set(overrides) - used_overrides)
        if stale:
            print()
            print(f"⚠️  alt.json 里有 {len(stale)} 条对应不上任何源文件（改名后残留？）：")
            for name in stale:
                print(f"     {name}")
        stale_caps = sorted(set(captions) - {entry["file"] for entry in entries})
        if stale_caps:
            print()
            print(f"⚠️  captions.json 里有 {len(stale_caps)} 条对应不上任何源文件（改名后残留？）：")
            for name in stale_caps:
                print(f"     {name}")
        if mtime_files and not args.no_date_warning:
            print()
            print(f"⚠️  {len(mtime_files)} 张图既没有 EXIF 也没有文件名日期，日期靠文件修改时间兜底：")
            for name in mtime_files:
                print(f"     {name}")
            print("     文件一拷贝时间就会失真，建议改成 YYYY-MM-DD_描述.jpg。")
        if generic_alt:
            print()
            print(f"⚠️  {len(generic_alt)} 张图的文件名推不出有效描述，alt 退化为「{ALT_FALLBACK}」：")
            for name in generic_alt:
                print(f"     {name}")
            print("     读屏用户听到的只有「摄影作品」。请改成有意义的英文短词，")
            print("     或在源目录的 alt.json 里补一条中文描述。")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
