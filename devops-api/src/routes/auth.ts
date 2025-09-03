import express from 'express';
import { AuthController } from '../controllers/AuthController';

const router = express.Router();
const authController = new AuthController();

// SSH登录
router.post('/ssh-login', authController.sshLogin.bind(authController));

// 登出
router.post('/logout', authController.logout.bind(authController));

// 获取当前会话信息
router.get('/session', authController.getSessionInfo.bind(authController));

// 检查会话是否有效
router.get('/check', authController.checkSession.bind(authController));

// 获取会话状态（管理员接口）
router.get('/sessions', authController.getSessionsStatus.bind(authController));

export default router;