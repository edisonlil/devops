# DevOps Web 网络访问配置

## 概述

DevOps Web 管理界面默认配置为监听所有IP地址（0.0.0.0），这意味着可以从任何网络位置访问该服务。

## 访问方式

### 开发模式

启动开发服务器后：

```bash
./start.sh dev
# 或
npm run dev
```

**访问地址：**
- 本地访问: http://localhost:5173
- 局域网访问: http://YOUR_SERVER_IP:5173
- 外网访问: http://YOUR_PUBLIC_IP:5173

### 生产模式

启动生产服务器后：

```bash
./start.sh prod
# 或
npm start
```

**访问地址：**
- 本地访问: http://localhost:3000
- 局域网访问: http://YOUR_SERVER_IP:3000
- 外网访问: http://YOUR_PUBLIC_IP:3000

## 网络配置

### 前端配置 (vite.config.js)

```javascript
export default defineConfig({
  server: {
    host: '0.0.0.0',  // 监听所有IP地址
    port: 5173,
    // ...其他配置
  }
})
```

### 后端配置 (backend/app.js)

```javascript
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`DevOps Web Server running on http://${HOST}:${PORT}`);
});
```

## 环境变量配置

可以通过环境变量自定义监听地址和端口：

```bash
# 设置监听地址（默认 0.0.0.0）
export HOST=0.0.0.0

# 设置端口（默认 3000）
export PORT=3000

# 启动服务
npm start
```

## 安全考虑

### 生产环境建议

1. **使用反向代理**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **启用HTTPS**
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-Proto https;
       }
   }
   ```

3. **防火墙配置**
   ```bash
   # 只允许特定IP访问
   sudo ufw allow from 192.168.1.0/24 to any port 3000
   
   # 或者只允许本地访问
   sudo ufw allow from 127.0.0.1 to any port 3000
   ```

### 限制访问

如果只想本地访问，可以修改配置：

**前端 (vite.config.js):**
```javascript
server: {
  host: 'localhost',  // 只监听本地
  port: 5173,
}
```

**后端 (backend/app.js):**
```javascript
const HOST = process.env.HOST || 'localhost';
```

**或通过环境变量:**
```bash
export HOST=localhost
npm start
```

## 常见问题

### Q: 无法从其他机器访问？

**A: 检查以下几点：**
1. 确认服务监听 0.0.0.0 而不是 localhost
2. 检查防火墙设置
3. 确认端口没有被占用
4. 检查网络连通性

### Q: 如何查看当前监听地址？

**A: 使用以下命令：**
```bash
# 查看端口监听情况
netstat -tlnp | grep :3000

# 或使用 ss 命令
ss -tlnp | grep :3000
```

### Q: 如何更改默认端口？

**A: 有几种方式：**
```bash
# 方式1: 环境变量
export PORT=8080
npm start

# 方式2: 直接指定
PORT=8080 npm start

# 方式3: 修改配置文件
# 编辑 backend/app.js 中的 PORT 变量
```

## 测试网络访问

### 获取服务器IP地址

```bash
# 获取本机IP地址
hostname -I

# 或者
ip addr show | grep inet

# 或者
ifconfig | grep inet
```

### 测试连接

```bash
# 从其他机器测试连接
curl -I http://YOUR_SERVER_IP:3000

# 或使用浏览器访问
# http://YOUR_SERVER_IP:3000
```

## Docker 部署

如果使用Docker部署，确保端口映射正确：

```dockerfile
# Dockerfile
EXPOSE 3000

# 运行容器
docker run -p 3000:3000 devops-web
```

或使用docker-compose：

```yaml
version: '3.8'
services:
  devops-web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - HOST=0.0.0.0
      - PORT=3000
```

## 总结

DevOps Web 默认配置为可从任何IP访问，这便于开发和部署。在生产环境中，建议：

1. 使用反向代理（Nginx/Apache）
2. 启用HTTPS
3. 配置适当的防火墙规则
4. 考虑使用VPN或内网访问
5. 定期更新和维护安全配置

这样既保证了易用性，又确保了安全性。
