// DevOps 文档页面交互功能

document.addEventListener('DOMContentLoaded', function() {
    initSidebarNavigation();
    initCodeCopyButtons();
    initSidebarToggle();
    initScrollSpy();
});

// 侧边栏导航
function initSidebarNavigation() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.docs-section');
    
    // 点击侧边栏链接平滑滚动
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // 考虑固定导航栏
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // 更新活动状态
                updateActiveLink(link);
                
                // 移动端关闭侧边栏
                if (window.innerWidth <= 1024) {
                    closeSidebar();
                }
            }
        });
    });
}

// 更新活动链接
function updateActiveLink(activeLink) {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
}

// 代码复制功能
function initCodeCopyButtons() {
    const codeBlocks = document.querySelectorAll('.code-block');
    
    codeBlocks.forEach(block => {
        const copyBtn = block.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                copyCodeBlock(block, copyBtn);
            });
        }
    });
}

// 复制代码块内容
function copyCodeBlock(codeBlock, button) {
    const code = codeBlock.querySelector('code');
    if (!code) return;
    
    const text = code.textContent || code.innerText;
    
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
        button.textContent = '复制失败';
        setTimeout(() => {
            button.textContent = '复制';
        }, 2000);
    }
    
    document.body.removeChild(textArea);
}

// 显示复制成功状态
function showCopySuccess(button) {
    const originalText = button.textContent;
    button.textContent = '已复制!';
    button.style.background = 'var(--success)';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
    }, 2000);
}

// 移动端侧边栏切换
function initSidebarToggle() {
    // 创建移动端菜单按钮
    if (window.innerWidth <= 1024) {
        createMobileMenuButton();
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', debounce(() => {
        if (window.innerWidth <= 1024) {
            createMobileMenuButton();
        } else {
            removeMobileMenuButton();
            openSidebar(); // 桌面端始终显示侧边栏
        }
    }, 250));
}

// 创建移动端菜单按钮
function createMobileMenuButton() {
    let menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) return; // 已存在
    
    menuBtn = document.createElement('button');
    menuBtn.id = 'mobile-menu-btn';
    menuBtn.className = 'mobile-menu-btn';
    menuBtn.innerHTML = '📚';
    menuBtn.setAttribute('aria-label', '打开文档导航');
    menuBtn.style.cssText = `
        position: fixed;
        top: 80px;
        left: 20px;
        z-index: 1001;
        background: var(--primary);
        color: var(--text-inverse);
        border: none;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        font-size: 1.2rem;
        cursor: pointer;
        box-shadow: var(--shadow-lg);
        transition: all 0.2s ease;
    `;
    
    menuBtn.addEventListener('click', toggleSidebar);
    document.body.appendChild(menuBtn);
}

// 移除移动端菜单按钮
function removeMobileMenuButton() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
        menuBtn.remove();
    }
}

// 切换侧边栏
function toggleSidebar() {
    const sidebar = document.querySelector('.docs-sidebar');
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// 打开侧边栏
function openSidebar() {
    const sidebar = document.querySelector('.docs-sidebar');
    sidebar.classList.add('open');
    
    // 添加遮罩层
    if (window.innerWidth <= 1024) {
        createOverlay();
    }
}

// 关闭侧边栏
function closeSidebar() {
    const sidebar = document.querySelector('.docs-sidebar');
    sidebar.classList.remove('open');
    removeOverlay();
}

// 创建遮罩层
function createOverlay() {
    let overlay = document.getElementById('sidebar-overlay');
    if (overlay) return;
    
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
    
    // 触发动画
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
}

// 移除遮罩层
function removeOverlay() {
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// 滚动监听，自动高亮当前章节
function initScrollSpy() {
    const sections = document.querySelectorAll('.docs-section');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    if (sections.length === 0 || sidebarLinks.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                const correspondingLink = document.querySelector(`.sidebar-link[href="#${id}"]`);
                
                if (correspondingLink) {
                    updateActiveLink(correspondingLink);
                }
            }
        });
    }, {
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0.1
    });
    
    sections.forEach(section => observer.observe(section));
}

// 全局复制代码函数（供HTML调用）
function copyCode(button) {
    const codeBlock = button.closest('.code-block');
    if (codeBlock) {
        copyCodeBlock(codeBlock, button);
    }
}

// 搜索功能（可选）
function initSearch() {
    const searchInput = document.getElementById('docs-search');
    if (!searchInput) return;
    
    const sections = document.querySelectorAll('.docs-section');
    
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === '') {
            // 显示所有章节
            sections.forEach(section => {
                section.style.display = 'block';
            });
            return;
        }
        
        // 搜索匹配的章节
        sections.forEach(section => {
            const text = section.textContent.toLowerCase();
            if (text.includes(query)) {
                section.style.display = 'block';
                // 高亮匹配的文本
                highlightText(section, query);
            } else {
                section.style.display = 'none';
            }
        });
    }, 300));
}

// 高亮搜索文本
function highlightText(element, query) {
    // 这里可以实现文本高亮功能
    // 为了简化，暂时不实现
}

// 防抖函数
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

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // ESC 键关闭侧边栏
    if (e.key === 'Escape') {
        closeSidebar();
    }
    
    // Ctrl/Cmd + K 聚焦搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('docs-search');
        if (searchInput) {
            searchInput.focus();
        }
    }
});

// 暴露全局函数
window.copyCode = copyCode;
window.toggleSidebar = toggleSidebar;
