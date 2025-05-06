/**
 * 足迹地图相关功能JavaScript
 */

// 全局变量
let currentMapType = 'city'; // 当前地图类型：'city'或'county'
let cityMap = null; // 地市级别的ECharts实例
let countyMap = null; // 县区级别的ECharts实例
let visitedCities = {}; // 已访问地市数据
let visitedCounties = {}; // 已访问县区数据
let activeCities = []; // 当前选中的地市
let activeCounties = []; // 当前选中的县区
let cityCountyMap = {}; // 城市与区县的映射关系
let cityAdcodeMap = {}; // 存储城市adcode与名称的对应关系
let cityAdcodeSortMap = {}; // 存储城市adcode与排序的关系
let currentMapStyle = 'natural'; // 当前地图风格：'natural', 'tech', 'warm'
let cityData = [];
let countyData = [];

// 定义三种风格的地图颜色配置
const mapStyles = {
    // 清新自然风格 - 莫兰迪绿色系
    natural: {
        unvisited: '#e8f0e6', // 淡灰绿色
        visited: '#8ba889',   // 灰绿色
        selected: 'rgb(191,242,188)',  // 新的选中状态填充色
        borderColor: {
            city: '#85a380',     // 较深的灰绿色边界
            county: '#afc5aa'    // 中等深度的灰绿色边界
        },
        emphasisColor: '#526b56' // 橄榄绿高亮
    },
    // 科技时尚风格 - 莫兰迪蓝色系
    tech: {
        unvisited: '#e7edf0', // 淡灰蓝色
        visited: '#8da7b9',   // 灰蓝色
        selected: 'rgb(127,215,247)',  // 新的选中状态填充色
        borderColor: {
            city: '#7593a7',     // 较深的灰蓝色边界
            county: '#a0b5c4'    // 中等深度的灰蓝色边界
        },
        emphasisColor: '#516d82' // 灰蓝色高亮
    },
    // 温暖活力风格 - 莫兰迪暖色系
    warm: {
        unvisited: '#f0e9e6', // 淡灰米色
        visited: '#c2a499',   // 灰棕色
        selected: 'rgb(249,198,213)',  // 新的选中状态填充色
        borderColor: {
            city: '#b08e81',     // 较深的灰棕色边界
            county: '#c9b0a6'    // 中等深度的灰米色边界
        },
        emphasisColor: '#8a6e62' // 灰棕色高亮
    }
};

// 地图实例
let chart = null;

    // 初始化地图
async function initMap() {
    try {
        const mapContainer = document.getElementById('map-chart');
        if (!mapContainer) {
            throw new Error('找不到地图容器');
        }
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        mapContainer.style.minHeight = '400px';
        chart = echarts.init(mapContainer);
        currentMapType = 'city';
        await loadHenanMap();
        updateMap();
        window.addEventListener('resize', () => {
            if (chart) {
                chart.resize();
                mapContainer.style.width = '100%';
            }
        });
        initToolbarButtons();
        // 强制resize，确保宽度
        setTimeout(() => { if (chart) chart.resize(); }, 200);
        return true;
    } catch (err) {
        console.error('地图初始化失败:', err);
        return false;
    }
}

// 切换地图类型
function switchMapType(type) {
    if (type === currentMapType) return;
    currentMapType = type;
    const mapContainer = document.getElementById('map-chart');
    if (!mapContainer) {
        console.error('找不到地图容器');
        return;
    }
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';
    mapContainer.style.minHeight = '400px';
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-type') === type);
    });
    document.getElementById('city-list').style.display = type === 'city' ? 'flex' : 'none';
    document.getElementById('county-list').style.display = type === 'county' ? 'block' : 'none';

    // 切换时清空选中状态和计数
    if (type === 'city') {
        visitedCities = {};
    } else {
        visitedCounties = {};
    }

    if (type === 'city') {
        loadHenanMap(chart);
    } else {
        loadHenanCountyMap();
    }
    updateVisitedCount(type);
    
    // 重置标签显示按钮状态
    const labelToggleBtn = document.querySelector('.control-btn[title="切换高亮标签显示"]');
    if (labelToggleBtn) {
        labelToggleBtn.classList.remove('active');
        labelToggleBtn.style.backgroundColor = '#f8f8f8';
    }
    
    // 强制resize，确保宽度
    setTimeout(() => { if (chart) chart.resize(); }, 200);
}

// 加载河南地图数据（只地市）
async function loadHenanMap(chart) {
    try {
        const response = await fetch('../data/henan.json');
        if (!response.ok) {
            throw new Error('地图数据加载失败');
        }
        const mapData = await response.json();
        echarts.registerMap('henan', mapData);
        // 只处理地市数据
        cityData = mapData.features.map(feature => ({
            name: feature.properties.name,
            value: 0,
            adcode: feature.properties.adcode
        }));
        generateCityButtons(cityData);
        updateMap();
        return true;
    } catch (err) {
        console.error('加载河南地图数据失败:', err);
        return false;
    }
}

// 加载河南区县地图数据
function loadHenanCountyMap() {
    const mapChart = document.getElementById('map-chart');
    if (!mapChart) return;
    chart = echarts.init(mapChart);
    fetch('../data/henan-qx.json')
        .then(response => response.json())
        .then(data => {
            echarts.registerMap('henan-qx', data);
            // 只处理区县数据
            countyData = data.features.map(feature => ({
                name: feature.properties.name,
                value: 0,
                adcode: feature.properties.adcode,
                city: feature.properties.city
            }));
            generateCountyButtons();
            updateMap();
        })
        .catch(error => {
            console.error('加载河南县区地图数据失败:', error);
        });
}

// 优化后的地图更新函数
function updateMap() {
    // 调试输出
    console.log('cityData', cityData, 'countyData', countyData, 'currentMapType', currentMapType);
    if (!chart) return;
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}'
        },
        series: [{
            type: 'map',
            map: currentMapType === 'city' ? 'henan' : 'henan-qx',
            roam: true,
            selectedMode: 'multiple',
            zoom: 1.1,
            label: {
                show: currentMapType === 'city', // 地市显示标签，区县不显示
                fontSize: currentMapType === 'city' ? 12 : 8
            },
            itemStyle: {
                areaColor: mapStyles[currentMapStyle].unvisited,
                borderColor: mapStyles[currentMapStyle].borderColor[currentMapType]
            },
            emphasis: {
                label: {
                    show: currentMapType === 'city' // 地市高亮时显示标签，区县高亮时不显示标签
                },
                itemStyle: {
                    areaColor: mapStyles[currentMapStyle].emphasisColor
                }
            },
            select: {
                itemStyle: {
                    areaColor: mapStyles[currentMapStyle].selected
                }
            },
            data: currentMapType === 'city' ? cityData : countyData
        }]
    };
    chart.setOption(option, true);
    updateVisitedAreas();
    // 添加地图点击事件，切换访问状态并刷新统计
    chart.off('click'); // 先移除旧事件，避免重复
    chart.on('click', function(params) {
        if (currentMapType === 'city' && params.name) {
            if (!visitedCities[params.name]) {
                visitedCities[params.name] = { visited: true, date: new Date().toISOString().split('T')[0] };
            } else {
                delete visitedCities[params.name];
            }
            // 同步按钮高亮
            const btn = document.querySelector(`#city-list .city-btn[data-name="${params.name}"]`);
            if (btn) {
                btn.classList.toggle('active', !!visitedCities[params.name]);
                btn.classList.toggle('visited', !!visitedCities[params.name]);
            }
            updateVisitedAreas();
            updateVisitedCount('city');
        }
        if (currentMapType === 'county' && params.name) {
            if (!visitedCounties[params.name]) {
                visitedCounties[params.name] = { visited: true, date: new Date().toISOString().split('T')[0] };
            } else {
                delete visitedCounties[params.name];
            }
            // 同步按钮高亮
            const btn = document.querySelector(`#county-list .city-btn[data-name="${params.name}"]`);
            if (btn) {
                btn.classList.toggle('active', !!visitedCounties[params.name]);
                btn.classList.toggle('visited', !!visitedCounties[params.name]);
            }
            updateVisitedAreas();
            updateVisitedCount('county');
        }
    });
}

// 优化后的已访问区域更新函数
function updateVisitedAreas() {
    if (!chart) return;
    
    const data = chart.getOption().series[0].data;
    if (!data) return;
    
    const visitedData = currentMapType === 'city' ? visitedCities : visitedCounties;
    const style = mapStyles[currentMapStyle];
    
    const newData = data.map(item => ({
        ...item,
        itemStyle: {
            areaColor: visitedData[item.name] ? style.visited : style.unvisited
        }
    }));
    
            chart.setOption({
        series: [{
            data: newData
        }]
    });
    
    // 更新统计信息
    updateVisitedCount(currentMapType);
}

// 优化后的访问计数器初始化函数
function initVisitorCounter() {
    const elements = {
        visitedCount: document.getElementById('visited-count'),
        explorePercent: document.getElementById('explore-percent')
    };

    // 验证所需元素是否存在
    if (!Object.values(elements).every(Boolean)) {
        console.warn('访问计数器所需元素缺失');
        return;
    }

    try {
        // 获取访问数据
        const visitData = {
            cities: JSON.parse(localStorage.getItem('visitedCities') || '{}'),
            counties: JSON.parse(localStorage.getItem('visitedCounties') || '{}')
        };

        // 计算统计数据
        const stats = calculateVisitStats(visitData);
        
        // 确保数值有效
        const visitedCount = isNaN(stats.visitedCount) ? 0 : stats.visitedCount;
        const explorePercent = isNaN(stats.explorePercent) ? 0 : stats.explorePercent;
        
        // 使用动画更新显示
        animateCounter('visited-count', 0, visitedCount, 1000);
        animateCounter('explore-percent', 0, explorePercent, 1000);
        
    } catch (error) {
        console.error('初始化访问计数器时出错:', error);
        // 显示默认值
        elements.visitedCount.textContent = '0';
        elements.explorePercent.textContent = '0%';
    }
}

// 优化后的计算访问统计数据函数
function calculateVisitStats(visitData) {
    const totals = {
        cities: 18, // 河南省地级市总数
        counties: Object.values(cityCountyMap).reduce((sum, counties) => sum + counties.length, 0)
    };

    const counts = {
        cities: Object.keys(visitData.cities).length,
        counties: Object.keys(visitData.counties).length
    };

    return {
        visitedCount: counts[currentMapType],
        explorePercent: Math.round((counts[currentMapType] / totals[currentMapType]) * 100)
    };
}

// 优化后的计数器动画函数
function animateCounter(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // 使用 requestAnimationFrame 的时间戳进行平滑动画
    const startTime = performance.now();
    const range = end - start;

    // 使用 RAF 的递归调用进行动画
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用缓动函数使动画更自然
        const easeProgress = easeOutQuad(progress);
        const currentValue = Math.floor(start + (range * easeProgress));

        // 更新显示
        element.textContent = elementId.includes('percent') 
            ? `${currentValue}%`
            : currentValue.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
}

// 缓动函数
function easeOutQuad(t) {
    return t * (2 - t);
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    // 从本地存储获取上次使用的地图风格
    const savedStyle = localStorage.getItem('currentMapStyle');
    if (savedStyle && mapStyles[savedStyle]) {
        currentMapStyle = savedStyle;
    }

    // 初始化地图
    initMap();
    
    // 初始化访问计数器
    initVisitorCounter();
    
    // 初始化地图工具按钮
    addMapTools();
    
    // 初始化地图风格切换
    initMapStyleSwitch();
    
    // 初始化地市/县区切换
    initRegionTypeSwitch();
    
    // 预加载区县数据
    preloadCountyData();
});

/**
 * 预加载区县数据，建立映射关系
 */
async function preloadCountyData() {
    try {
        // 先加载河南地市数据以获取adcode映射
        const cityResponse = await fetch('../data/henan.json');
        const cityData = await cityResponse.json();
        
        // 建立城市adcode映射关系
        cityAdcodeMap = {};
        cityData.features.forEach(feature => {
            if (feature.properties && feature.properties.adcode && feature.properties.name) {
                cityAdcodeMap[feature.properties.adcode] = feature.properties.name;
            }
        });
        
        console.log('城市adcode映射关系:', cityAdcodeMap);
    
    // 加载河南县区地图数据
        const countyResponse = await fetch('../data/henan-qx.json');
        const data = await countyResponse.json();
        
            // 已访问县区数据（默认为空，实际应从服务器获取）
            visitedCounties = {};
            
            // 准备地图数据和构建城市与区县的映射关系
            cityCountyMap = {};
            
            // 处理数据，通过adcode建立城市与区县的映射关系
            data.features.forEach(feature => {
                if (!feature.properties) {
                    console.warn('区县数据缺少properties字段');
                    return;
                }
                
                const name = feature.properties.name;
                
                // 特殊处理济源市
                if (name === '济源市') {
                    if (!cityCountyMap['济源市']) {
                        cityCountyMap['济源市'] = [];
                    }
                    
                    cityCountyMap['济源市'].push({
                        name: name,
                        visited: visitedCounties[name] && visitedCounties[name].visited,
                        date: visitedCounties[name] ? visitedCounties[name].date : null,
                        adcode: feature.properties.adcode,
                    parentAdcode: feature.properties.adcode
                    });
                    
                return;
                }
                
                // 确保parent属性及adcode存在
                if (!feature.properties.parent || !feature.properties.parent.adcode) {
                    console.warn(`区县 ${name} 没有正确的父级adcode信息`);
                    return;
                }
                
                const parentAdcode = feature.properties.parent.adcode;
                
                // 根据父级adcode查找对应的城市名称
                const cityName = cityAdcodeMap[parentAdcode];
                
                if (!cityName) {
                    console.warn(`找不到adcode为 ${parentAdcode} 的城市，区县: ${name}`);
                    return;
                }
                
                // 构建城市与区县的映射关系
                if (!cityCountyMap[cityName]) {
                    cityCountyMap[cityName] = [];
                }
                
                cityCountyMap[cityName].push({
                    name: name,
                    visited: visitedCounties[name] && visitedCounties[name].visited,
                    date: visitedCounties[name] ? visitedCounties[name].date : null,
                    adcode: feature.properties.adcode,
                    parentAdcode: parentAdcode
                });
            });
            
            console.log('预加载区县数据完成，城市与区县映射关系:', cityCountyMap);
        
    } catch (error) {
        console.error('预加载数据失败:', error);
            console.error('详细错误信息:', error.message);
    }
}

// 生成地市按钮列表
function generateCityButtons(features) {
    const cityList = document.getElementById('city-list');
    cityList.innerHTML = '';
    
    if (!features || features.length === 0) {
        console.error('没有地市数据');
        return;
    }
    
    features.forEach(feature => {
        const name = feature.name;  // 直接使用name属性
        const btnClass = visitedCities[name] && visitedCities[name].visited ? 'city-btn visited active' : 'city-btn';
        
        const btn = document.createElement('a');
        btn.href = '#';
        btn.className = btnClass;
        btn.textContent = name;
        btn.setAttribute('data-name', name);
        
        // 添加点击事件
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const isActive = btn.classList.toggle('active');
            if (isActive) {
                visitedCities[name] = { visited: true, date: new Date().toISOString().split('T')[0] };
                btn.classList.add('visited');
                // 地图高亮
                chart.dispatchAction({ type: 'mapSelect', name });
            } else {
                delete visitedCities[name];
                btn.classList.remove('visited');
                // 地图取消高亮
                chart.dispatchAction({ type: 'mapUnSelect', name });
            }
            updateVisitedAreas();
            updateVisitedCount('city');
        });
        
        cityList.appendChild(btn);
    });
}

// 生成县区按钮列表（按城市分组）
function generateCountyButtons() {
    const countyList = document.getElementById('county-list');
    countyList.innerHTML = '';
    
    // 检查映射数据是否存在
    if (Object.keys(cityCountyMap).length === 0) {
        console.error('没有区县数据或区县数据不完整');
        
        // 尝试重新加载河南县区地图数据
        loadHenanCountyMap();
        return;
    }
    
    // 河南省地市的正确顺序
    const cityOrder = [
        '郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市', '新乡市', 
        '焦作市', '濮阳市', '许昌市', '漯河市', '三门峡市', '南阳市', 
        '商丘市', '信阳市', '周口市', '驻马店市', '济源市'
    ];
    
    // 按城市创建区县分组，按照正确顺序
    cityOrder.forEach(city => {
        // 确保城市在映射中并且有区县数据
        if (!cityCountyMap[city] || cityCountyMap[city].length === 0) {
            console.warn(`城市 ${city} 下没有区县数据`);
            return;
        }
        
        // 创建城市分组容器
        const cityGroup = document.createElement('div');
        cityGroup.className = 'city-group';
        
        // 添加城市标题及其区县列表（水平排列）
        const cityTitle = document.createElement('div');
        cityTitle.className = 'city-title';
        
        // 创建城市名称标签和冒号
        const cityNameSpan = document.createElement('span');
        cityNameSpan.textContent = city + `（${cityCountyMap[city].length}）：`;
        cityTitle.appendChild(cityNameSpan);
        
        // 创建区县按钮容器（内联显示）
        const countyButtons = document.createElement('div');
        countyButtons.className = 'county-buttons inline';
        
        // 对区县按adcode排序
        cityCountyMap[city].sort((a, b) => {
            return a.adcode - b.adcode;
        });
        
        // 添加区县按钮
        cityCountyMap[city].forEach(county => {
            if (!county || !county.name) {
                console.warn('区县数据不完整:', county);
                return;
            }
            
            const btnClass = county.visited ? 'city-btn visited active' : 'city-btn';
            
            const btn = document.createElement('a');
            btn.href = '#';
            btn.className = btnClass;
            btn.textContent = county.name;
            btn.setAttribute('data-name', county.name);
            
            // 添加点击事件
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const isActive = btn.classList.toggle('active');
                if (isActive) {
                    visitedCounties[county.name] = { visited: true, date: new Date().toISOString().split('T')[0] };
                    btn.classList.add('visited');
                    chart.dispatchAction({ type: 'mapSelect', name: county.name });
                } else {
                    delete visitedCounties[county.name];
                    btn.classList.remove('visited');
                    chart.dispatchAction({ type: 'mapUnSelect', name: county.name });
                }
                updateVisitedAreas();
                updateVisitedCount('county');
            });
            
            countyButtons.appendChild(btn);
        });
        
        cityTitle.appendChild(countyButtons);
        cityGroup.appendChild(cityTitle);
        countyList.appendChild(cityGroup);
    });
}

// 更新已访问数量统计
function updateVisitedCount(type) {
    let visitedCountElement = document.getElementById('visited-count');
    let explorePercentElement = document.getElementById('explore-percent');
    if (!visitedCountElement || !explorePercentElement) {
        // 延迟重试，最多重试10次
        if (!window._updateVisitedCountRetry) window._updateVisitedCountRetry = 0;
        if (window._updateVisitedCountRetry < 10) {
            window._updateVisitedCountRetry++;
            setTimeout(() => updateVisitedCount(type), 100);
        }
        return;
    }
    window._updateVisitedCountRetry = 0; // 成功后重置
    if (type === 'city') {
        // 计算已访问的地市数量
        const visitedCount = Object.values(visitedCities).filter(city => city.visited).length;
        const totalCities = 18; // 河南省共18个地级市
        const explorePercent = Math.round((visitedCount / totalCities) * 100);
        // 更新显示
        visitedCountElement.textContent = visitedCount;
        explorePercentElement.textContent = explorePercent + '%';
        // 更新统计文本，带id
        const statsText = document.querySelector('.visit-stats p');
        if (statsText) {
            statsText.innerHTML = `您已到过 <span class="highlight" id="visited-count">${visitedCount}</span> 地，探索了 <span class="highlight" id="explore-percent">${explorePercent}%</span> 的河南`;
        }
    } else {
        // 计算已访问的县区数量和对应的地市数量
        const visitedCountiesNum = Object.values(visitedCounties).filter(county => county.visited).length;
        // 新逻辑：统计有下属县区被访问过的地市数量
        const visitedCitySet = new Set();
        for (const countyName in visitedCounties) {
            if (visitedCounties[countyName] && visitedCounties[countyName].visited) {
                for (const city in cityCountyMap) {
                    if (cityCountyMap[city].some(c => c.name === countyName)) {
                        visitedCitySet.add(city);
                        break;
                    }
                }
            }
        }
        const visitedCityCount = visitedCitySet.size;
        const totalCounties = Object.values(cityCountyMap).reduce((sum, counties) => sum + counties.length, 0);
        const explorePercent = Math.round((visitedCountiesNum / totalCounties) * 100);
        // 更新统计文本，带id
        const statsText = document.querySelector('.visit-stats p');
        if (statsText) {
            statsText.innerHTML = `您已到过 <span class=\"highlight\">${visitedCityCount}</span>地<span class=\"highlight\" id=\"visited-count\">${visitedCountiesNum}</span>县，探索了 <span class=\"highlight\" id=\"explore-percent\">${explorePercent}%</span> 的河南`;
        }
    }
}

/**
 * 初始化足迹统计
 */
function initFootprintStats() {
    // 检查足迹统计元素是否存在
    const totalRegionsElem = document.querySelector('.total-regions .stat-value');
    const visitedRegionsElem = document.querySelector('.visited-regions .stat-value');
    const completionRateElem = document.querySelector('.completion-rate .stat-value');
    const recentVisitsElem = document.querySelector('.recent-visits .stat-value');
    const progressBar = document.querySelector('.progress');
    
    // 如果元素不存在，则退出函数
    if (!totalRegionsElem || !visitedRegionsElem || !completionRateElem || !recentVisitsElem || !progressBar) {
        console.log('足迹统计元素不存在，跳过初始化');
        return;
    }
    
    // 模拟统计数据
    const statsData = {
        totalRegions: 17,
        visitedRegions: 5,
        completionRate: 29.4,
        recentVisits: 3
    };
    
    // 更新统计显示
    totalRegionsElem.textContent = statsData.totalRegions;
    visitedRegionsElem.textContent = statsData.visitedRegions;
    completionRateElem.textContent = statsData.completionRate + '%';
    recentVisitsElem.textContent = statsData.recentVisits;
    
    // 设置进度条
    progressBar.style.width = statsData.completionRate + '%';
    
    // 添加动画效果
    animateProgressBar(progressBar, statsData.completionRate);
}

/**
 * 进度条动画
 */
function animateProgressBar(element, targetWidth) {
    element.style.width = '0%';
    setTimeout(() => {
        element.style.width = targetWidth + '%';
    }, 100);
}

/**
 * 地区列表初始化
 */
function initRegionList() {
    // 检查地区列表容器是否存在
    const regionListContainer = document.getElementById('region-list');
    
    // 如果元素不存在，则退出函数
    if (!regionListContainer) {
        console.log('地区列表容器不存在，跳过初始化');
        return;
    }
    
    // 模拟地区数据，实际应用中应从服务器获取
    const regions = [
        { id: 1, name: '郑州市', visited: true, date: '2023-05-15', image: 'images/zhengzhou.jpg', description: '河南省省会，中原经济区核心城市。' },
        { id: 2, name: '洛阳市', visited: true, date: '2023-06-20', image: 'images/luoyang.jpg', description: '古都洛阳，牡丹花城，龙门石窟所在地。' },
        { id: 3, name: '开封市', visited: true, date: '2023-07-10', image: 'images/kaifeng.jpg', description: '八朝古都，清明上河图描绘的城市。' },
        { id: 4, name: '新乡市', visited: false, image: 'images/xinxiang.jpg', description: '豫北重要城市，太行山脚下的平原城市。' },
        { id: 5, name: '安阳市', visited: true, date: '2023-08-05', image: 'images/anyang.jpg', description: '殷商古都，甲骨文发源地。' },
        { id: 6, name: '鹤壁市', visited: false, image: 'images/hebi.jpg', description: '豫北小城，淇河穿城而过。' },
        { id: 7, name: '焦作市', visited: false, image: 'images/jiaozuo.jpg', description: '云台山所在地，太行山南麓城市。' },
        { id: 8, name: '濮阳市', visited: false, image: 'images/puyang.jpg', description: '黄河之滨，中原油田所在地。' },
        { id: 9, name: '许昌市', visited: true, date: '2023-09-12', image: 'images/xuchang.jpg', description: '三国时期魏国都城，曹魏文化发源地。' },
        { id: 10, name: '漯河市', visited: false, image: 'images/luohe.jpg', description: '沙澧河交汇处，食品工业城市。' },
        { id: 11, name: '三门峡市', visited: false, image: 'images/sanmenxia.jpg', description: '黄河三门峡水利枢纽所在地。' },
        { id: 12, name: '南阳市', visited: true, date: '2023-10-18', image: 'images/nanyang.jpg', description: '医圣张仲景故里，伏牛山脚下的盆地城市。' },
        { id: 13, name: '商丘市', visited: false, image: 'images/shangqiu.jpg', description: '商朝发源地，华商之都。' },
        { id: 14, name: '信阳市', visited: false, image: 'images/xinyang.jpg', description: '大别山北麓，淮河上游城市。' },
        { id: 15, name: '周口市', visited: false, image: 'images/zhoukou.jpg', description: '伏羲故里，老子故里所在地。' },
        { id: 16, name: '驻马店市', visited: false, image: 'images/zhumadian.jpg', description: '豫南重镇，盘古开天辟地传说发源地。' },
        { id: 17, name: '济源市', visited: false, image: 'images/jiyuan.jpg', description: '愚公移山故事发生地，王屋山所在地。' }
    ];
    
    // 清空容器
    regionListContainer.innerHTML = '';
    
    // 创建地区卡片
    regions.forEach(region => {
        const regionCard = document.createElement('div');
        regionCard.className = 'region-card';
        
        const regionImage = document.createElement('img');
        regionImage.className = 'region-image';
        regionImage.src = region.image;
        regionImage.alt = region.name;
        regionImage.onerror = function() {
            this.src = 'images/placeholder.jpg';
        };
        
        const regionInfo = document.createElement('div');
        regionInfo.className = 'region-info';
        
        const regionName = document.createElement('h3');
        regionName.className = 'region-name';
        regionName.textContent = region.name;
        
        const regionStatus = document.createElement('span');
        regionStatus.className = `region-status ${region.visited ? 'status-visited' : 'status-not-visited'}`;
        regionStatus.textContent = region.visited ? '已访问' : '未访问';
        
        const regionDescription = document.createElement('p');
        regionDescription.className = 'region-description';
        regionDescription.textContent = region.description;
        
        const regionDate = document.createElement('p');
        regionDate.className = 'region-date';
        regionDate.textContent = region.visited ? `访问日期: ${region.date}` : '尚未访问';
        
        regionInfo.appendChild(regionName);
        regionInfo.appendChild(regionStatus);
        regionInfo.appendChild(regionDescription);
        regionInfo.appendChild(regionDate);
        
        regionCard.appendChild(regionImage);
        regionCard.appendChild(regionInfo);
        
        regionListContainer.appendChild(regionCard);
    });
}

/**
 * 标记已访问地区
 */
function markVisited() {
    // 这里可以实现标记已访问地区的功能
    alert('标记已访问地区功能即将推出，敬请期待！');
}

/**
 * 查看足迹详情
 */
function viewFootprintDetails() {
    // 这里可以实现查看足迹详情的功能
    alert('查看足迹详情功能即将推出，敬请期待！');
}

/**
 * 地区选择
 * @param {string} region - 地区名称
 */
function selectRegion(region) {
    // 移除所有地区的active类
    const links = document.querySelectorAll('.region-link');
    links.forEach(link => link.classList.remove('active'));
    
    // 为选中的地区添加active类
    const selectedLink = document.querySelector(`.region-link[data-region="${region}"]`);
    if (selectedLink) {
        selectedLink.classList.add('active');
    }
    
    // 根据选择的地区加载相应的地图
    if (region === 'henan') {
        // 已经在河南地图页面，无需操作
        return;
    } else if (region === 'china') {
        // 跳转到中国地图页面
        window.location.href = 'china.html';
    } else {
        // 跳转到其他省份地图页面
        window.location.href = `province.html?region=${region}`;
    }
}

// 初始化地区按钮
function initCityButtons() {
    const cityButtons = document.querySelectorAll('.city-btn');
    
    cityButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 高亮点击的城市
            highlightCityButton(this.textContent);
            
            // 获取ECharts实例并选中对应的地图区域
            const chart = echarts.getInstanceByDom(document.getElementById('map-chart'));
            if (chart) {
                chart.dispatchAction({
                    type: 'mapSelect',
                    name: this.textContent
                });
            }
        });
    });
}

// 高亮城市按钮
function highlightCityButton(cityName) {
    const cityButtons = document.querySelectorAll('.city-btn');
    
    cityButtons.forEach(button => {
        button.classList.remove('active');
        if (button.textContent === cityName) {
            button.classList.add('active');
        }
    });
}

// 初始化地市/县区切换
function initRegionTypeSwitch() {
    const typeBtns = document.querySelectorAll('.type-btn');
    
    if (!typeBtns.length) {
        console.error('找不到地图类型切换按钮');
        return;
    }
    
    typeBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const newType = this.getAttribute('data-type');
            switchMapType(newType);
        });
    });
}

/**
 * 初始化地图风格切换
 */
function initMapStyleSwitch() {
    const styleContainer = document.getElementById('map-style-switch');
    if (!styleContainer) {
        console.error('找不到地图风格切换器');
        return;
    }

    const colorBlocks = styleContainer.querySelectorAll('.color-block');
    colorBlocks.forEach(block => {
        block.addEventListener('click', (e) => {
                e.preventDefault();
            e.stopPropagation();
            const styleId = block.getAttribute('data-style');
            changeMapStyle(styleId);
            
            // 更新所有按钮的active状态
            colorBlocks.forEach(b => b.classList.remove('active'));
            block.classList.add('active');
        });
    });
}

/**
 * 更改地图风格
 * @param {string} styleId - 风格ID: 'natural', 'tech', 'warm'
 */
function changeMapStyle(styleId) {
    if (!mapStyles[styleId]) {
        console.error('无效的样式ID:', styleId);
        return;
    }
    
    currentMapStyle = styleId;
    
    // 更新样式切换按钮状态
    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-style') === styleId);
    });
    
    // 根据当前地图类型更新样式
    if (currentMapType === 'city') {
        updateCityMapStyle(chart);
    } else {
        updateCountyMapStyle(chart);
    }
}

/**
 * 更新地市地图样式
 * @param {Object} chart - 地图ECharts实例
 */
function updateCityMapStyle(chart) {
    const style = mapStyles[currentMapStyle];
    
    // 获取当前地图选项
    const option = chart.getOption();
    
    // 更新视觉映射颜色
    if (option.visualMap && option.visualMap.length > 0) {
        option.visualMap[0].inRange.color = [style.unvisited, style.visited];
    }
    
    // 更新地市边界颜色
    if (option.series && option.series.length > 0) {
        // 更新地市填充和边界样式
        option.series[0].itemStyle.borderColor = style.borderColor.city;
        option.series[0].emphasis.itemStyle.areaColor = style.emphasisColor;
        option.series[0].emphasis.itemStyle.borderColor = style.borderColor.city;
        option.series[0].select.itemStyle.areaColor = style.selected;
    }
    
    // 应用更新后的选项
    chart.setOption(option, true);
}

/**
 * 更新县区地图样式
 * @param {Object} chart - 地图ECharts实例
 */
function updateCountyMapStyle(chart) {
    const style = mapStyles[currentMapStyle];
    
    // 获取当前地图选项
    const option = chart.getOption();
    
    // 更新视觉映射颜色
    if (option.visualMap && option.visualMap.length > 0) {
        option.visualMap[0].inRange.color = [style.unvisited, style.visited];
    }
    
    // 更新县区边界颜色
    if (option.series && option.series.length > 0) {
        // 更新县区填充和边界样式
        option.series[0].itemStyle.borderColor = style.borderColor.county;
        option.series[0].emphasis.itemStyle.areaColor = style.emphasisColor;
        option.series[0].emphasis.itemStyle.borderColor = style.borderColor.county;
        option.series[0].select.itemStyle.areaColor = style.selected;
    }
    
    // 应用更新后的选项
    chart.setOption(option, true);
}

/**
 * 添加地图工具按钮（全屏、导出图片、分享、文本显示/隐藏）
 */
function addMapTools() {
    // 移除原有工具栏，避免重复
    const oldTools = document.querySelector('.map-tools');
    if (oldTools) oldTools.remove();

    // 创建地图工具容器
    const mapTools = document.createElement('div');
    mapTools.className = 'map-tools';
    mapTools.style.position = 'absolute';
    mapTools.style.left = '10px';
    mapTools.style.bottom = '10px';
    mapTools.style.zIndex = '10';
    mapTools.style.backgroundColor = 'rgba(255,255,255,0.8)';
    mapTools.style.padding = '5px';
    mapTools.style.borderRadius = '4px';
    mapTools.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
    mapTools.style.display = 'flex';
    mapTools.style.alignItems = 'center';
    mapTools.style.flexWrap = 'wrap';
    mapTools.style.gap = '8px';

    // 全屏按钮
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'control-btn';
    fullscreenBtn.innerHTML = '<i class="fa fa-expand"></i>';
    fullscreenBtn.title = '全屏显示';
    Object.assign(fullscreenBtn.style, {
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        backgroundColor: '#f8f8f8',
        cursor: 'pointer',
        fontSize: '14px',
        width: '32px',
        height: '32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.2s',
    });
    fullscreenBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    fullscreenBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // 默认标签显示切换按钮（T）
    const defaultLabelToggleBtn = document.createElement('button');
    defaultLabelToggleBtn.className = 'control-btn';
    defaultLabelToggleBtn.innerHTML = '<b style="font-size:16px;">T</b>';
    defaultLabelToggleBtn.title = '切换默认标签显示';
    Object.assign(defaultLabelToggleBtn.style, {
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        backgroundColor: '#f8f8f8',
        cursor: 'pointer',
        fontSize: '14px',
        width: '32px',
        height: '32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.2s',
    });
    defaultLabelToggleBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    defaultLabelToggleBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    defaultLabelToggleBtn.addEventListener('click', toggleDefaultMapLabels);

    // 标签显示切换按钮
    const labelToggleBtn = document.createElement('button');
    labelToggleBtn.className = 'control-btn';
    labelToggleBtn.innerHTML = '<i class="fa fa-font"></i>';
    labelToggleBtn.title = '切换高亮标签显示';
    Object.assign(labelToggleBtn.style, {
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        backgroundColor: '#f8f8f8',
        cursor: 'pointer',
        fontSize: '14px',
        width: '32px',
        height: '32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.2s',
    });
    labelToggleBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    labelToggleBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    labelToggleBtn.addEventListener('click', toggleMapLabels);

    // 分享按钮
    const shareBtn = document.createElement('button');
    shareBtn.className = 'control-btn';
    shareBtn.innerHTML = '<i class="fa fa-share-alt"></i>';
    shareBtn.title = '分享';
    Object.assign(shareBtn.style, {
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        backgroundColor: '#f8f8f8',
        cursor: 'pointer',
        fontSize: '14px',
        width: '32px',
        height: '32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.2s',
    });
    shareBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    shareBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    shareBtn.addEventListener('click', showShareInfo);

    // 导出图片按钮
    const exportBtn = document.createElement('button');
    exportBtn.className = 'control-btn';
    exportBtn.innerHTML = '<i class="fa fa-download"></i>';
    exportBtn.title = '导出图片';
    Object.assign(exportBtn.style, {
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        backgroundColor: '#f8f8f8',
        cursor: 'pointer',
        fontSize: '14px',
        width: '32px',
        height: '32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.2s',
    });
    exportBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    exportBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    exportBtn.addEventListener('click', exportMapImage);

    // 添加按钮到工具栏（T和全屏互换位置）
    mapTools.appendChild(fullscreenBtn);
    mapTools.appendChild(defaultLabelToggleBtn);
    mapTools.appendChild(labelToggleBtn);
    mapTools.appendChild(shareBtn);
    mapTools.appendChild(exportBtn);

    // 添加到地图容器
    setTimeout(() => {
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.position = 'relative';
            mapContainer.appendChild(mapTools);
        }
    }, 100);
}

/**
 * 切换地图全屏显示
 */
function toggleFullscreen() {
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) return;
    
    try {
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    } catch (err) {
        console.error('全屏切换失败:', err);
    }
}

/**
 * 处理全屏状态变化
 */
function handleFullscreenChange() {
    // 调整地图大小以适应全屏/非全屏状态
    if (currentMapType === 'city' && cityMap) {
        cityMap.resize();
    } else if (currentMapType === 'county' && countyMap) {
        countyMap.resize();
    }
    
    // 更新按钮图标
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
        if (document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fa fa-compress"></i>';
        } else {
            fullscreenBtn.innerHTML = '<i class="fa fa-expand"></i>';
        }
    }
}

/**
 * 导出当前地图图片
 */
function exportMapImage() {
    if (!chart) {
        console.error('地图实例不存在');
        return;
    }
    try {
        // 先获取原始图片
        const url = chart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
        });
        // 创建图片对象
        const originalImg = new Image();
        originalImg.src = url;
        originalImg.onload = function() {
            // 创建canvas，底部增加空间放水印
            const bottomPadding = 20;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = originalImg.width;
            canvas.height = originalImg.height + bottomPadding;
            // 填充白色背景
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // 绘制原图
            ctx.drawImage(originalImg, 0, 0);
            // 添加水印
            ctx.font = '14px Arial';
            ctx.fillStyle = '#999';
            ctx.textAlign = 'center';
            const watermark = 'by@https://explorehenan.com/footprint/index.html';
            ctx.fillText(watermark, canvas.width / 2, canvas.height - (bottomPadding / 2));
            // 导出新图片
            const processedImg = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `河南${currentMapType === 'city' ? '地市' : '县区'}足迹地图.png`;
            link.href = processedImg;
            link.click();
        };
    } catch (err) {
        console.error('导出图片失败:', err);
    }
}

/**
 * 显示分享信息
 */
function showShareInfo() {
    // 创建对话框蒙层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = '#fff';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    dialog.style.width = '90%';
    dialog.style.maxWidth = '400px';
    dialog.style.overflow = 'hidden';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    
    // 对话框标题
    const title = document.createElement('h3');
    title.textContent = '分享';
    title.style.margin = '0';
    title.style.padding = '20px';
    title.style.fontSize = '18px';
    title.style.textAlign = 'center';
    title.style.color = '#333';
    title.style.fontWeight = 'bold';
    
    // 分享内容
    const content = document.createElement('div');
    content.style.padding = '0 20px 20px';
    content.style.fontSize = '14px';
    content.style.lineHeight = '1.5';
    content.style.color = '#666';
    content.textContent = '访问网站 https://explorehenan.com/footprint/index.html 记录您探索的河南，制作河南足迹地图';
    
    // 创建复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制内容';
    copyBtn.style.margin = '0 20px 20px';
    copyBtn.style.padding = '12px 0';
    copyBtn.style.backgroundColor = '#3498db';
    copyBtn.style.color = 'white';
    copyBtn.style.border = 'none';
    copyBtn.style.borderRadius = '4px';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.fontSize = '16px';
    copyBtn.style.fontWeight = 'normal';
    copyBtn.style.width = 'calc(100% - 40px)';
    
    // 点击复制事件
    copyBtn.addEventListener('click', function() {
        // 创建临时文本区域
        const textarea = document.createElement('textarea');
        textarea.value = content.textContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        // 显示复制成功提示
        const originalText = this.textContent;
        this.textContent = '复制成功!';
        setTimeout(() => {
            this.textContent = originalText;
        }, 1500);
    });
    
    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.margin = '0';
    closeBtn.style.padding = '12px 0';
    closeBtn.style.backgroundColor = '#f1f1f1';
    closeBtn.style.color = '#333';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '0';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.width = '100%';
    
    // 点击关闭事件
    closeBtn.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    // 组装对话框
    dialog.appendChild(title);
    dialog.appendChild(content);
    dialog.appendChild(copyBtn);
    dialog.appendChild(closeBtn);
    overlay.appendChild(dialog);
    
    // 添加到页面
    document.body.appendChild(overlay);
    
    // 点击蒙层关闭对话框
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

// 初始化工具栏按钮事件
function initToolbarButtons() {
    const toolbar = document.querySelector('.map-toolbar');
    if (!toolbar) return;
    
    // 全屏切换
    const fullscreenBtn = toolbar.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // 分享信息
    const shareBtn = toolbar.querySelector('.share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', showShareInfo);
    }
    
    // 导出图片
    const exportBtn = toolbar.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportMapImage);
    }
}

/**
 * 切换地图文字标注的显示/隐藏
 */
function toggleMapLabels() {
    if (!chart) return;
    const option = chart.getOption();
    const series = option.series[0];
    const isEmphasisLabelVisible = series.emphasis.label.show;

    chart.setOption({
        series: [{
            emphasis: {
                label: {
                    show: !isEmphasisLabelVisible
                }
            },
            select: {
                label: {
                    show: !isEmphasisLabelVisible
                }
            }
        }]
    });

    const labelToggleBtn = document.querySelector('.control-btn[title="切换高亮标签显示"]');
    if (labelToggleBtn) {
        labelToggleBtn.classList.toggle('active', !isEmphasisLabelVisible);
        if (!isEmphasisLabelVisible) {
            labelToggleBtn.style.backgroundColor = '#e8e8e8';
        } else {
            labelToggleBtn.style.backgroundColor = '#f8f8f8';
        }
    }
}

/**
 * 切换地图文字标注的显示/隐藏
 */
function toggleDefaultMapLabels() {
    if (!chart) return;
    const option = chart.getOption();
    const series = option.series[0];
    const isLabelVisible = series.label.show;

    chart.setOption({
        series: [{
            label: {
                show: !isLabelVisible
            }
        }]
    });

    const defaultLabelToggleBtn = document.querySelector('.control-btn[title="切换默认标签显示"]');
    if (defaultLabelToggleBtn) {
        defaultLabelToggleBtn.classList.toggle('active', !isLabelVisible);
        if (!isLabelVisible) {
            defaultLabelToggleBtn.style.backgroundColor = '#e8e8e8';
        } else {
            defaultLabelToggleBtn.style.backgroundColor = '#f8f8f8';
        }
    }
} 