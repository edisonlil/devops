import Joi from 'joi';

// 验证 devops 命令参数
export function validateDeployCommand(data: any) {
  const schema = Joi.object({
    serverId: Joi.string().required().messages({
      'string.empty': '服务器ID不能为空',
      'any.required': '服务器ID是必填项'
    }),
    command: Joi.string().required().messages({
      'string.empty': '命令不能为空',
      'any.required': '命令是必填项'
    }),
    args: Joi.array().items(Joi.string()).default([]).messages({
      'array.base': '参数必须是字符串数组'
    }),
    workingDir: Joi.string().optional().messages({
      'string.base': '工作目录必须是字符串'
    }),
    timeout: Joi.number().integer().min(1000).max(3600000).default(300000).messages({
      'number.base': '超时时间必须是数字',
      'number.integer': '超时时间必须是整数',
      'number.min': '超时时间最少1秒',
      'number.max': '超时时间最多1小时'
    })
  });

  const { error, value } = schema.validate(data);
  
  if (error) {
    return {
      valid: false,
      message: '参数验证失败',
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    valid: true,
    value
  };
}

// 验证远程服务器配置
export function validateRemoteServer(data: any) {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      'string.empty': '服务器名称不能为空',
      'string.min': '服务器名称至少1个字符',
      'string.max': '服务器名称最多100个字符',
      'any.required': '服务器名称是必填项'
    }),
    host: Joi.string().trim().required().pattern(/^[a-zA-Z0-9.-]+$/).messages({
      'string.empty': 'IP地址或主机名不能为空',
      'string.pattern.base': 'IP地址或主机名格式不正确',
      'any.required': 'IP地址或主机名是必填项'
    }),
    port: Joi.number().integer().min(1).max(65535).default(22).messages({
      'number.base': '端口必须是数字',
      'number.integer': '端口必须是整数',
      'number.min': '端口范围1-65535',
      'number.max': '端口范围1-65535'
    }),
    username: Joi.string().trim().min(1).max(50).required().messages({
      'string.empty': '用户名不能为空',
      'string.min': '用户名至少1个字符',
      'string.max': '用户名最多50个字符',
      'any.required': '用户名是必填项'
    }),
    authType: Joi.string().valid('password', 'key').required().messages({
      'any.only': '认证类型只能是password或key',
      'any.required': '认证类型是必填项'
    }),
    password: Joi.when('authType', {
      is: 'password',
      then: Joi.string().min(1).required().messages({
        'string.empty': '密码不能为空',
        'any.required': '密码认证需要提供密码'
      }),
      otherwise: Joi.string().optional()
    }),
    privateKey: Joi.when('authType', {
      is: 'key',
      then: Joi.string().min(1).required().messages({
        'string.empty': '私钥不能为空',
        'any.required': '密钥认证需要提供私钥'
      }),
      otherwise: Joi.string().optional()
    }),
    passphrase: Joi.string().optional(),
    description: Joi.string().max(500).optional().messages({
      'string.max': '描述最多500个字符'
    }),
    tags: Joi.array().items(Joi.string().trim().min(1).max(50)).default([]).messages({
      'array.base': '标签必须是字符串数组',
      'string.min': '标签至少1个字符',
      'string.max': '标签最多50个字符'
    })
  });

  const { error, value } = schema.validate(data);
  
  if (error) {
    return {
      valid: false,
      message: '服务器配置验证失败',
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    valid: true,
    value
  };
}

// 验证应用部署配置
export function validateApplicationDeployment(data: any) {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(63).required().pattern(/^[a-z0-9-]+$/).messages({
      'string.empty': '应用名称不能为空',
      'string.min': '应用名称至少1个字符',
      'string.max': '应用名称最多63个字符',
      'string.pattern.base': '应用名称只能包含小写字母、数字和连字符',
      'any.required': '应用名称是必填项'
    }),
    type: Joi.string().valid('java', 'vue', 'nodejs', 'go', 'nginx', 'tomcat', 'python').required().messages({
      'any.only': '应用类型必须是java、vue、nodejs、go、nginx、tomcat或python之一',
      'any.required': '应用类型是必填项'
    }),
    workspace: Joi.string().trim().min(1).required().messages({
      'string.empty': '工作空间不能为空',
      'any.required': '工作空间是必填项'
    }),
    serverId: Joi.string().required().messages({
      'string.empty': '服务器ID不能为空',
      'any.required': '服务器ID是必填项'
    }),
    gitUrl: Joi.string().uri().optional().messages({
      'string.uri': 'Git URL格式不正确'
    }),
    svnUrl: Joi.string().uri().optional().messages({
      'string.uri': 'SVN URL格式不正确'
    }),
    branch: Joi.string().optional().default('main'),
    buildTool: Joi.string().valid('maven', 'gradle', 'npm', 'yarn').optional(),
    template: Joi.string().optional(),
    namespace: Joi.string().optional(),
    ports: Joi.object({
      app: Joi.number().integer().min(1).max(65535).optional(),
      expose: Joi.number().integer().min(1).max(65535).optional(),
      service: Joi.string().optional(),
      export: Joi.string().optional()
    }).optional(),
    resources: Joi.object({
      cpu: Joi.string().pattern(/^\d+m?$/).optional(),
      memory: Joi.string().pattern(/^\d+[KMG]i?$/).optional(),
      storage: Joi.string().pattern(/^\d+[KMG]i?$/).optional()
    }).optional()
  }).custom((value, helpers) => {
    // 至少需要 gitUrl 或 svnUrl 之一
    if (!value.gitUrl && !value.svnUrl) {
      return helpers.error('custom.sourceRequired');
    }
    return value;
  }, 'source validation').messages({
    'custom.sourceRequired': '必须提供Git URL或SVN URL'
  });

  const { error, value } = schema.validate(data);
  
  if (error) {
    return {
      valid: false,
      message: '应用部署配置验证失败',
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    valid: true,
    value
  };
}

// 验证分页参数
export function validatePagination(data: any) {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': '页码必须是数字',
      'number.integer': '页码必须是整数',
      'number.min': '页码最小值为1'
    }),
    size: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.base': '页面大小必须是数字',
      'number.integer': '页面大小必须是整数',
      'number.min': '页面大小最小值为1',
      'number.max': '页面大小最大值为100'
    }),
    status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled').optional(),
    serverId: Joi.string().optional()
  });

  const { error, value } = schema.validate(data);
  
  if (error) {
    return {
      valid: false,
      message: '分页参数验证失败',
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    valid: true,
    value
  };
}

// 验证文件路径
export function validateFilePath(path: string) {
  // 防止路径遍历攻击
  const dangerousPatterns = [
    /\.\./,  // 上级目录
    /~/,     // 用户目录（可能包含敏感文件）
    /\/etc/, // 系统配置目录
    /\/proc/,// 进程信息
    /\/sys/, // 系统信息
    /\/var\/log/, // 系统日志
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(path)) {
      return {
        valid: false,
        message: '文件路径包含危险字符或目录'
      };
    }
  }

  return {
    valid: true
  };
}

// 验证命令安全性
export function validateCommandSecurity(command: string, args: string[]) {
  const fullCommand = `${command} ${args.join(' ')}`;
  
  // 危险命令列表
  const dangerousCommands = [
    /rm\s+-rf/,     // 危险删除
    /dd\s+if=/,     // 磁盘操作
    /mkfs\./,       // 格式化
    /fdisk/,        // 磁盘分区
    /halt|shutdown|reboot/, // 系统控制
    /passwd/,       // 密码修改
    /su\s+/,        // 切换用户
    /sudo\s+/,      // 提权（根据需要可以放开）
    /chmod\s+777/,  // 危险权限
    /\/etc\/passwd/, // 系统用户文件
    /\/etc\/shadow/, // 密码文件
  ];

  for (const pattern of dangerousCommands) {
    if (pattern.test(fullCommand)) {
      return {
        valid: false,
        message: `命令包含危险操作: ${pattern.source}`
      };
    }
  }

  // 只允许 devops 相关命令
  if (!command.startsWith('devops') && !command.includes('kubectl') && !command.includes('docker')) {
    return {
      valid: false,
      message: '只允许执行 devops、kubectl、docker 相关命令'
    };
  }

  return {
    valid: true
  };
}

// 通用错误响应格式
export function formatErrorResponse(message: string, errors?: string[], code?: string) {
  return {
    success: false,
    message,
    errors: errors || [],
    code: code || 'VALIDATION_ERROR',
    timestamp: new Date().toISOString()
  };
}

// 通用成功响应格式
export function formatSuccessResponse(data: any, message?: string) {
  return {
    success: true,
    message: message || 'Operation successful',
    data,
    timestamp: new Date().toISOString()
  };
}