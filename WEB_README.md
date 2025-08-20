# DevOps 一键安装网页

为了提供更好的用户体验，我们创建了两个风格不同的一键安装网页，用户可以直接在浏览器中复制安装命令。

## 📄 页面说明

### 1. `index.html` - 完整版本
**特点:**
- 丰富的视觉效果和动画
- 详细的功能介绍
- 多种安装选项
- 响应式设计
- 适合作为项目主页

**预览:**
- 渐变背景设计
- 卡片式布局
- 功能特性展示
- 交互式安装选项

### 2. `simple.html` - 极简版本（推荐）
**特点:**
- 类似 Ollama 官网的极简风格
- 深色主题
- 专注于核心功能
- 快速加载
- 适合开发者使用

**预览:**
- 深色背景 (#0f0f23)
- 终端风格的命令框
- 简洁的功能图标
- 一键切换安装模式

## 🚀 使用方法

### 本地预览
```bash
# 在项目根目录下
python3 -m http.server 8000
# 或
php -S localhost:8000

# 然后访问
http://localhost:8000/simple.html
http://localhost:8000/index.html
```

### 部署到服务器
1. 将 HTML 文件上传到 Web 服务器
2. 配置 Nginx/Apache 指向文件
3. 更新 HTML 中的 GitHub 链接

### GitHub Pages 部署
1. 将文件推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择 `main` 分支作为源
4. 访问 `https://username.github.io/repository-name/simple.html`

## 🎨 自定义配置

### 修改安装命令
编辑 HTML 文件中的 `commands` 数组：
```javascript
const commands = [
    'curl -fsSL https://your-domain.com/install.sh | bash',
    'curl -fsSL https://your-domain.com/quick-install.sh | bash',
    // ... 更多命令
];
```

### 修改样式
- **颜色主题**: 修改 CSS 变量中的颜色值
- **字体**: 更改 `font-family` 属性
- **布局**: 调整 CSS Grid 和 Flexbox 设置

### 添加功能
- **统计**: 集成 Google Analytics
- **反馈**: 添加用户反馈表单
- **多语言**: 添加语言切换功能

## 📱 响应式设计

两个页面都支持响应式设计，在不同设备上都有良好的显示效果：

- **桌面端**: 完整功能展示
- **平板**: 自适应布局
- **手机**: 优化的移动端体验

## 🔧 技术特性

### 兼容性
- 现代浏览器 (Chrome 60+, Firefox 55+, Safari 12+)
- 移动端浏览器
- 支持复制到剪贴板功能

### 性能
- 纯静态页面，加载速度快
- 无外部依赖
- 压缩后体积小于 10KB

### 安全性
- 无外部脚本引用
- 内联 CSS 和 JavaScript
- 支持 HTTPS 部署

## 🎯 使用建议

### 选择页面
- **项目展示**: 使用 `index.html`，功能丰富，视觉效果好
- **开发者工具**: 使用 `simple.html`，简洁高效，专业感强
- **文档集成**: 两者都可以嵌入到文档网站中

### SEO 优化
```html
<!-- 添加到 <head> 中 -->
<meta name="description" content="DevOps 一键安装工具，支持 Docker、Java、Node.js 等环境自动配置">
<meta name="keywords" content="DevOps, CI/CD, Docker, 自动化部署">
<meta property="og:title" content="DevOps - 一键安装工具">
<meta property="og:description" content="企业级 CI/CD 自动化部署工具">
```

### 监控和分析
```javascript
// 添加安装统计
function trackInstall(type) {
    // Google Analytics
    gtag('event', 'install', {
        'event_category': 'DevOps',
        'event_label': type
    });
    
    // 或自定义统计
    fetch('/api/stats', {
        method: 'POST',
        body: JSON.stringify({ type, timestamp: Date.now() })
    });
}
```

## 🔄 更新和维护

### 定期更新
- 检查安装脚本链接是否有效
- 更新版本号和功能描述
- 测试在不同浏览器中的兼容性

### 用户反馈
- 监控页面访问量
- 收集用户使用反馈
- 根据反馈优化用户体验

## 📊 示例部署

### Nginx 配置
```nginx
server {
    listen 80;
    server_name devops.example.com;
    root /var/www/devops;
    index simple.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # 缓存静态资源
    location ~* \.(html|css|js)$ {
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache 配置
```apache
<VirtualHost *:80>
    ServerName devops.example.com
    DocumentRoot /var/www/devops
    DirectoryIndex simple.html
    
    <Directory /var/www/devops>
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

---

**推荐使用 `simple.html`** - 它具有 Ollama 官网的极简美学，专业且高效！
