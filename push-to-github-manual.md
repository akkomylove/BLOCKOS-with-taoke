# BlockOS 手动推送到 GitHub

## 目标仓库
https://github.com/akkomylove/blockOS.git

## 前置要求
- 已安装 Git for Windows: https://git-scm.com/download/win
- 已配置 GitHub 账号（或 Personal Access Token）

## 推送步骤

### 1. 打开终端
在 blockOS 项目文件夹内，右键选择 "Git Bash Here" 或打开 PowerShell/CMD 并 cd 到项目目录：

```bash
cd c:\Users\86135\Desktop\blockOS
```

### 2. 初始化仓库（如果没有 .git 文件夹）

```bash
git init
```

### 3. 添加所有文件

```bash
git add -A
```

### 4. 创建提交

```bash
git commit -m "update: sync all latest changes to GitHub"
```

### 5. 设置远程仓库

```bash
git remote remove origin
git remote add origin https://github.com/akkomylove/blockOS.git
```

### 6. 强制推送到 main 分支

```bash
git branch -M main
git push -u origin main --force
```

### 7. 输入凭据（如果需要）

如果提示输入用户名和密码：
- **用户名**: 你的 GitHub 用户名
- **密码**: 你的 **Personal Access Token**（不是 GitHub 登录密码）

> 如果没有 Token，去 https://github.com/settings/tokens 生成一个，勾选 `repo` 权限。

## 一键脚本（可选）

项目目录下已提供两个脚本，双击即可运行：

- **push-to-github.bat** — CMD/Batch 版本
- **push-to-github.ps1** — PowerShell 版本

右键 PowerShell 脚本选择 "使用 PowerShell 运行" 即可自动完成所有步骤。

## 注意事项

1. **.env.local 中的 API Key 已替换为占位符**，推送后需要在服务器或本地重新配置真实密钥
2. **强制推送会覆盖远程仓库的所有内容**，请确认远程仓库没有需要保留的未备份内容
3. **node_modules 和 .next 等文件夹已被 .gitignore 排除**，不会推送到 GitHub
