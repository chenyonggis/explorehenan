/**
 * 河南地图相关功能JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化地图类型选择功能
    initializeMapTypeSelection();
    
    // 初始化地图控制功能
    initializeMapControls();
    
    // 初始化地图信息标签页
    initializeMapTabs();
});

/**
 * 初始化地图类型选择功能
 */
function initializeMapTypeSelection() {
    const mapTypes = document.querySelectorAll('.map-type');
    const mapImage = document.getElementById('map-image');
    
    if (!mapTypes.length || !mapImage) return;
    
    mapTypes.forEach(type => {
        type.addEventListener('click', function() {
            // 移除所有类型的活动状态
            mapTypes.forEach(item => {
                item.classList.remove('active');
            });
            
            // 为当前点击的类型添加活动状态
            this.classList.add('active');
            
            // 获取地图类型
            const mapType = this.getAttribute('data-type');
            
            // 更新地图图像和信息
            updateMapContent(mapType);
        });
    });
}

/**
 * 根据选择的地图类型更新地图内容
 * @param {string} mapType - 地图类型
 */
function updateMapContent(mapType) {
    const mapImage = document.getElementById('map-image');
    const infoTitle = document.querySelector('.info-title');
    const infoText = document.querySelector('.info-text');
    
    if (!mapImage || !infoTitle || !infoText) return;
    
    // 根据地图类型更新内容
    switch(mapType) {
        case 'administrative':
            mapImage.src = '../images/henan-administrative.jpg';
            mapImage.alt = '河南政区地图';
            infoTitle.textContent = '河南省政区地图概述';
            infoText.textContent = '河南省位于中国中部，黄河中下游，总面积约16.7万平方公里。全省共辖17个省辖市，1个省直管县级市，共有158个县（市、区）。河南省地处中华腹地，是中华民族与华夏文明的重要发祥地。';
            break;
        case 'historical':
            mapImage.src = '../images/henan-historical.jpg';
            mapImage.alt = '河南历史地图';
            infoTitle.textContent = '河南省历史地图概述';
            infoText.textContent = '河南历史悠久，是中华文明的重要发祥地，拥有贯穿古今的历史脉络。自新石器时代起，这里就有人类活动的痕迹。夏、商、周、汉、隋、唐等多个朝代都曾在此建都，留下了丰富的历史文化遗产。';
            break;
        case 'cultural':
            mapImage.src = '../images/henan-cultural.jpg';
            mapImage.alt = '河南人文地图';
            infoTitle.textContent = '河南省人文地图概述';
            infoText.textContent = '河南人文底蕴深厚，是中华文明的重要发祥地。省内分布有众多文化遗产和名胜古迹，如龙门石窟、白马寺、少林寺等。此外，河南戏曲、民间艺术和传统手工艺也是中国文化的重要组成部分。';
            break;
        case 'natural':
            mapImage.src = '../images/henan-natural.jpg';
            mapImage.alt = '河南自然地图';
            infoTitle.textContent = '河南省自然地图概述';
            infoText.textContent = '河南地形多样，地势西高东低，西部是崇山峻岭，东部是广阔平原。省内有黄河、淮河两大水系，气候属于温带季风气候和亚热带季风气候的过渡带。自然资源丰富，矿产资源种类多、储量大。';
            break;
        case 'planning':
            mapImage.src = '../images/henan-planning.jpg';
            mapImage.alt = '河南规划地图';
            infoTitle.textContent = '河南省规划地图概述';
            infoText.textContent = '河南省规划以郑州为中心，构建"一核多极"的城市发展格局。根据"十四五"规划，河南将加快推进郑州都市圈建设，打造洛阳都市圈，培育区域中心城市，发展特色节点城市，构建高质量发展的城镇化空间格局。';
            break;
    }
    
    // 重置地图缩放级别
    resetMapZoom();
}

/**
 * 初始化地图控制功能
 */
function initializeMapControls() {
    const mapView = document.getElementById('map-view');
    const mapImage = document.getElementById('map-image');
    const zoomInBtn = document.querySelector('.zoom-in');
    const zoomOutBtn = document.querySelector('.zoom-out');
    const fullscreenBtn = document.querySelector('.fullscreen');
    const downloadBtn = document.querySelector('.download');
    
    if (!mapView || !mapImage || !zoomInBtn || !zoomOutBtn || !fullscreenBtn || !downloadBtn) return;
    
    let scale = 1;
    let panning = false;
    let pointX = 0;
    let pointY = 0;
    let start = { x: 0, y: 0 };
    let isFullscreen = false;
    
    // 放大地图按钮
    zoomInBtn.addEventListener('click', function() {
        scale *= 1.2;
        mapImage.style.transform = `scale(${scale}) translate(${pointX}px, ${pointY}px)`;
    });
    
    // 缩小地图按钮
    zoomOutBtn.addEventListener('click', function() {
        scale /= 1.2;
        if (scale < 1) scale = 1;
        mapImage.style.transform = `scale(${scale}) translate(${pointX}px, ${pointY}px)`;
    });
    
    // 全屏显示按钮
    fullscreenBtn.addEventListener('click', function() {
        toggleFullscreen(mapView);
    });
    
    // 下载地图按钮
    downloadBtn.addEventListener('click', function() {
        // 模拟下载功能
        alert('地图下载功能即将上线，敬请期待！');
    });
    
    // 地图平移功能
    mapView.addEventListener('mousedown', function(e) {
        e.preventDefault();
        start = { x: e.clientX - pointX, y: e.clientY - pointY };
        panning = true;
    });
    
    mapView.addEventListener('mousemove', function(e) {
        if (!panning) return;
        e.preventDefault();
        pointX = (e.clientX - start.x);
        pointY = (e.clientY - start.y);
        mapImage.style.transform = `scale(${scale}) translate(${pointX}px, ${pointY}px)`;
    });
    
    mapView.addEventListener('mouseup', function(e) {
        panning = false;
    });
    
    mapView.addEventListener('mouseleave', function(e) {
        panning = false;
    });
    
    // 窗口大小改变时重置地图
    window.addEventListener('resize', function() {
        if (!isFullscreen) {
            resetMapZoom();
        }
    });
    
    // 检测全屏变化
    document.addEventListener('fullscreenchange', function() {
        isFullscreen = !!document.fullscreenElement;
        
        if (!isFullscreen) {
            resetMapZoom();
        }
    });
}

/**
 * 重置地图缩放和位置
 */
function resetMapZoom() {
    const mapImage = document.getElementById('map-image');
    
    if (!mapImage) return;
    
    mapImage.style.transform = 'scale(1) translate(0px, 0px)';
}

/**
 * 切换全屏显示
 * @param {HTMLElement} element - 要全屏显示的元素
 */
function toggleFullscreen(element) {
    if (!document.fullscreenElement) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) { /* Safari */
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { /* IE11 */
            element.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
    }
}

/**
 * 初始化地图信息标签页
 */
function initializeMapTabs() {
    const tabButtons = document.querySelectorAll('.map-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有标签的活动状态
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 为当前点击的标签添加活动状态
            this.classList.add('active');
            
            // 获取标签页名称
            const tabName = this.getAttribute('data-tab');
            
            // 更新标签页内容
            updateTabContent(tabName);
        });
    });
}

/**
 * 更新标签页内容
 * @param {string} tabName - 标签页名称
 */
function updateTabContent(tabName) {
    const mapInfo = document.querySelector('.map-info');
    const currentContent = document.querySelector('.map-tab-content');
    
    if (!mapInfo || !currentContent) return;
    
    // 移除当前内容
    currentContent.remove();
    
    // 创建新内容
    const newContent = document.createElement('div');
    newContent.className = 'map-tab-content';
    newContent.id = `${tabName}-content`;
    
    // 根据标签页类型设置内容
    switch(tabName) {
        case 'overview':
            newContent.innerHTML = `
                <h3 class="info-title">河南省政区地图概述</h3>
                <p class="info-text">
                    河南省位于中国中部，黄河中下游，总面积约16.7万平方公里。全省共辖17个省辖市，1个省直管县级市，共有158个县（市、区）。
                    河南省地处中华腹地，是中华民族与华夏文明的重要发祥地。
                </p>
                <div class="info-stats">
                    <div class="info-stat-item">
                        <div class="stat-value">16.7万</div>
                        <div class="stat-label">面积（平方公里）</div>
                    </div>
                    <div class="info-stat-item">
                        <div class="stat-value">9,605万</div>
                        <div class="stat-label">人口（2020年）</div>
                    </div>
                    <div class="info-stat-item">
                        <div class="stat-value">17+1</div>
                        <div class="stat-label">地级市数量</div>
                    </div>
                </div>
            `;
            break;
        case 'details':
            newContent.innerHTML = `
                <h3 class="info-title">河南省政区详情</h3>
                <p class="info-text">
                    河南省辖17个省辖市：郑州市、开封市、洛阳市、平顶山市、安阳市、鹤壁市、新乡市、焦作市、濮阳市、许昌市、漯河市、三门峡市、南阳市、商丘市、信阳市、周口市、驻马店市；1个省直管县级市：济源市。
                </p>
                <p class="info-text">
                    省会郑州市是国家重要的综合交通枢纽和中部地区重要的中心城市。洛阳市是中国历史文化名城，曾先后被定为夏、商、周、汉、魏、晋、隋、唐等十三个朝代的都城。
                </p>
            `;
            break;
        case 'legend':
            newContent.innerHTML = `
                <h3 class="info-title">地图图例说明</h3>
                <div class="map-legend">
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #e74c3c;"></div>
                        <div class="legend-label">省会城市</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #3498db;"></div>
                        <div class="legend-label">地级市</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #2ecc71;"></div>
                        <div class="legend-label">县级市</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #f1c40f;"></div>
                        <div class="legend-label">县</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-line"></div>
                        <div class="legend-label">省界</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-line" style="border-style: dashed;"></div>
                        <div class="legend-label">市界</div>
                    </div>
                </div>
            `;
            break;
    }
    
    // 将新内容添加到地图信息区域
    mapInfo.appendChild(newContent);
} 