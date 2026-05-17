# BlockOS 推送到 GitHub
# 目标仓库: https://github.com/akkomylove/blockOS.git

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " BlockOS 推送到 GitHub" -ForegroundColor Cyan
Write-Host " 目标仓库: https://github.com/akkomylove/blockOS.git" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查git是否安装
try {
    $gitVersion = git --version 2>$null
    Write-Host "[1/6] Git已安装: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未检测到Git，请先安装Git for Windows" -ForegroundColor Red
    Write-Host "下载地址: https://git-scm.com/download/win" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# 初始化本地仓库
Write-Host ""
Write-Host "[2/6] 初始化本地仓库..." -ForegroundColor Cyan
if (-not (Test-Path .git)) {
    git init
} else {
    Write-Host "仓库已存在，跳过初始化" -ForegroundColor Gray
}

# 添加所有文件
Write-Host ""
Write-Host "[3/6] 添加所有文件到暂存区..." -ForegroundColor Cyan
git add -A

# 创建提交
Write-Host ""
Write-Host "[4/6] 创建提交..." -ForegroundColor Cyan
git commit -m "update: sync all latest changes to GitHub

- Fix team settings button (add EditTeamModal)
- Fix project edit button (add EditProjectModal)
- Fix sql.js WASM path error
- Fix login redirect issue
- Compact Toolbar UI with icon-only buttons
- Increase Block initial width to 480px
- Fix AI/Agent features with API keys
- Fix project creation error
- Adjust TagWheelPicker position
- Add return/back buttons to collaboration pages
- Add priority adjustment to task card menus
- Update collaboration store and types"

# 设置远程仓库
Write-Host ""
Write-Host "[5/6] 设置远程仓库..." -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin https://github.com/akkomylove/blockOS.git

# 强制推送
Write-Host ""
Write-Host "[6/6] 强制推送到main分支..." -ForegroundColor Cyan
git branch -M main
try {
    git push -u origin main --force
    Write-Host ""
    Write-Host "[成功] 所有文件已推送到GitHub！" -ForegroundColor Green
    Write-Host "仓库地址: https://github.com/akkomylove/blockOS" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "[错误] 推送失败，请检查网络或GitHub凭据" -ForegroundColor Red
    Write-Host "如果提示输入用户名密码，请输入你的GitHub账号和Personal Access Token" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

Write-Host ""
Read-Host "按回车键退出"
