#!/bin/bash
set -e

echo "========================================"
echo "  BlockOS 阿里云百炼部署脚本"
echo "========================================"

echo "[1/8] 更新系统..."
if command -v apt &> /dev/null; then
  sudo apt update && sudo apt upgrade -y
  sudo apt install -y curl git nginx
elif command -v yum &> /dev/null; then
  sudo yum update -y
  sudo yum install -y curl git nginx
fi

echo "[2/8] 安装 Node.js 20..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "20" ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "[3/8] 安装 PM2..."
sudo npm install -g pm2

echo "[4/8] 准备项目目录..."
APP_DIR="/var/www/blockos"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"
cd "$APP_DIR"

echo "[5/8] 安装依赖..."
npm ci --production=false

echo "[6/8] 构建项目..."
npm run build

echo "[7/8] 写入环境变量..."
if [ ! -f ".env.local" ]; then
  cat > .env.local << 'EOF'
AUTH_SECRET=blockos-demo-auth-secret-2026
DASHSCOPE_API_KEY=sk-你的阿里云密钥
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen3.6-plus
EOF
fi

echo "[8/8] 启动 PM2..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'blockos',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/blockos',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 8000,
    },
  }],
};
EOF

pm2 start ecosystem.config.js
pm2 save
