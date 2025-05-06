/**
 * 河南地理知识挑战网站主JavaScript文件
 */

// 在页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 获取当前页面的路径
    const currentPath = window.location.pathname;
    
    // 高亮当前页面的导航链接
    highlightCurrentNav(currentPath);
    
    // 不再调用图片加载效果函数
    // setupImageLoading();
});

/**
 * 高亮当前页面的导航链接
 * @param {string} path - 当前页面路径
 */
function highlightCurrentNav(path) {
    const navLinks = document.querySelectorAll('.navbar-link');
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        
        // 检查当前路径是否包含链接路径
        if (path.includes(linkPath) && linkPath !== 'index.html') {
            // 不再添加任何样式
        } else if (path.endsWith('index.html') && linkPath === 'index.html') {
            // 不再添加任何样式
        }
    });
}

/**
 * 设置图片加载效果 - 已禁用
 */
function setupImageLoading() {
    // 此函数已被禁用，图片将直接显示
    // 保留函数定义以避免可能的引用错误
}

/**
 * 创建返回顶部按钮
 */
window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const backToTopBtn = document.getElementById('back-to-top');
    
    if (!backToTopBtn && scrollTop > 300) {
        createBackToTopButton();
    } else if (backToTopBtn) {
        if (scrollTop > 300) {
            backToTopBtn.style.display = 'block';
        } else {
            backToTopBtn.style.display = 'none';
        }
    }
});

/**
 * 创建返回顶部按钮
 */
function createBackToTopButton() {
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.innerHTML = '↑';
    btn.title = '返回顶部';
    
    // 设置按钮样式
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.width = '40px';
    btn.style.height = '40px';
    btn.style.borderRadius = '50%';
    btn.style.backgroundColor = '#e74c3c';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.fontSize = '20px';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = '999';
    btn.style.display = 'none';
    
    // 添加点击事件，返回顶部
    btn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    document.body.appendChild(btn);
} 