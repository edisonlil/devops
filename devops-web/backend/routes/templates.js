const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 全局模板目录路径
const TEMPLATES_DIR = path.join(__dirname, '../../templates');
const WORKSPACE_DIR = path.join(__dirname, '../../workspace');

// 临时使用内存存储，避免SQLite依赖问题
let database = null;
try {
    database = require('../models/database');
} catch (error) {
    console.log('SQLite not available, using mock data');
    database = null;
}

// 临时模板数据（当数据库不可用时使用）
const mockTemplates = [
    {
        id: 1,
        name: 'Spring Boot 标准部署',
        description: '适用于 Spring Boot 应用的标准 Kubernetes 部署模板，包含服务发现、健康检查等功能',
        category: 'backend',
        icon: 'CoffeeCup',
        iconColor: '#10b981',
        tags: ['spring-boot', 'java', 'microservice'],
        versions: ['3.1.0', '3.0.0', '2.7.0'],
        defaultVersion: '3.1.0',
        platformTypes: ['KUBERNETES'],
        scope: 'global',
        workspaceId: null,
        author: 'DevOps Team',
        files: {
            dockerfile: `FROM openjdk:11-jre-slim
MAINTAINER devops@company.com
LABEL maintainer='corp'

ARG jar_name
ARG java_opts
ENV JAR_NAME=$jar_name
ENV JAVA_OPTS=$java_opts
ENV TZ=Asia/Shanghai

COPY ./$JAR_NAME /opt/$JAR_NAME
WORKDIR /opt
EXPOSE 8080

CMD java -jar \${JAVA_OPTS} \${JAR_NAME}`,
            deployYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ?module_name
  namespace: ?namespace
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ?module_name
  template:
    metadata:
      labels:
        app: ?module_name
    spec:
      containers:
      - name: ?module_name
        image: ?image_path
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: 500m
            memory: 1Gi
          requests:
            cpu: 200m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: ?module_name-service
  namespace: ?namespace
spec:
  selector:
    app: ?module_name
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP`
        },
        buildCommands: [
            'mvn clean package -DskipTests',
            'docker build -t $IMAGE_NAME .',
            'docker push $IMAGE_NAME'
        ],
        defaultParams: [
            { key: 'PORT', value: '8080', description: '应用端口' },
            { key: 'JAVA_OPTS', value: '-Xmx512m', description: 'JVM参数' }
        ],
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString(),
        createdBy: 'system',
        isActive: true
    },
    {
        id: 2,
        name: 'Vue.js + Nginx',
        description: '前端应用部署模板，使用 Nginx 作为 Web 服务器，支持 SPA 路由',
        category: 'frontend',
        icon: 'Monitor',
        iconColor: '#3b82f6',
        tags: ['vue', 'nginx', 'spa'],
        versions: ['3.3.0', '3.2.0'],
        defaultVersion: '3.3.0',
        platformTypes: ['KUBERNETES', 'DOCKER_SWARM'],
        scope: 'global',
        workspaceId: null,
        author: 'Frontend Team',
        files: {
            dockerfile: `FROM nginx:alpine
MAINTAINER devops@company.com
LABEL maintainer='corp'

# 复制构建产物
COPY dist.tar /tmp/
RUN cd /usr/share/nginx/html && tar -xf /tmp/dist.tar && rm /tmp/dist.tar

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
            deployYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ?module_name
  namespace: ?namespace
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ?module_name
  template:
    metadata:
      labels:
        app: ?module_name
    spec:
      containers:
      - name: ?module_name
        image: ?image_path
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: 200m
            memory: 256Mi
          requests:
            cpu: 100m
            memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: ?module_name-service
  namespace: ?namespace
spec:
  selector:
    app: ?module_name
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ?module_name-ingress
  namespace: ?namespace
spec:
  rules:
  - host: ?domain
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ?module_name-service
            port:
              number: 80`
        },
        buildCommands: [
            'npm ci',
            'npm run build',
            'docker build -t $IMAGE_NAME .',
            'docker push $IMAGE_NAME'
        ],
        defaultParams: [
            { key: 'PORT', value: '80', description: 'Nginx端口' },
            { key: 'API_BASE_URL', value: 'https://api.example.com', description: 'API基础地址' }
        ],
        createdAt: new Date('2024-01-10').toISOString(),
        updatedAt: new Date('2024-01-10').toISOString(),
        createdBy: 'system',
        isActive: true
    }
];

// 从文件系统读取全局模板
function loadGlobalTemplates() {
    const templates = [];

    try {
        if (!fs.existsSync(TEMPLATES_DIR)) {
            console.log('Templates directory not found, using mock data');
            return mockTemplates;
        }

        const templateDirs = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const templateId of templateDirs) {
            const templateDir = path.join(TEMPLATES_DIR, templateId);
            const metaFile = path.join(templateDir, 'meta.json');

            if (fs.existsSync(metaFile)) {
                try {
                    const metaContent = fs.readFileSync(metaFile, 'utf8');
                    const meta = JSON.parse(metaContent);

                    // 读取模板文件内容
                    const files = {};
                    const templateFiles = fs.readdirSync(templateDir);

                    for (const fileName of templateFiles) {
                        if (fileName !== 'meta.json') {
                            const filePath = path.join(templateDir, fileName);
                            if (fs.statSync(filePath).isFile()) {
                                files[fileName === 'deploy.yaml' ? 'deployYaml' : fileName] =
                                    fs.readFileSync(filePath, 'utf8');
                            }
                        }
                    }

                    // 构建模板对象
                    const template = {
                        id: meta.id || templateId,
                        name: meta.name,
                        description: meta.description,
                        category: meta.category,
                        scope: meta.scope || 'global',
                        platformTypes: meta.platformTypes || [],
                        author: meta.author,
                        icon: meta.icon,
                        iconColor: meta.iconColor,
                        tags: meta.tags || [],
                        files: files,
                        parameters: meta.parameters || [],
                        buildCommands: meta.buildCommands || [],
                        createdAt: meta.createdAt || new Date().toISOString(),
                        updatedAt: meta.updatedAt || new Date().toISOString(),
                        isActive: true
                    };

                    templates.push(template);
                } catch (error) {
                    console.error(`Error loading template ${templateId}:`, error.message);
                }
            }
        }

        return templates.length > 0 ? templates : mockTemplates;
    } catch (error) {
        console.error('Error loading global templates:', error.message);
        return mockTemplates;
    }
}

// 辅助函数：获取分类标签
function getCategoryLabel(category) {
    const labels = {
        backend: '后端服务',
        frontend: '前端应用'
    };
    return labels[category] || category;
}

// 辅助函数：获取分类图标
function getCategoryIcon(category) {
    const icons = {
        backend: 'Server',
        frontend: 'Monitor'
    };
    return icons[category] || 'Box';
}

// 获取模板列表（支持工作空间筛选）
router.get('/', async (req, res) => {
    try {
        const { category, search, workspaceId, platformType } = req.query;
        
        // 从文件系统加载全局模板
        let filteredTemplates = loadGlobalTemplates();
        
        // 按平台类型筛选
        if (platformType) {
            filteredTemplates = filteredTemplates.filter(t => 
                t.platformTypes.includes(platformType)
            );
        }
        
        // 按分类筛选
        if (category && category !== 'all') {
            filteredTemplates = filteredTemplates.filter(t => t.category === category);
        }
        
        // 按搜索关键词筛选
        if (search) {
            const searchLower = search.toLowerCase();
            filteredTemplates = filteredTemplates.filter(t => 
                t.name.toLowerCase().includes(searchLower) ||
                t.description.toLowerCase().includes(searchLower) ||
                t.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }
        
        // 生成分类统计
        const categoryStats = {};
        mockTemplates.forEach(t => {
            categoryStats[t.category] = (categoryStats[t.category] || 0) + 1;
        });
        
        const categories = [
            { value: 'all', label: '全部模板', icon: 'Grid', count: filteredTemplates.length },
            ...Object.entries(categoryStats).map(([cat, count]) => ({
                value: cat,
                label: getCategoryLabel(cat),
                icon: getCategoryIcon(cat),
                count: count
            }))
        ];
        
        res.json({
            success: true,
            data: {
                templates: filteredTemplates,
                categories,
                total: filteredTemplates.length
            }
        });
    } catch (error) {
        console.error('获取模板列表失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取模板列表失败',
            error: error.message 
        });
    }
});

// 获取单个模板详情
router.get('/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        
        const template = mockTemplates.find(t => t.id == templateId);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                message: '模板不存在'
            });
        }
        
        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        console.error('获取模板详情失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取模板详情失败',
            error: error.message 
        });
    }
});

// 创建新模板
router.post('/', async (req, res) => {
    try {
        const templateData = req.body;
        
        // 生成新ID
        const newId = Math.max(...mockTemplates.map(t => t.id)) + 1;
        
        const newTemplate = {
            id: newId,
            ...templateData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'user',
            isActive: true
        };
        
        mockTemplates.push(newTemplate);
        
        res.status(201).json({
            success: true,
            message: '模板创建成功',
            data: { id: newId }
        });
    } catch (error) {
        console.error('创建模板失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '创建模板失败',
            error: error.message 
        });
    }
});

// 更新模板
router.put('/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const templateData = req.body;
        
        const index = mockTemplates.findIndex(t => t.id == templateId);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: '模板不存在'
            });
        }
        
        mockTemplates[index] = {
            ...mockTemplates[index],
            ...templateData,
            updatedAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            message: '模板更新成功'
        });
    } catch (error) {
        console.error('更新模板失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '更新模板失败',
            error: error.message 
        });
    }
});

// 删除模板
router.delete('/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        
        const index = mockTemplates.findIndex(t => t.id == templateId);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: '模板不存在'
            });
        }
        
        mockTemplates.splice(index, 1);
        
        res.json({
            success: true,
            message: '模板删除成功'
        });
    } catch (error) {
        console.error('删除模板失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '删除模板失败',
            error: error.message 
        });
    }
});

// 基于模板创建作业配置
router.post('/:templateId/create-job', async (req, res) => {
    try {
        const { templateId } = req.params;
        const { jobName, workspace, parameters = {} } = req.body;

        if (!jobName || !workspace) {
            return res.status(400).json({
                success: false,
                message: '缺少必需参数: jobName 和 workspace'
            });
        }

        // 加载模板
        const templates = loadGlobalTemplates();
        const template = templates.find(t => t.id === templateId);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: `模板不存在: ${templateId}`
            });
        }

        // 检查工作空间是否存在
        const workspaceDir = path.join(WORKSPACE_DIR, workspace);
        if (!fs.existsSync(workspaceDir)) {
            return res.status(404).json({
                success: false,
                message: `工作空间不存在: ${workspace}`
            });
        }

        // 创建作业目录
        const jobDir = path.join(workspaceDir, 'jobs', jobName);
        if (fs.existsSync(jobDir)) {
            return res.status(409).json({
                success: false,
                message: `作业已存在: ${jobName}`
            });
        }

        fs.mkdirSync(jobDir, { recursive: true });

        // 创建作业配置文件
        const jobConfig = {
            name: jobName,
            template: templateId,
            workspace: workspace,
            parameters: parameters,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'configured'
        };

        fs.writeFileSync(
            path.join(jobDir, 'job.json'),
            JSON.stringify(jobConfig, null, 2)
        );

        // 渲染模板文件
        const renderedFiles = {};
        for (const [fileName, content] of Object.entries(template.files || {})) {
            let renderedContent = content;

            // 替换占位符
            for (const [key, value] of Object.entries(parameters)) {
                const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
                renderedContent = renderedContent.replace(placeholder, value);
            }

            // 保存渲染后的文件
            const outputFileName = fileName === 'deployYaml' ? 'deploy.yaml' : fileName;
            const outputPath = path.join(jobDir, outputFileName);
            fs.writeFileSync(outputPath, renderedContent);

            renderedFiles[outputFileName] = renderedContent;
        }

        res.json({
            success: true,
            message: '作业配置创建成功',
            data: {
                job: jobConfig,
                files: Object.keys(renderedFiles),
                path: jobDir
            }
        });

    } catch (error) {
        console.error('创建作业配置失败:', error);
        res.status(500).json({
            success: false,
            message: '创建作业配置失败',
            error: error.message
        });
    }
});

module.exports = router;
