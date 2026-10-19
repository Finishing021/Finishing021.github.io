"""optimize-images.py 的自检 —— 重点盯 EXIF 拍摄日期的读取。

为什么单独写一个而不是塞进 vitest：vitest 跑不了 Python。而日期读取恰好是
整条管线里最容易「静默出错」的一环 —— 读不到不会报错，只是悄悄退回文件
修改时间，页面照样渲染、照片照样出现，只有排序错了，你很难注意到。

所以给这条路径上一把显式的锁：构造几种真实世界会遇到 EXIF 写法，
断言解析结果。用法：

    python scripts/test-optimize-images.py     # 或 npm run photos:selftest

刻意不依赖 pytest —— 这个仓库的 Python 侧只依赖 Pillow，
为二十来行断言再引入一套测试框架不划算。
"""
from __future__ import annotations

import importlib.util
import io
import tempfile
from datetime import datetime
from pathlib import Path

from PIL import Image

SCRIPT = Path(__file__).resolve().parent / "optimize-images.py"

# EXIF 标签号（与 optimize-images.py 保持一致，故意写死而不是 import，
# 这样脚本改了常量名这里也能立刻发现断言失效而不是静默跟着变）
TAG_DATETIME = 306
TAG_DATETIME_ORIGINAL = 36867
TAG_DATETIME_DIGITIZED = 36868
EXIF_IFD = 0x8769


def load_script():
    """按路径加载带连字符的文件名，普通 import 做不到。"""
    spec = importlib.util.spec_from_file_location("optimize_images", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


mod = load_script()


# ---------------------------------------------------------------- 构造样本

def roundtrip(build_exif=None) -> Image.Image:
    """存成 JPEG 再读回来 —— 内存里的 Exif 对象不代表磁盘上写对了。"""
    image = Image.new("RGB", (48, 32), (12, 34, 56))
    buffer = io.BytesIO()
    if build_exif is None:
        image.save(buffer, "JPEG")
    else:
        image.save(buffer, "JPEG", exif=build_exif())
    buffer.seek(0)
    return Image.open(buffer)


def camera_style(dt: str):
    """真实相机 / 手机：DateTimeOriginal 住在 Exif 子 IFD(0x8769) 里。"""
    def build():
        exif = Image.Exif()
        exif[EXIF_IFD] = {TAG_DATETIME_ORIGINAL: dt, TAG_DATETIME_DIGITIZED: dt}
        exif[271] = "TestCam"
        return exif
    return build


def digitized_only_style(dt: str):
    """只有 DateTimeDigitized，没有 DateTimeOriginal —— 少见但确实存在。"""
    def build():
        exif = Image.Exif()
        exif[EXIF_IFD] = {TAG_DATETIME_DIGITIZED: dt}
        return exif
    return build


def flat_style(dt: str):
    """部分导出工具图省事，把拍摄时间塞进 0th IFD 的 DateTimeOriginal。"""
    def build():
        exif = Image.Exif()
        exif[TAG_DATETIME_ORIGINAL] = dt
        return exif
    return build


def datetime_only_style(dt: str):
    """只有 0th IFD 的 DateTime(306)。"""
    def build():
        exif = Image.Exif()
        exif[TAG_DATETIME] = dt
        return exif
    return build


def mixed_style(original: str, file_date: str):
    """相机写拍摄时间，工具又补了个文件时间 —— 必须优先取拍摄时间。"""
    def build():
        exif = Image.Exif()
        exif[EXIF_IFD] = {TAG_DATETIME_ORIGINAL: original}
        exif[TAG_DATETIME] = file_date
        return exif
    return build


# ---------------------------------------------------------------- 断言框架

passed = 0
failures: list[str] = []


def check(label: str, actual, expected) -> None:
    global passed
    if actual == expected:
        passed += 1
    else:
        failures.append(f"{label}\n       期望 {expected!r}\n       实际 {actual!r}")


def check_true(label: str, condition: bool, detail: str = "") -> None:
    global passed
    if condition:
        passed += 1
    else:
        failures.append(f"{label}{('  ' + detail) if detail else ''}")


# ---------------------------------------------------------------- 1. 日期解析

TAKEN = datetime(2025, 4, 12, 9, 30)

check(
    "相机式 EXIF（DateTimeOriginal 在 Exif 子 IFD）",
    mod.read_exif_datetime(roundtrip(camera_style("2025:04:12 09:30:00"))),
    TAKEN,
)
check(
    "只有 DateTimeDigitized（Exif 子 IFD）",
    mod.read_exif_datetime(roundtrip(digitized_only_style("2025:04:12 09:30:00"))),
    TAKEN,
)
check(
    "展平式 EXIF（拍摄时间落在 0th IFD）",
    mod.read_exif_datetime(roundtrip(flat_style("2025:04:12 09:30:00"))),
    TAKEN,
)
check(
    "只有 DateTime(306)",
    mod.read_exif_datetime(roundtrip(datetime_only_style("2025:04:12 09:30:00"))),
    TAKEN,
)
check(
    "同时有两种时间时，拍摄时间优先",
    mod.read_exif_datetime(roundtrip(mixed_style("2025:04:12 09:30:00", "2020:01:01 00:00:00"))),
    TAKEN,
)
check(
    "完全没有 EXIF",
    mod.read_exif_datetime(roundtrip()),
    None,
)
check(
    "EXIF 里是垃圾字符串时不崩、按没有处理",
    mod.read_exif_datetime(roundtrip(camera_style("not a date"))),
    None,
)
check_true(
    "日期字符串带尾部 NUL 也能解析（相机固件常见）",
    mod.read_exif_datetime(roundtrip(camera_style("2025:04:12 09:30:00\x00"))) == TAKEN,
)

# ---------------------------------------------------------------- 2. 日期来源

with tempfile.TemporaryDirectory() as tmp:
    plain = Path(tmp) / "plain.jpg"
    plain.write_bytes(b"x")

    dated = Path(tmp) / "2024-11-08_campus-dusk.jpg"
    dated.write_bytes(b"x")

    spaced = Path(tmp) / "2024-11-08 18-20-campus.jpg"
    spaced.write_bytes(b"x")

    dashed = Path(tmp) / "2024-11-08-campus-dusk.jpg"
    dashed.write_bytes(b"x")

    range_like = Path(tmp) / "2019-2020-review.jpg"
    range_like.write_bytes(b"x")

    check("有 EXIF 时来源标记为 exif", mod.resolve_date(plain, TAKEN), ("2025-04-12", "exif"))
    check(
        "无 EXIF 时回退到文件名前缀",
        mod.resolve_date(dated, None),
        ("2024-11-08", "filename"),
    )
    check(
        "文件名前缀后有空格也认",
        mod.resolve_date(spaced, None),
        ("2024-11-08", "filename"),
    )
    check(
        "文件名前缀后用连字符也认",
        mod.resolve_date(dashed, None),
        ("2024-11-08", "filename"),
    )
    check(
        "年份区间不会被误当成日期（2019-2020 不是 2019 年 20 月）",
        mod.resolve_date(range_like, None)[1],
        "mtime",
    )

    mtime_result = mod.resolve_date(plain, None)
    check("既无 EXIF 也无文件名日期时来源标记为 mtime", mtime_result[1], "mtime")
    check_true(
        "mtime 兜底给出的仍是合法日期",
        len(mtime_result[0]) == 10 and mtime_result[0][4] == "-" and mtime_result[0][7] == "-",
        f"得到 {mtime_result[0]!r}",
    )

# ---------------------------------------------------------------- 3. alt 推导

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    check("文件名转成可读描述", mod.derive_alt(root / "yangzhou-rain.jpg", {}), "yangzhou rain")
    check(
        "文件名里的日期前缀会被剥掉",
        mod.derive_alt(root / "2024-11-08_campus-dusk.jpg", {}),
        "campus dusk",
    )
    check(
        "敷衍的 photo_01 退化为通用描述",
        mod.derive_alt(root / "photo_01.jpg", {}),
        mod.ALT_FALLBACK,
    )
    check(
        "纯数字文件名退化为通用描述",
        mod.derive_alt(root / "1234.jpg", {}),
        mod.ALT_FALLBACK,
    )
    check("alt.json 覆盖优先于文件名", mod.derive_alt(root / "photo_01.jpg", {"photo_01.jpg": "宿舍窗外的云"}), "宿舍窗外的云")
    check(
        "非法日期前缀不会被剥掉，描述完整保留",
        mod.derive_alt(root / "2019-2020-review.jpg", {}),
        "2019 2020 review",
    )
    check_true(
        "超长 alt 会被截断",
        len(mod.derive_alt(root / ("a" * 200 + ".jpg"), {})) <= mod.ALT_MAX_LEN,
    )

# ---------------------------------------------------------------- 结果

total = passed + len(failures)
if failures:
    print(f"✗ {len(failures)} / {total} 项断言失败\n")
    for item in failures:
        print(f"  ✗ {item}\n")
    raise SystemExit(1)

print(f"✓ optimize-images.py 自检通过：{total} 项断言")
