<#
.SYNOPSIS
拾财 · AI理财陪伴Web应用 一键启动脚本（零依赖，无需 npm install）。

.DESCRIPTION
- 幂等：端口 3000 已在监听时自动跳过启动，只打开浏览器。
- 服务：node server/index.js，日志写入 logs\server.out.log / server.err.log。
- 停止：.\start.ps1 -Stop  （按端口结束进程）。

.EXAMPLE
.\start.ps1                  # 启动并打开浏览器
.\start.ps1 -NoBrowser       # 启动但不打开浏览器
.\start.ps1 -Stop            # 停止服务
#>
param(
  [switch]$Stop,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppPort = 3000
$AppScript = Join-Path $Root "server\index.js"
$LogDir = Join-Path $Root "logs"
$PidFile = Join-Path $LogDir "server.pid"

# ---------------------------------------------------------------- 工具函数

# 端口检测统一用 netstat（兼容受限环境，比 Get-NetTCPConnection 更稳定）
function Get-Listeners {
  $rows = netstat -ano | Select-String "LISTENING"
  foreach ($row in $rows) {
    if ($row.Line -match '^\s*\S+\s+(\[[^\]]+\]|[^:]+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$') {
      [PSCustomObject]@{ Addr = $matches[1]; Port = [int]$matches[2]; Pid = [int]$matches[3] }
    }
  }
}

function Get-PidsOnPort([int]$Port) {
  @(Get-Listeners | Where-Object { $_.Port -eq $Port } | Select-Object -ExpandProperty Pid -Unique)
}

function Get-PidOnPort([int]$Port) {
  $pids = @(Get-PidsOnPort $Port)
  if ($pids.Count -gt 0) { return $pids[0] }
  return $null
}

function Get-ProcessInfo([int]$ProcessId) {
  try {
    $proc = Get-Process -Id $ProcessId -ErrorAction Stop
    $commandLine = ''
    try {
      $wmiproc = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
      $commandLine = [string]$wmiproc.CommandLine
    } catch {
      # 某些受限 Windows 环境禁止读取 WMI 命令行；PID/端口仍可用于本脚本的进程跟踪。
    }
    [PSCustomObject]@{
      Pid = $ProcessId
      Name = $proc.ProcessName
      CommandLine = $commandLine
    }
  } catch {
    return $null
  }
}

function Test-AppProcess([int]$ProcessId) {
  $info = Get-ProcessInfo $ProcessId
  if (-not $info -or $info.Name -ne 'node') { return $false }
  if ($info.CommandLine) {
    return $info.CommandLine -match 'server[\\/]index\.js' -or $info.CommandLine -like "*$AppScript*"
  }
  if (Test-Path -LiteralPath $PidFile) {
    try {
      if ([int](Get-Content -LiteralPath $PidFile -Raw).Trim() -eq $ProcessId) { return $true }
    } catch { }
  }
  Write-Host "  [assume] 无法读取进程命令行，按端口约定将停止 Node 进程 (pid $ProcessId)" -ForegroundColor Yellow
  return $true
}

function Stop-AppProcesses {
  $pids = @(Get-PidsOnPort $AppPort)
  if ($pids.Count -eq 0) { return $true }
  $blocked = $false
  foreach ($listenerPid in $pids) {
    if (Test-AppProcess $listenerPid) {
      Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
      Write-Host "  [stopped] 已结束旧拾财进程 (pid $listenerPid)" -ForegroundColor Yellow
    } else {
      Write-Host "  [error] 端口 $AppPort 被非拾财进程占用 (pid $listenerPid)，为避免误杀不会继续启动" -ForegroundColor Red
      $blocked = $true
    }
  }
  Start-Sleep -Milliseconds 800
  if ((Get-PidsOnPort $AppPort).Count -gt 0) { $blocked = $true }
  if (-not $blocked -and (Test-Path -LiteralPath $PidFile)) { Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue }
  return -not $blocked
}

function Wait-Port([int]$Port, [int]$Seconds, [string]$Name) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Get-PidOnPort $Port) {
      Write-Host "    [ok] $Name 已在端口 $Port 监听" -ForegroundColor Green
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  Write-Host "    [warn] $Name 未在 ${Seconds}s 内监听端口 $Port，请查看 logs\server.err.log" -ForegroundColor Yellow
  return $false
}

# ---------------------------------------------------------------- 停止模式

if ($Stop) {
  Write-Host "== 停止拾财服务 ==" -ForegroundColor Cyan
  if ((Get-PidsOnPort $AppPort).Count -eq 0) {
    Write-Host "  [skip] 端口 $AppPort 未监听，服务未在运行" -ForegroundColor Green
  } elseif (Stop-AppProcesses) {
    Write-Host "  [stopped] 拾财服务已停止" -ForegroundColor Green
  } else {
    Write-Host "  [warn] 服务未完全停止，请检查端口 $AppPort" -ForegroundColor Yellow
  }
  exit 0
}

# ---------------------------------------------------------------- 启动流程

Write-Host "== 拾财 · 一键启动 ==" -ForegroundColor Cyan

# 1. 检查 Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "  [error] 未找到 node，请先安装 Node.js (>= 22.5)：https://nodejs.org" -ForegroundColor Red
  exit 1
}
Write-Host "  [node] $($node.Source)  (version: $(& node --version))"

# 2. 启动服务（先结束旧的拾财进程，再启动新进程）
if ((Get-PidsOnPort $AppPort).Count -gt 0) {
  Write-Host "  [restart] 检测到端口 $AppPort 已被占用，准备结束旧拾财进程"
  if (-not (Stop-AppProcesses)) {
    Write-Host "  [error] 无法安全清理端口 $AppPort，已取消启动" -ForegroundColor Red
    exit 1
  }
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$out = Join-Path $LogDir "server.out.log"
$err = Join-Path $LogDir "server.err.log"
try {
  $newProcess = Start-Process -FilePath $node.Source -ArgumentList "server/index.js" `
    -WorkingDirectory $Root -RedirectStandardOutput $out `
    -RedirectStandardError $err -WindowStyle Hidden -PassThru -ErrorAction Stop
} catch {
  Write-Host "  [error] 无法启动 Node：$($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
[System.IO.File]::WriteAllText($PidFile, [string]$newProcess.Id)
Write-Host "  [started] 已启动 node server/index.js，日志: logs\server.*.log"

if (-not (Wait-Port $AppPort 30 "拾财服务")) {
  try { $newProcess.Refresh() } catch { }
  if ($newProcess.HasExited) {
    Write-Host "  [error] Node 进程已退出，退出码：$($newProcess.ExitCode)" -ForegroundColor Red
    if (Test-Path -LiteralPath $err) {
      Write-Host "  [error] 最近的启动错误：" -ForegroundColor Red
      Get-Content -LiteralPath $err -Encoding UTF8 | Select-Object -Last 30 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    }
  } else {
    Write-Host "  [error] Node 仍在运行但未监听端口 $AppPort，请检查 logs\server.err.log" -ForegroundColor Red
  }
  exit 1
}

# 3. 健康检查
try {
  $h = Invoke-RestMethod "http://127.0.0.1:$AppPort/api/health" -TimeoutSec 5
  Write-Host "  [health] $($h | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "  [warn] 健康检查失败: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. 打开浏览器
if (-not $NoBrowser) {
  Start-Process "http://localhost:$AppPort"
  Write-Host "  [open] 已在浏览器打开 http://localhost:$AppPort" -ForegroundColor Green
}

# ---------------------------------------------------------------- 汇总

Write-Host ""
Write-Host "== 启动完成 ==" -ForegroundColor Cyan
Write-Host "  访问地址:    http://localhost:$AppPort"
Write-Host "  健康检查:    http://localhost:$AppPort/api/health"
Write-Host "  日志目录:    $LogDir"
Write-Host "  停止服务:    .\start.ps1 -Stop"
