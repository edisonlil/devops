// DevOps 官网交互功能

// 安装命令数组
const installCommands = [
    'curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash',
    'curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash -s -- --full',
    'curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash -s -- --script-only'
];

// 当前选中的安装模式
let currentInstallMode = 0;

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initThemeToggle();
    initInstallModes();
    initExampleTabs();
    initSmoothScroll();
    initNavbarScroll();
});

// 主题切换功能
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const THEME_KEY = 'devops-theme';
    
    // 获取保存的主题或系统偏好
    function getPreferredTheme() {
        try {
            const saved = localStorage.getItem(THEME_KEY);
            if (saved) return saved;
        } catch (e) {}
        
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
            ? 'dark' : 'light';
    }
    
    // 应用主题
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (e) {}
        updateThemeToggleIcon(theme);
    }
    
    // 更新主题切换按钮图标
    function updateThemeToggleIcon(theme) {
        if (!themeToggle) return;
        const isDark = theme === 'dark';
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        themeToggle.title = isDark ? '切换为浅色主题' : '切换为深色主题';
        themeToggle.setAttribute('aria-label', themeToggle.title);
    }
    
    // 初始化主题
    applyTheme(getPreferredTheme());
    
    // 绑定切换事件
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }
}

// 安装模式切换
function initInstallModes() {
    // 只选择"选择安装模式"部分的选项卡，避免与"三步快速开始"部分的选项卡冲突
    const installSection = document.getElementById('install');
    if (!installSection) return;

    const modeTabs = installSection.querySelectorAll('.mode-tab');
    const commandElement = document.getElementById('install-command');
    const infoItems = document.querySelectorAll('.install-info-item');

    // 初始化时设置默认命令
    if (commandElement && installCommands[0]) {
        commandElement.textContent = installCommands[0];
    }

    modeTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            // 更新活动状态
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 更新命令
            currentInstallMode = index;
            if (commandElement && installCommands[index]) {
                commandElement.textContent = installCommands[index];
            }

            // 更新信息显示
            infoItems.forEach(item => item.classList.remove('active'));
            const targetInfo = document.querySelector(`.install-info-item[data-mode="${index}"]`);
            if (targetInfo) {
                targetInfo.classList.add('active');
            }
        });
    });
}

// 复制命令功能
function copyCommand() {
    const command = installCommands[currentInstallMode];
    const button = document.querySelector('.copy-btn');
    
    if (!button) return;
    
    // 尝试使用现代 API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(command).then(() => {
            showCopySuccess(button);
        }).catch(() => {
            fallbackCopy(command, button);
        });
    } else {
        fallbackCopy(command, button);
    }
}

// 降级复制方案
function fallbackCopy(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess(button);
    } catch (err) {
        console.error('复制失败:', err);
    }
    
    document.body.removeChild(textArea);
}

// 显示复制成功状态
function showCopySuccess(button) {
    const originalText = button.textContent;
    button.textContent = '已复制!';
    button.classList.add('copied');
    
    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
    }, 2000);
}

// 示例标签页切换
function initExampleTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 更新按钮状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 更新内容显示
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab + '-tab') {
                    content.classList.add('active');
                }
            });
        });
    });
}

// 平滑滚动
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offsetTop = target.offsetTop - 80; // 考虑固定导航栏高度
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// 导航栏滚动效果
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // 添加/移除背景模糊效果
        if (currentScrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScrollY = currentScrollY;
    });
}

// 导航链接高亮
function initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-nav a[href^="#"]');
    
    if (sections.length === 0 || navLinks.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                
                // 更新导航链接状态
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + id) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        rootMargin: '-20% 0px -80% 0px'
    });
    
    sections.forEach(section => observer.observe(section));
}

// 延迟初始化导航高亮（避免与其他功能冲突）
setTimeout(initNavHighlight, 1000);

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K 聚焦搜索（如果有的话）
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // 这里可以添加搜索功能
    }
    
    // Ctrl/Cmd + C 复制当前安装命令
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.target.closest('.command-box')) {
        e.preventDefault();
        copyCommand();
    }
});

// 性能优化：防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 窗口大小改变时的响应式处理
window.addEventListener('resize', debounce(() => {
    // 这里可以添加响应式调整逻辑
}, 250));

// 通用代码复制功能（用于三步快速开始等代码块）
function copyCode(button) {
    const codeContainer = button.closest('.code-container');
    const codeElement = codeContainer.querySelector('code');

    if (!codeElement) return;

    const text = codeElement.textContent;

    // 尝试使用现代 API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(button);
        }).catch(() => {
            fallbackCopy(text, button);
        });
    } else {
        fallbackCopy(text, button);
    }
}

// 切换安装模式
function switchInstallMode(mode) {
    // 更新选项卡状态
    const tabs = document.querySelectorAll('.mode-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // 激活当前选项卡
    const activeTab = document.querySelector(`.mode-tab[onclick="switchInstallMode('${mode}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // 更新安装内容显示
    const installModes = document.querySelectorAll('.install-mode');
    installModes.forEach(modeDiv => {
        modeDiv.classList.remove('active');
    });

    // 显示对应的安装模式
    const targetMode = document.getElementById(`${mode}-install`);
    if (targetMode) {
        targetMode.classList.add('active');
    }
}

// 暴露全局函数供HTML调用
window.copyCommand = copyCommand;
window.copyCode = copyCode;
window.switchInstallMode = switchInstallMode;
