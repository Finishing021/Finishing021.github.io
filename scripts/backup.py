"""把项目打成一份可还原的 ZIP 备份。

用法：
    python scripts/backup.py                 # 输出到项目同级目录
    python scripts/backup.py <输出 zip 路径>

排除项（都是**可再生产**的，不用进备份）：
    node_modules/   128M，用 `npm ci` 按 package-lock.json 精确还原
    dist/            25M，用 `npm run build` 重新生成
    .shots/          过程截图，已验收过的成品另存于 previews/

其余全部收录，包括：
    .git/            完整提交历史（含未提交改动的工作区，见下面的说明）
    assets-source/   原始素材（课件页 PNG 在 ppt/，证书原图在 projects/）
    public/          24M 站点静态资源
    previews/        归档的预览截图

关于「未提交的改动」：git 只跟踪已提交的内容，而本项目当前有大量改动还没提交。
所以本脚本**直接读工作区文件**，而不是 `git archive` —— 否则备份出来的是旧版本，
丢掉这一整天的工作。这一点很关键，别改成 git archive。
"""

from __future__ import annotations

import os
import sys
import time
import zipfile
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
ARCHIVE_ROOT = PROJECT.name  # zip 内的顶层目录名，解压后得到 finishing/

EXCLUDE_DIRS = {'node_modules', 'dist', '.shots', '__pycache__', '.pytest_cache', '.vite'}
EXCLUDE_SUFFIX = {'.zip', '.pyc'}

# 已经是压缩格式的，再 deflate 一遍纯属浪费时间（媒体文件尤其如此）
STORE_SUFFIX = {
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif',
    '.mp4', '.mov', '.woff', '.woff2', '.pdf', '.pptx',
}

README = """finishing — 项目备份
================================

打包时间：{stamp}
打包来源：{project}

怎么还原
--------
1. 解压，得到 finishing/ 目录
2. cd finishing
3. npm ci          # 按 package-lock.json 精确还原依赖
4. npm run dev     # 开发预览 http://localhost:5173

要出生产产物再跑一次 npm run build。

这份备份里有什么
----------------
- 完整源码（src/）、脚本（scripts/）、配置
- .git/            提交历史
- assets-source/   原始素材，含 ppt/ 下的课件页 PNG 与 projects/ 下的证书原图
- public/          站点静态资源（照片、日记图、简历 PDF）
- previews/        归档的预览截图，含各文件的说明
- docs/            设计与实现文档

**不含** node_modules/ 与 dist/ —— 它们是可再生产的，用上面第 3、4 步即可重建。
这样 zip 从约 302M 降到约 150M。

关于 deck.pptx
--------------
PPTX 原稿体积常超 100MB（GitHub 单文件上限），新原稿请放 assets-source/ppt/deck.pptx，
已在 .gitignore 中排除；旧版原稿仍留在 assets-source/projects/deck.pptx 作为历史备份。
真正提交的是 assets-source/ppt/*.png 课件页与 public/portfolio.pdf。

注意
----
本备份是「工作区快照」，不是 git 提交。里面有相当多改动尚未 commit，
所以它反映的是打包这一刻磁盘上的真实状态（这是预期的）。
"""


def should_skip_dir(name: str) -> bool:
    return name in EXCLUDE_DIRS


def main() -> int:
    if len(sys.argv) > 1:
        out = Path(sys.argv[1]).resolve()
    else:
        out = PROJECT.parent / f'{PROJECT.name}-backup-{time.strftime("%Y-%m-%d")}.zip'

    if out.exists():
        print(f'输出文件已存在，将被覆盖：{out}')
        out.unlink()

    mode = zipfile.ZIP_DEFLATED
    total_raw = 0
    total_comp = 0
    count = 0
    stored = 0

    stamp = time.strftime('%Y-%m-%d %H:%M:%S')

    with zipfile.ZipFile(out, 'w', compression=mode, compresslevel=6) as zf:
        # 备份说明放最外层，解压即可见
        zf.writestr(
            'BACKUP-README.txt',
            README.format(stamp=stamp, project=str(PROJECT)),
            compress_type=zipfile.ZIP_DEFLATED,
        )

        for dirpath, dirnames, filenames in os.walk(PROJECT):
            dirnames[:] = sorted(d for d in dirnames if not should_skip_dir(d))
            for filename in sorted(filenames):
                src = Path(dirpath) / filename
                if src.suffix.lower() in EXCLUDE_SUFFIX:
                    continue
                if src.resolve() == out.resolve():
                    continue

                rel = src.relative_to(PROJECT)
                arcname = f'{ARCHIVE_ROOT}/{rel.as_posix()}'

                ctype = (
                    zipfile.ZIP_STORED
                    if src.suffix.lower() in STORE_SUFFIX
                    else zipfile.ZIP_DEFLATED
                )
                if ctype == zipfile.ZIP_STORED:
                    stored += 1

                zf.write(src, arcname, compress_type=ctype)
                count += 1
                total_raw += src.stat().st_size

    total_comp = out.stat().st_size
    ratio = (1 - total_comp / total_raw) * 100 if total_raw else 0

    print(f'✅ 已写入 {out}')
    print(f'   文件数        {count}（其中 {stored} 个媒体文件原样存储）')
    print(f'   原始体积      {total_raw / 1024 / 1024:.1f} MB')
    print(f'   压缩后        {total_comp / 1024 / 1024:.1f} MB（省 {ratio:.1f}%）')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
