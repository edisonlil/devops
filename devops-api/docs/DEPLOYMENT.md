# DevOps API 部署指南

## 📋 部署方式

- [本地开发部署](#本地开发部署)
- [Docker 部署](#docker-部署)
- [生产环境部署](#生产环境部署)
- [容器化部署](#容器化部署)

## 🏠 本地开发部署

### Windows 系统

1. **使用批处理脚本（推荐）**
```cmd
# 双击运行或在命令行执行
start.bat
```

2. **手动启动**
```cmd
# 安装依赖
npm install

# 创建环境文件
copy .env.example .env

# 创建目录
mkdir data\workspaces data\templates logs

# 启动开发服务器
npm run dev
```

### Linux/macOS 系统

1. **使用启动脚本（推荐）**
```bash
# 给脚本执行权限
chmod +x start.sh

# 运行启动脚本
./start.sh
```

2. **手动启动**
```bash
# 安装依赖
npm install

# 创建环境文件
cp .env.example .env

# 创建目录
mkdir -p data/workspaces data/templates logs

# 启动开发服务器
npm run dev
```

## 🐳 Docker 部署

### 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S devops -u 1001

# 创建必要目录
RUN mkdir -p data/workspaces data/templates logs
RUN chown -R devops:nodejs data logs

USER devops

EXPOSE 8080

CMD ["npm", "start"]
```

### 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  devops-api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - FRONTEND_URL=http://localhost:3000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 可选：添加 Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### Docker 部署命令

```bash
# 构建镜像
docker build -t devops-api .

# 运行容器
docker run -d \
  --name devops-api \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  devops-api

# 使用 docker-compose
docker-compose up -d
```

## 🚀 生产环境部署

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2 进程管理器
sudo npm install -g pm2

# 安装 Nginx（可选）
sudo apt install nginx
```

### 2. 应用部署

```bash
# 克隆代码
git clone <your-repo-url> devops-api
cd devops-api

# 安装依赖
npm ci --only=production

# 构建应用
npm run build

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件设置生产环境配置

# 创建必要目录
mkdir -p data/workspaces data/templates logs

# 使用 PM2 启动
pm2 start ecosystem.config.js
```

### 3. PM2 配置文件

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'devops-api',
    script: 'dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
}
```

### 4. Nginx 反向代理配置

创建 `/etc/nginx/sites-available/devops-api`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/devops-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ☸️ Kubernetes 部署

### 1. 创建 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devops-api
  labels:
    app: devops-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: devops-api
  template:
    metadata:
      labels:
        app: devops-api
    spec:
      containers:
      - name: devops-api
        image: devops-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8080"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. 创建 Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: devops-api-service
spec:
  selector:
    app: devops-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

### 3. 部署到 Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## 🔧 环境配置

### 生产环境变量

```env
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://your-frontend-domain.com

# 数据存储
DATA_PATH=/app/data
WORKSPACE_PATH=/app/data/workspaces
TEMPLATE_PATH=/app/data/templates

# 日志配置
LOG_LEVEL=warn
LOG_FILE=/app/logs/app.log

# 安全配置
JWT_SECRET=your-super-secure-jwt-secret-key
API_KEY=your-production-api-key

# 监控配置
METRICS_ENABLED=true
METRICS_PORT=9090
```

## 📊 监控和日志

### 1. 健康检查

```bash
# 检查服务状态
curl http://localhost:8080/health

# PM2 状态
pm2 status

# Docker 容器状态
docker ps
```

### 2. 日志查看

```bash
# PM2 日志
pm2 logs devops-api

# Docker 日志
docker logs devops-api

# 系统日志
tail -f logs/app.log
```

### 3. 性能监控

```bash
# PM2 监控
pm2 monit

# 系统资源
htop
```

## 🔒 安全配置

### 1. 防火墙设置

```bash
# 只开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. SSL 证书（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚨 故障排除

### 常见问题

1. **端口被占用**
```bash
sudo lsof -i :8080
sudo kill -9 <PID>
```

2. **权限问题**
```bash
sudo chown -R $USER:$USER data logs
chmod -R 755 data logs
```

3. **内存不足**
```bash
# 增加 swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

4. **PM2 进程异常**
```bash
pm2 restart devops-api
pm2 reload devops-api
pm2 delete devops-api && pm2 start ecosystem.config.js
```
