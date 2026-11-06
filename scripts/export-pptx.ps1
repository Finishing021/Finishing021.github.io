<#
把 PPTX 导出成「网页要用的两样东西」：

  1. 逐页高清 PNG  -> assets-source/ppt/         （后面由 projects:build 压成网页尺寸）
  2. 一份 PDF      -> public/portfolio.pdf      （页面上「下载完整 PDF」指向它）

为什么用 PowerPoint 而不是 LibreOffice / python-pptx：
  这份课件里有大量渐变、毛玻璃、以及两段嵌入视频和一个艺术字封面。
  只有 PowerPoint 自己的渲染引擎能 1:1 还原；其他方案会把渐变渲染成色带、
  把艺术字换成替代字体。本机装有 Office，所以直接驱动它。

用法（在项目根目录）：
  npm run projects:export

也可以直接调用：
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/export-pptx.ps1 `
      -Source assets-source/ppt/deck.pptx `
      -Pdf    public/portfolio.pdf `
      -OutDir assets-source/ppt

注意：
  * 脚本内容全为 ASCII。Windows PowerShell 5.1 在无 BOM 时按 ANSI 读 .ps1，
    文件里一旦出现中文就会被读成乱码，所以注释也一并写成英文以外的风险一律避开。
  * 路径由参数传入，默认值都是 ASCII 相对路径，因此不依赖终端编码。
  * deck.pptx 是本地源文件（体积常超 100MB，GitHub 拒收），已在 .gitignore 中排除；
    课件页 PNG / PDF 才是提交进仓库的产物。没有 PPTX 也可以直接用 PDF 渲染课件页。
#>
[CmdletBinding()]
param(
    [string]$Source = 'assets-source/ppt/deck.pptx',
    [string]$Pdf    = 'public/portfolio.pdf',
    [string]$OutDir = 'assets-source/ppt',
    [int]$Width  = 3200,
    [int]$Height = 1800
)

$ErrorActionPreference = 'Stop'

# 相对路径一律按「仓库根目录」解析，这样从任何位置调用都一致
$repoRoot = Split-Path -Parent $PSScriptRoot
function Resolve-RepoPath([string]$p) {
    if ([System.IO.Path]::IsPathRooted($p)) { return $p }
    return (Join-Path $repoRoot $p)
}

$deckPath = Resolve-RepoPath $Source
$pdfPath  = Resolve-RepoPath $Pdf
$outDir   = Resolve-RepoPath $OutDir

if (-not (Test-Path -LiteralPath $deckPath)) {
    Write-Error "找不到源文件: $deckPath"
    exit 1
}

New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$pdfDir = Split-Path -Parent $pdfPath
New-Item -ItemType Directory -Path $pdfDir -Force | Out-Null

Write-Host "[export-pptx] source : $deckPath"
Write-Host "[export-pptx] pdf    : $pdfPath"
Write-Host "[export-pptx] pngs   : $outDir  (${Width}x${Height})"

# 旧的一批 PNG 先清掉：页数变少时，残留的 slide-16.png 会让页面多出一张幽灵卡片
Get-ChildItem -LiteralPath $outDir -Filter 'slide-*.png' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force

$ppt = $null
$pres = $null
try {
    Write-Host '[export-pptx] starting PowerPoint...'
    $ppt = New-Object -ComObject PowerPoint.Application
    # ppAlertsNone = 1。有些版本不允许写这个属性，失败也不影响导出，忽略即可
    try { $ppt.DisplayAlerts = 1 } catch { }

    # Open(FileName, ReadOnly, Untitled, WithWindow) —— WithWindow = msoFalse，
    # 不弹窗，避免无人值守时卡在对话框上
    $pres = $ppt.Presentations.Open($deckPath, $true, $false, $false)
    Write-Host ("[export-pptx] opened: {0} slides, {1}x{2} pt" -f `
        $pres.Slides.Count, $pres.PageSetup.SlideWidth, $pres.PageSetup.SlideHeight)

    # ppSaveAsPDF = 32
    $pres.SaveAs($pdfPath, 32)
    Write-Host ("[export-pptx] pdf ok: {0:N0} bytes" -f (Get-Item -LiteralPath $pdfPath).Length)

    for ($i = 1; $i -le $pres.Slides.Count; $i++) {
        $name = 'slide-{0:d2}.png' -f $i
        $out  = Join-Path $outDir $name
        $pres.Slides.Item($i).Export($out, 'PNG', $Width, $Height)
        Write-Host ("[export-pptx]   {0}  {1:N0} bytes" -f $name, (Get-Item -LiteralPath $out).Length)
    }

    Write-Host ("[export-pptx] done: {0} slides" -f $pres.Slides.Count)
}
finally {
    if ($pres) { try { $pres.Close() } catch { } }
    if ($ppt)  { try { $ppt.Quit() }  catch { } }
    foreach ($obj in @($pres, $ppt)) {
        if ($obj) {
            try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($obj) } catch { }
        }
    }
    # 不留后台 POWERPNT 进程，否则下次导出会挂到那个实例上
    Get-Process POWERPNT -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -eq 0 } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}
