#!/bin/bash
set -e

# BlockOS 腾讯云一键部署脚本
# 使用方法: curl -fsSL https://your-domain.com/setup.sh | bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== BlockOS 腾讯云部署脚本 ===${NC}"

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 权限运行此脚本${NC}"
  exit 1
fi

# 更新系统
echo -e "${YELLOW}[1/8] 更新系统...${NC}"
apt-get update -y
apt-get upgrade -y

# 安装必要工具
echo -e "${YELLOW}[2/8] 安装必要工具...${NC}"
apt-get install -y curl wget git nginx certbot python3-certbot-nginx

# 安装 Node.js 20
echo -e "${YELLOW}[3/8] 安装 Node.js 20...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "20" ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

# 安装 PM2
echo -e "${YELLOW}[4/8] 安装 PM2...${NC}"
npm install -g pm2

# 安装 Docker (可选)
echo -e "${YELLOW}[5/8] 安装 Docker...${NC}"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | bash -
  systemctl enable docker
  systemctl start docker
fi

# 创建应用目录
echo -e "${YELLOW}[6/8] 创建应用目录...${NC}"
APP_DIR="/opt/blockos"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 克隆代码 (这里需要替换为实际的仓库地址)
# git clone https://github.com/your-repo/blockOS.git .

# 或者手动上传代码到 /opt/blockos
if [ ! -f "$APP_DIR/package.json" ]; then
  echo -e "${RED}未检测到代码文件，请将代码上传到 $APP_DIR${NC}"
  echo -e "${YELLOW}提示: 可以使用 scp 或 rsync 上传代码${NC}"
  exit 1
fi

# 安装依赖
echo -e "${YELLOW}[7/8] 安装依赖并构建...${NC}"
cd "$APP_DIR"
npm ci
npm run build

# 创建 PM2 配置
cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'blockos',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/opt/blockos',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/log/blockos/err.log',
    out_file: '/var/log/blockos/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
  }],
};
EOF

mkdir -p /var/log/blockos

# 配置 Nginx
echo -e "${YELLOW}[8/8] 配置 Nginx...${NC}"
cat > /etc/nginx/sites-available/blockos << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

ln -sf /etc/nginx/sites-available/blockos /etc/nginx/sites-enabled/blockos
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# 启动应用
echo -e "${GREEN}启动 BlockOS...${NC}"
cd "$APP_DIR"
pm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# 配置防火墙
echo -e "${YELLOW}配置防火墙...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "${GREEN}=== 部署完成 ===${NC}"
echo -e "${GREEN}应用已启动，访问 http://$(curl -s ifconfig.me) 查看${NC}"
echo -e "${YELLOW}提示: 请配置环境变量 .env.production${NC}"
echo -e "${YELLOW}提示: 如需 HTTPS，运行: certbot --nginx -d your-domain.com${NC}"
