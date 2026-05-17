@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo =========================================
echo  BlockOS 推送到 GitHub
echo  目标仓库: https://github.com/akkomylove/blockOS.git
echo =========================================
echo.

REM 检查git是否安装
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Git，请先安装Git for Windows
    echo 下载地址: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/6] 初始化本地仓库...
if not exist .git (
    git init
) else (
    echo 仓库已存在，跳过初始化
)

echo.
echo [2/6] 添加所有文件到暂存区...
git add -A

echo.
echo [3/6] 创建提交...
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

echo.
echo [4/6] 设置远程仓库...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/akkomylove/blockOS.git

echo.
echo [5/6] 强制推送到main分支...
git branch -M main
git push -u origin main --force

echo.
if errorlevel 1 (
    echo [错误] 推送失败，请检查网络或GitHub凭据
    echo 如果提示输入用户名密码，请输入你的GitHub账号和Token
    pause
    exit /b 1
) else (
    echo [成功] 所有文件已推送到GitHub！
    echo 仓库地址: https://github.com/akkomylove/blockOS
)

echo.
pause
