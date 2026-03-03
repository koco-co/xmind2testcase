# XMind2Cases Windows 快速启动脚本
# PowerShell 版本要求: 5.1+

$ErrorActionPreference = "Stop"

# 颜色函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green "✓ $args" }
function Write-Error { Write-ColorOutput Red "✗ $args" }
function Write-Warning { Write-ColorOutput Yellow "⚠ $args" }
function Write-Info { Write-Output "  $args" }
function Write-Step { Write-ColorOutput Cyan "➜ $args" }

# 检查 PowerShell 版本
Write-Step "检查 PowerShell 版本..."
$PSVersion = $PSVersionTable.PSVersion
if ($PSVersion.Major -lt 5) {
    Write-Error "PowerShell 版本过低: $PSVersion"
    Write-Info "请升级 PowerShell 到 5.1 或更高版本"
    exit 1
}
Write-Success "PowerShell 版本: $PSVersion"

# 检查/安装 uv
Write-Step "检查 uv 包管理器..."
$uvCommand = Get-Command uv -ErrorAction SilentlyContinue

if ($uvCommand) {
    $uvVersion = uv --version
    Write-Success "uv 已安装: $uvVersion"
} else {
    Write-Warning "uv 未安装"
    Write-Info "uv 是一个极速的 Python 包管理器，本项目需要它来管理依赖"
    Write-Output ""

    $maxRetries = 3
    $retryCount = 0

    while ($retryCount -lt $maxRetries) {
        $ANSWER = Read-Host "是否自动安装 uv? [Y/n]"

        switch ($ANSWER) {
            { $_ -eq "" -or $_ -eq "y" -or $_ -eq "Y" } {
                Write-Info "正在安装 uv..."
                try {
                    irm https://astral.sh/uv/install.ps1 | iex
                    $env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
                    Write-Success "uv 安装完成"

                    # 重新加载 PATH
                    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
                    break
                } catch {
                    Write-Error "uv 安装失败: $_"

                    if ($retryCount -lt ($maxRetries - 1)) {
                        Write-Info "等待 3 秒后重试..."
                        Start-Sleep -Seconds 3
                        $retryCount++
                    } else {
                        Write-Output ""
                        Write-Info "手动安装方法:"
                        Write-Info "  Windows: powershell -c `"irm https://astral.sh/uv/install.ps1 | iex`""
                        Write-Info "  或访问: https://github.com/astral-sh/uv?tab=readme-ov-file#installation"
                        exit 1
                    }
                }
            }
            { $_ -eq "n" -or $_ -eq "N" } {
                Write-Error "用户取消安装"
                Write-Output ""
                Write-Info "手动安装方法:"
                Write-Info "  Windows: powershell -c `"irm https://astral.sh/uv/install.ps1 | iex`""
                Write-Info "  或访问: https://github.com/astral-sh/uv?tab=readme-ov-file#installation"
                exit 1
            }
            Default {
                Write-Error "无效输入，请输入 y 或 n"
                $retryCount++
            }
        }
    }
}

# 同步依赖
Write-Step "同步项目依赖..."
try {
    uv sync
    Write-Success "依赖同步完成"
} catch {
    Write-Error "依赖同步失败: $_"
    exit 1
}

# 检查端口
Write-Step "检查端口 5002..."
$portInUse = Get-NetTCPConnection -LocalPort 5002 -ErrorAction SilentlyContinue

if ($portInUse) {
    $pid = $portInUse[0].OwningProcess
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    $processName = if ($process) { $process.ProcessName } else { "未知" }

    Write-Warning "端口 5002 已被占用"
    Write-Output ""
    Write-Info "进程信息:"
    Write-Info "  PID: $pid"
    Write-Info "  名称: $processName"
    Write-Output ""

    $maxRetries = 3
    $retryCount = 0

    while ($retryCount -lt $maxRetries) {
        $ANSWER = Read-Host "是否要终止占用端口的进程? [Y/n]"

        switch ($ANSWER) {
            { $_ -eq "" -or $_ -eq "y" -or $_ -eq "Y" } {
                Write-Info "正在终止进程 $pid..."
                try {
                    Stop-Process -Id $pid -Force
                    Write-Success "进程已终止"
                    Start-Sleep -Seconds 1
                    break
                } catch {
                    Write-Error "无法终止进程: $_"
                    Write-Info "请手动执行: Stop-Process -Id $pid -Force"
                    exit 1
                }
            }
            { $_ -eq "n" -or $_ -eq "N" } {
                Write-Error "用户取消启动"
                exit 1
            }
            Default {
                Write-Error "无效输入"
                $retryCount++
            }
        }
    }
}

# 启动 webtool
Write-Step "启动 Web 工具..."
Write-Output ""
Write-Success "Web 工具启动成功！"
Write-Output ""
Write-Info "访问地址: http://127.0.0.1:5002"
Write-Info "按 Ctrl+C 停止服务"
Write-Output ""

# 启动 FastAPI 服务器
uv run python -m uvicorn api.main:app --host 0.0.0.0 --port 5002 --reload
