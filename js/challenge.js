/**
 * 每日挑战相关功能JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化排行榜选项卡功能
    initializeLeaderboardTabs();
    
    // 模拟加载进度数据
    simulateProgressData();
});

/**
 * 初始化排行榜选项卡功能
 */
function initializeLeaderboardTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的活动状态
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 为当前点击的按钮添加活动状态
            this.classList.add('active');
            
            // 获取选项卡名称
            const tabName = this.getAttribute('data-tab');
            
            // 加载对应的排行榜数据
            loadLeaderboardData(tabName);
        });
    });
}

/**
 * 加载排行榜数据
 * @param {string} tabName - 排行榜类型
 */
function loadLeaderboardData(tabName) {
    // 这里模拟从服务器加载数据
    console.log(`加载 ${tabName} 排行榜数据...`);
    
    // 清空当前排行榜内容
    const leaderboardContent = document.querySelector('.leaderboard-content');
    leaderboardContent.innerHTML = '';
    
    // 创建新的排行榜列表
    const leaderboardList = document.createElement('div');
    leaderboardList.className = 'leaderboard-list';
    leaderboardList.id = `${tabName}-leaderboard`;
    
    // 模拟不同时间段的排行榜数据
    let data = [];
    
    switch(tabName) {
        case 'daily':
            data = [
                { rank: 1, name: '用户A', score: 250 },
                { rank: 2, name: '用户B', score: 220 },
                { rank: 3, name: '用户C', score: 190 },
                { rank: 4, name: '用户D', score: 180 },
                { rank: 5, name: '用户E', score: 150 }
            ];
            break;
        case 'weekly':
            data = [
                { rank: 1, name: '用户F', score: 1250 },
                { rank: 2, name: '用户G', score: 1100 },
                { rank: 3, name: '用户A', score: 980 },
                { rank: 4, name: '用户H', score: 920 },
                { rank: 5, name: '用户I', score: 850 }
            ];
            break;
        case 'monthly':
            data = [
                { rank: 1, name: '用户J', score: 5200 },
                { rank: 2, name: '用户K', score: 4800 },
                { rank: 3, name: '用户L', score: 4500 },
                { rank: 4, name: '用户F', score: 4200 },
                { rank: 5, name: '用户M', score: 3900 }
            ];
            break;
        case 'all-time':
            data = [
                { rank: 1, name: '用户N', score: 25800 },
                { rank: 2, name: '用户O', score: 24500 },
                { rank: 3, name: '用户P', score: 23200 },
                { rank: 4, name: '用户Q', score: 22000 },
                { rank: 5, name: '用户R', score: 21500 }
            ];
            break;
    }
    
    // 生成排行榜项
    data.forEach(item => {
        const leaderboardItem = document.createElement('div');
        leaderboardItem.className = 'leaderboard-item';
        
        leaderboardItem.innerHTML = `
            <span class="leaderboard-rank">${item.rank}</span>
            <span class="leaderboard-name">${item.name}</span>
            <span class="leaderboard-score">${item.score}分</span>
        `;
        
        leaderboardList.appendChild(leaderboardItem);
    });
    
    // 将排行榜添加到内容区域
    leaderboardContent.appendChild(leaderboardList);
}

/**
 * 模拟加载进度数据
 */
function simulateProgressData() {
    // 模拟加载用户进度数据
    setTimeout(function() {
        updateProgressBars({
            daily: { completed: 2, total: 4, percentage: 50 },
            weekly: { completed: 10, total: 28, percentage: 35.7 },
            total: { completed: 45, total: 100, percentage: 45 }
        });
    }, 1000);
}

/**
 * 更新进度条
 * @param {Object} progressData - 进度数据
 */
function updateProgressBars(progressData) {
    // 更新今日挑战进度
    const dailyValueElement = document.querySelector('.progress-item:nth-child(1) .progress-value');
    const dailyFillElement = document.querySelector('.progress-item:nth-child(1) .progress-fill');
    
    if (dailyValueElement) {
        dailyValueElement.textContent = `${progressData.daily.completed}/${progressData.daily.total}`;
    }
    
    if (dailyFillElement) {
        dailyFillElement.style.width = `${progressData.daily.percentage}%`;
    }
    
    // 更新本周挑战进度
    const weeklyValueElement = document.querySelector('.progress-item:nth-child(2) .progress-value');
    const weeklyFillElement = document.querySelector('.progress-item:nth-child(2) .progress-fill');
    
    if (weeklyValueElement) {
        weeklyValueElement.textContent = `${progressData.weekly.completed}/${progressData.weekly.total}`;
    }
    
    if (weeklyFillElement) {
        weeklyFillElement.style.width = `${progressData.weekly.percentage}%`;
    }
    
    // 更新总体完成进度
    const totalValueElement = document.querySelector('.progress-item:nth-child(3) .progress-value');
    const totalFillElement = document.querySelector('.progress-item:nth-child(3) .progress-fill');
    
    if (totalValueElement) {
        totalValueElement.textContent = `${progressData.total.completed}/${progressData.total.total}`;
    }
    
    if (totalFillElement) {
        totalFillElement.style.width = `${progressData.total.percentage}%`;
    }
} 