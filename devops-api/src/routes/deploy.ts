import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DeployController } from '../controllers/DeployController';

// 配置multer中间件用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 使用时间戳和原始文件名生成唯一文件名
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = /\.(zip|tar|tar\.gz|tar\.bz2|rar|7z)$/i;
    const originalName = file.originalname.toLowerCase();
    
    if (allowedTypes.test(originalName)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，请上传 ZIP、TAR 等压缩文件'));
    }
  }
});

const router = Router({ mergeParams: true });
const deployController = new DeployController();

// 远程 devops 命令执行接口
router.post('/execute', deployController.executeDevopsCommand);

// 获取Git仓库分支列表
router.post('/git-branches', deployController.getGitBranches);

// 获取远程服务器列表
router.get('/servers', deployController.getRemoteServers);

// 添加/更新远程服务器配置
router.post('/servers', deployController.addRemoteServer);
router.put('/servers/:serverId', deployController.updateRemoteServer);
router.delete('/servers/:serverId', deployController.deleteRemoteServer);

// 测试远程服务器连接
router.post('/servers/:serverId/test', deployController.testConnection);

// 获取远程服务器上的 devops 命令状态
router.get('/servers/:serverId/devops-status', deployController.getDevopsStatus);

// 获取远程执行历史
router.get('/executions', deployController.getExecutionHistory);

// 获取特定执行的详细信息和日志
router.get('/executions/:executionId', deployController.getExecutionDetails);
router.get('/executions/:executionId/logs', deployController.getExecutionLogs);

// 取消正在执行的命令
router.post('/executions/:executionId/cancel', deployController.cancelExecution);

// 应用部署相关接口
router.post('/applications', deployController.deployApplication);
router.get('/applications', deployController.getApplications);
router.get('/applications/:appName', deployController.getApplicationDetails);
router.post('/applications/:appName/start', deployController.startApplication);
router.post('/applications/:appName/stop', deployController.stopApplication);
router.post('/applications/:appName/restart', deployController.restartApplication);
router.delete('/applications/:appName', deployController.deleteApplication);

// 获取远程资源信息
router.get('/resources/workspaces', deployController.getRemoteWorkspaces);
router.get('/resources/templates', deployController.getRemoteTemplates);
router.get('/resources/deployments', deployController.getRemoteDeployments);
router.get('/resources/system-info', deployController.getSystemInfo);

// 模板预览功能
router.post('/template-preview', deployController.previewTemplate);

// 上传代码包
router.post('/upload-code', upload.single('file'), deployController.uploadCodePackage);

export default router;