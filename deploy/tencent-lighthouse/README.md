# BlockOS 腾讯云轻量应用服务器部署指南

## 服务器要求

- **系统**: Ubuntu 22.04 LTS (推荐)
- **配置**: 2核 4G 内存 或更高
- **带宽**: 3Mbps 或更高
- **磁盘**: 50GB SSD (node_modules 较大)

## 部署步骤

### 1. 购买并初始化服务器

1. 登录腾讯云控制台，购买轻量应用服务器
2. 选择 Ubuntu 22.04 镜像
3. 开启防火墙端口: 80 (HTTP)、443 (HTTPS，可选)
4. 用 SSH 登录服务器: `ssh ubuntu@你的服务器IP`

### 2. 上传项目代码

**方式 A: Git 克隆**
```bash
cd /var/www
git clone https://github.com/akkomylove/blockOS.git blockos
```

**方式 B: 本地打包上传**
```bash
# 在本地项目目录执行，排除 node_modules
zip -r blockos-deploy.zip . -x "node_modules/*" -x ".next/*" -x ".git/*"

# 用 scp 上传到服务器
scp blockos-deploy.zip ubuntu@服务器IP:/var/www/

# 在服务器上解压
ssh ubuntu@服务器IP "cd /var/www && unzip blockos-deploy.zip -d blockos"
```

### 3. 运行部署脚本

```bash
cd /var/www/blockos/deploy/tencent-lighthouse
chmod +x setup.sh
./setup.sh
```

脚本会自动完成:
- 系统更新
- Node.js 20 安装
- PM2 安装
- 依赖安装 + 构建
- 环境变量配置
- Nginx 反向代理配置
- PM2 进程守护启动

### 4. 验证部署

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs blockos

# 测试访问（应用运行在 8000 端口）
curl http://localhost:8000
```

浏览器访问 `http://你的服务器IP`

## 常用维护命令

| 命令 | 说明 |
|------|------|
| `pm2 status` | 查看应用状态 |
| `pm2 logs blockos` | 查看实时日志 |
| `pm2 restart blockos` | 重启应用 |
| `pm2 stop blockos` | 停止应用 |
| `sudo nginx -t` | 检查 Nginx 配置 |
| `sudo systemctl restart nginx` | 重启 Nginx |

## 绑定域名 (可选)

1. 域名解析到服务器 IP
2. 修改 Nginx 配置:
```bash
sudo nano /etc/nginx/sites-available/blockos
```
将 `server_name _;` 改为 `server_name your-domain.com;`

3. 配置 SSL (推荐):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 环境变量说明

| 变量 | 说明 | 是否必填 |
|------|------|----------|
| `AUTH_SECRET` | NextAuth 密钥 | 是 |
| `DASHSCOPE_API_KEY` | AI API 密钥（阿里云 DashScope） | 是 |
| `DASHSCOPE_BASE_URL` | AI API 地址 | 否 |
| `AI_MODEL` | AI 模型名称 | 是 |

### API 源切换（硅基流 ↔ 千问官方）

修改 `.env.local` 中的以下变量即可切换，**无需修改代码**：

**硅基流（旧）:**
```bash
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_API_KEY=sk-你的阿里云密钥
AI_MODEL=qwen3.6-plus
```

**阿里云百炼（推荐）:**
```bash
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_API_KEY=sk-你的阿里云密钥
AI_MODEL=qwen3.6-plus
```

修改后执行 `pm2 restart blockos` 生效。

## 注意事项

1. **数据库**: 当前使用 sql.js 内存数据库，重启后数据丢失。如需持久化，需改用文件模式或外接数据库。
2. **内存**: 构建时内存占用较高，建议服务器至少 4G 内存。
3. **AI 接口**: 确保服务器能访问阿里云 DashScope API (dashscope.aliyuncs.com)。
