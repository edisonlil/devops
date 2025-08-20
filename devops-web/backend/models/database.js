const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/devops.db');

// 确保数据目录存在
fs.ensureDirSync(path.dirname(DB_PATH));

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database:', DB_PATH);
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const tables = [
            // 模板表
            `CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100) NOT NULL,
                icon VARCHAR(100),
                tags TEXT, -- JSON array
                versions TEXT, -- JSON array
                default_version VARCHAR(50),
                dockerfile TEXT,
                build_commands TEXT, -- JSON array
                default_params TEXT, -- JSON array
                platform_types TEXT, -- JSON array: ['KUBERNETES', 'DOCKER_SWARM', 'DOCKER_COMPOSE']
                scope VARCHAR(20) DEFAULT 'global', -- 'global' or 'workspace'
                workspace_id VARCHAR(255), -- NULL for global templates
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(255),
                is_active BOOLEAN DEFAULT 1
            )`,
            
            // 模板文件表（支持多文件模板）
            `CREATE TABLE IF NOT EXISTS template_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER NOT NULL,
                filename VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                file_type VARCHAR(50), -- 'dockerfile', 'yaml', 'json', 'script', etc.
                is_main BOOLEAN DEFAULT 0, -- 是否为主文件
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES templates (id) ON DELETE CASCADE
            )`,
            
            // 工作空间表（扩展）
            `CREATE TABLE IF NOT EXISTS workspaces (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                platform_type VARCHAR(50) NOT NULL, -- 'KUBERNETES', 'DOCKER_SWARM', 'DOCKER_COMPOSE'
                config TEXT, -- JSON config
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // 作业表
            `CREATE TABLE IF NOT EXISTS jobs (
                id VARCHAR(255) PRIMARY KEY,
                workspace_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                template_id INTEGER,
                git_url VARCHAR(500),
                branch VARCHAR(255),
                build_path VARCHAR(255),
                deploy_params TEXT, -- JSON
                status VARCHAR(50) DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_deploy DATETIME,
                FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
                FOREIGN KEY (template_id) REFERENCES templates (id) ON DELETE SET NULL
            )`
        ];

        for (const sql of tables) {
            await this.run(sql);
        }

        // 初始化默认数据
        await this.initDefaultData();
    }

    async initDefaultData() {
        // 检查是否已有数据
        const count = await this.get('SELECT COUNT(*) as count FROM templates');
        if (count.count > 0) {
            return; // 已有数据，不需要初始化
        }

        // 插入默认全局模板
        const defaultTemplates = [
            {
                name: 'Java Spring Boot',
                description: 'Spring Boot 微服务应用模板',
                category: 'java',
                icon: 'Coffee',
                tags: JSON.stringify(['Java', 'Spring Boot', 'Maven']),
                versions: JSON.stringify(['3.1.0', '3.0.0', '2.7.0']),
                default_version: '3.1.0',
                platform_types: JSON.stringify(['KUBERNETES', 'DOCKER_SWARM', 'DOCKER_COMPOSE']),
                dockerfile: `FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]`,
                build_commands: JSON.stringify([
                    'mvn clean package -DskipTests',
                    'docker build -t $IMAGE_NAME .',
                    'docker push $IMAGE_NAME'
                ]),
                default_params: JSON.stringify([
                    { key: 'PORT', value: '8080', description: '应用端口' },
                    { key: 'JAVA_OPTS', value: '-Xmx512m', description: 'JVM参数' }
                ])
            },
            {
                name: 'Vue.js 应用',
                description: 'Vue.js 前端应用模板',
                category: 'frontend',
                icon: 'Monitor',
                tags: JSON.stringify(['Vue.js', 'Vite', 'TypeScript']),
                versions: JSON.stringify(['3.3.0', '3.2.0']),
                default_version: '3.3.0',
                platform_types: JSON.stringify(['KUBERNETES', 'DOCKER_SWARM']),
                dockerfile: `FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
                build_commands: JSON.stringify([
                    'npm ci',
                    'npm run build',
                    'docker build -t $IMAGE_NAME .',
                    'docker push $IMAGE_NAME'
                ]),
                default_params: JSON.stringify([
                    { key: 'PORT', value: '80', description: 'Nginx端口' },
                    { key: 'API_BASE_URL', value: 'https://api.example.com', description: 'API基础地址' }
                ])
            },
            {
                name: 'Go Gin API',
                description: 'Go Gin Web API 模板',
                category: 'go',
                icon: 'Lightning',
                tags: JSON.stringify(['Go', 'Gin', 'API']),
                versions: JSON.stringify(['1.20', '1.19']),
                default_version: '1.20',
                platform_types: JSON.stringify(['KUBERNETES', 'DOCKER_SWARM']),
                dockerfile: `FROM golang:1.20-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]`,
                build_commands: JSON.stringify([
                    'go mod tidy',
                    'go build -o main .',
                    'docker build -t $IMAGE_NAME .',
                    'docker push $IMAGE_NAME'
                ]),
                default_params: JSON.stringify([
                    { key: 'PORT', value: '8080', description: '应用端口' },
                    { key: 'GIN_MODE', value: 'release', description: 'Gin运行模式' }
                ])
            },
            {
                name: 'MySQL 数据库',
                description: 'MySQL 数据库服务模板',
                category: 'database',
                icon: 'Database',
                tags: JSON.stringify(['MySQL', 'Database']),
                versions: JSON.stringify(['8.0', '5.7']),
                default_version: '8.0',
                platform_types: JSON.stringify(['KUBERNETES']), // 只支持 K8s
                dockerfile: `FROM mysql:8.0
COPY init.sql /docker-entrypoint-initdb.d/
EXPOSE 3306`,
                build_commands: JSON.stringify([
                    'docker build -t $IMAGE_NAME .',
                    'docker push $IMAGE_NAME'
                ]),
                default_params: JSON.stringify([
                    { key: 'MYSQL_ROOT_PASSWORD', value: 'rootpassword', description: 'Root密码' },
                    { key: 'MYSQL_DATABASE', value: 'myapp', description: '数据库名' }
                ])
            }
        ];

        for (const template of defaultTemplates) {
            await this.run(`
                INSERT INTO templates (
                    name, description, category, icon, tags, versions, default_version,
                    platform_types, dockerfile, build_commands, default_params, scope
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'global')
            `, [
                template.name, template.description, template.category, template.icon,
                template.tags, template.versions, template.default_version,
                template.platform_types, template.dockerfile, template.build_commands,
                template.default_params
            ]);
        }

        console.log('Default templates initialized');
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// 创建全局数据库实例
const database = new Database();

module.exports = database;
