# BlockOS 腾讯云部署指南

## 服务器要求

- **操作系统**: Ubuntu 22.04 LTS
- **配置**: 2核4G 或以上
- **带宽**: 3Mbps 或以上
- **域名**: 建议配置域名（用于 HTTPS）

## 安全组配置

在腾讯云控制台配置安全组，开放以下端口：

| 端口 | 协议 | 用途 |
|------|------|------|
| 22 | TCP | SSH 远程连接 |
| 80 | TCP | HTTP |
| 443 | TCP | HTTPS |

## 部署步骤

### 1. 购买并配置服务器

1. 登录腾讯云控制台
2. 购买云服务器（CVM），选择 Ubuntu 22.04 LTS
3. 配置安全组，开放上述端口
4. 记录服务器公网 IP

### 2. 域名解析（可选但推荐）

1. 在腾讯云 DNS 解析控制台添加 A 记录
2. 主机记录：`@` 或 `www`
3. 记录值：服务器公网 IP

### 3. 上传代码

```bash
# 本地执行，将代码上传到服务器
scp -r ./blockOS root@your-server-ip:/opt/
```

### 4. 运行部署脚本

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 进入项目目录
cd /opt/blockOS

# 运行部署脚本
bash deploy/setup.sh
```

### 5. 配置环境变量

```bash
# 编辑环境变量文件
nano /opt/blockOS/.env.production
```

填写以下内容：

```env
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-random-secret-key
GITHUB_CLIENT_ID=your-github-app-id
GITHUB_CLIENT_SECRET=your-github-app-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
```

### 6. 配置 OAuth

#### GitHub OAuth

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写信息：
   - Application name: BlockOS
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://your-domain.com/api/auth/callback/github`
4. 获取 Client ID 和 Client Secret

#### Google OAuth

1. 访问 https://console.cloud.google.com/apis/credentials
2. 点击 "Create Credentials" → "OAuth client ID"
3. 配置同意屏幕
4. 创建 OAuth 客户端：
   - 应用类型：Web application
   - 授权重定向 URI: `https://your-domain.com/api/auth/callback/google`
5. 获取 Client ID 和 Client Secret

### 7. 配置 HTTPS（推荐）

```bash
# 使用 Let's Encrypt 免费证书
certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期已配置，无需手动操作
```

### 8. 重启应用

```bash
cd /opt/blockOS
pm2 restart blockos
```

## Docker 部署（可选）

```bash
cd /opt/blockOS/deploy

# 创建环境变量文件
cp .env.local .env

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 常用命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs blockos

# 重启应用
pm2 restart blockos

# 停止应用
pm2 stop blockos

# 更新代码后重新构建
cd /opt/blockOS
git pull
npm ci
npm run build
pm2 restart blockos
```

## 备份数据

```bash
# 备份 SQLite 数据库
cp /opt/blockOS/data/blockos.db /backup/blockos-$(date +%Y%m%d).db

# 设置定时备份（crontab -e）
0 2 * * * cp /opt/blockOS/data/blockos.db /backup/blockos-$(date +\%Y\%m\%d).db
```

## 故障排查

### 应用无法启动

```bash
# 查看错误日志
cat /var/log/blockos/err.log

# 检查端口占用
netstat -tlnp | grep 3000
```

### Nginx 配置错误

```bash
# 测试配置
nginx -t

# 查看 Nginx 错误日志
cat /var/log/nginx/error.log
```

### 数据库问题

```bash
# 检查数据库文件
ls -la /opt/blockOS/data/

# 手动备份并重建
cp /opt/blockOS/data/blockos.db /opt/blockOS/data/blockos.db.bak
```

## 更新应用

```bash
cd /opt/blockOS

# 拉取最新代码
git pull origin main

# 安装依赖
npm ci

# 构建
npm run build

# 重启
pm2 restart blockos
```
