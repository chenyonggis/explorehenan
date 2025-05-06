let cityData = null;
let countyData = null;
let currentMode = 'city';
let currentTarget = null;
let score = 0;
let skipsLeft = 3;
let correctCities = [];
let skippedCities = [];
let chart = null;
let completionChart = null;
let showingHint = false;

// 初始化ECharts
function initChart() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'block';
    }

    // 确保地图容器存在
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
        return;
    }

    // 创建地图实例的容器
    const chartContainer = document.createElement('div');
    chartContainer.style.width = '100%';
    chartContainer.style.height = '100%';
    mapContainer.appendChild(chartContainer);

    // 初始化地图实例
    try {
        chart = echarts.init(chartContainer);
        
        // 添加模式切换事件监听
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const newMode = this.getAttribute('data-mode');
                if (newMode !== currentMode) {
                    // 更新按钮状态
                    modeButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    
                    // 切换模式
                    currentMode = newMode;
                    
                    // 重置游戏状态
                    score = 0;
                    skipsLeft = 3;
                    correctCities = [];
                    skippedCities = [];
                    
                    // 重置显示
                    const completionSection = document.querySelector('.completion-section');
                    const inputSection = document.querySelector('.input-section');
                    const feedbackText = document.getElementById('feedback-text');
                    const distanceHint = document.getElementById('distance-hint');
                    
                    completionSection.style.display = 'none';
                    inputSection.style.display = 'block';
                    feedbackText.textContent = '请猜猜图中轮廓是那个城市...';
                    distanceHint.textContent = '';
                    
                    // 更新统计信息
                    updateStats();
                    updateCorrectCities();
                    updateSkippedCities();
                    
                    // 开始新一轮
                    startNewRound();
                }
            });
        });
        
        loadData();
    } catch (error) {
        if (loading) {
            loading.style.display = 'none';
        }
    }
}

// 加载地图数据
async function loadData() {
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    
    try {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
        const [cityResponse, countyResponse] = await Promise.all([
            fetch('../data/henan.json'),
            fetch('../data/henan-qx.json')
        ]);
        
        if (!cityResponse.ok || !countyResponse.ok) {
            throw new Error('无法加载地图数据');
        }
        
        cityData = await cityResponse.json();
        countyData = await countyResponse.json();
        
        // 注册地图数据
        echarts.registerMap('henan', cityData);
        echarts.registerMap('henan-county', countyData);

        // 初始化主地图
        const mapContainer = document.getElementById('map-container');

        // 监听窗口大小变化
        window.addEventListener('resize', function() {
            if (chart) {
                chart.resize();
            }
        });
        
        if (loading) {
            loading.style.display = 'none';
        }
        
        // 初始化输入建议
        initSuggestions();
        
        startNewRound();
    } catch (error) {
        if (errorMessage) {
            errorMessage.textContent = '加载地图数据失败，请刷新页面重试';
            errorMessage.style.display = 'block';
        }
        if (loading) {
            loading.style.display = 'none';
        }
    }
}

// 初始化输入建议
function initSuggestions() {
    const input = document.getElementById('city-input');
    const suggestions = document.getElementById('suggestions');
    
    input.addEventListener('input', function() {
        const value = this.value.trim();
        const data = currentMode === 'city' ? cityData : countyData;
        
        if (value) {
            const normalizedValue = normalizeRegionName(value);
            const matches = data.features
                .map(f => f.properties.name)
                .filter(name => 
                    normalizeRegionName(name).includes(normalizedValue) ||
                    name.includes(value)
                );
            
            if (matches.length > 0) {
                suggestions.innerHTML = matches
                    .map(name => `<div class="suggestion-item">${name}</div>`)
                    .join('');
                suggestions.style.display = 'block';
            } else {
                suggestions.style.display = 'none';
            }
        } else {
            suggestions.style.display = 'none';
        }
    });
    
    suggestions.addEventListener('click', function(e) {
        if (e.target.classList.contains('suggestion-item')) {
            input.value = e.target.textContent;
            suggestions.style.display = 'none';
        }
    });
    
    // 点击外部时隐藏建议
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

// 计算两点之间的距离（千米）
function calculateDistance(point1, point2) {
    const R = 6371; // 地球半径（千米）
    const lat1 = point1[1] * Math.PI / 180;
    const lat2 = point2[1] * Math.PI / 180;
    const lon1 = point1[0] * Math.PI / 180;
    const lon2 = point2[0] * Math.PI / 180;
    
    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;
    
    const a = Math.sin(dlat/2) * Math.sin(dlat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dlon/2) * Math.sin(dlon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return Math.round(R * c);
}

// 开始新一轮
function startNewRound() {
    const data = currentMode === 'city' ? cityData : countyData;
    const features = data.features.filter(f => 
        !correctCities.includes(f.properties.name) && 
        !skippedCities.includes(f.properties.name)
    );
    
    if (features.length === 0) {
        showCompletion();
        return;
    }
    
    currentTarget = features[Math.floor(Math.random() * features.length)];
    showingHint = false;
    
    // 更新地图显示
    updateMap();
    
    // 更新统计信息
    updateStats();
    
    // 清空输入框和提示
    document.getElementById('city-input').value = '';
    document.getElementById('feedback-text').textContent = '请猜猜图中轮廓是那个城市...';
    document.getElementById('distance-hint').textContent = '';
}

// 计算多边形的边界框
function calculateBoundingBox(coordinates) {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    // 处理多边形坐标
    function processCoordinates(coords) {
        coords.forEach(coord => {
            if (Array.isArray(coord[0])) {
                // 处理多边形数组
                processCoordinates(coord);
            } else {
                // 处理单个坐标点
                minLng = Math.min(minLng, coord[0]);
                maxLng = Math.max(maxLng, coord[0]);
                minLat = Math.min(minLat, coord[1]);
                maxLat = Math.max(maxLat, coord[1]);
            }
        });
    }

    processCoordinates(coordinates);
    
    // 添加一些边距
    const padding = {
        lng: (maxLng - minLng) * 0.2, // 增加边距
        lat: (maxLat - minLat) * 0.2
    };
    
    return {
        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        width: maxLng - minLng,
        height: maxLat - minLat,
        bounds: [
            [minLng - padding.lng, minLat - padding.lat],
            [maxLng + padding.lng, maxLat + padding.lat]
        ]
    };
}

// 更新地图显示
function updateMap(showHint = false) {
    if (!chart) {
        return;
    }

    // 创建仅包含当前区域的地图数据
    const currentMapData = {
        type: 'FeatureCollection',
        features: showHint ? 
            (currentMode === 'city' ? cityData : countyData).features :
            [currentTarget]
    };

    // 计算当前区域的边界框
    const bbox = calculateBoundingBox(currentTarget.geometry.coordinates);

    // 注册当前区域的地图数据
    const currentMapName = `current-region-${Date.now()}`;
    echarts.registerMap(currentMapName, currentMapData);
    
    const option = {
        backgroundColor: '#fff',
        geo: {
            show: true,
            roam: true,
            map: currentMapName,
            aspectScale: 0.85,
            boundingCoords: bbox.bounds,
            zoom: 1.2,
            center: bbox.center,
            label: {
                show: false
            },
            itemStyle: {
                areaColor: 'transparent',
                borderColor: 'transparent',
                borderWidth: 1
            },
            emphasis: {
                disabled: true
            },
            select: {
                disabled: true
            }
        },
        series: [{
            name: '河南省',
            type: 'map',
            map: currentMapName,
            roam: true,
            aspectScale: 0.85,
            label: {
                show: false
            },
            itemStyle: {
                areaColor: 'transparent',
                borderColor: 'transparent',
                borderWidth: 1
            },
            emphasis: {
                disabled: true,
                label: {
                    show: false
                }
            },
            select: {
                disabled: true,
                label: {
                    show: false
                }
            },
            data: showHint ? 
                [{
                    name: currentTarget.properties.name,
                    value: 1,
                    itemStyle: {
                        areaColor: '#91cc75',
                        borderColor: '#fff',
                        borderWidth: 2
                    }
                }].concat(
                    (currentMode === 'city' ? cityData : countyData).features
                        .filter(f => f.properties.name !== currentTarget.properties.name)
                        .map(f => ({
                            name: f.properties.name,
                            itemStyle: {
                                areaColor: '#f3f3f3',
                                borderColor: '#ccc',
                                borderWidth: 1
                            }
                        }))
                ) :
                [{
                    name: currentTarget.properties.name,
                    value: 1,
                    itemStyle: {
                        areaColor: '#91cc75',
                        borderColor: '#fff',
                        borderWidth: 2
                    }
                }]
        }]
    };
    
    try {
        chart.clear();
        chart.setOption(option, true);

        // 清理之前注册的地图数据
        setTimeout(() => {
            echarts.dispose(chart);
            chart = echarts.init(document.getElementById('map-container'));
            chart.setOption(option, true);
        }, 0);
    } catch (error) {
        // 错误处理
    }
}

// 显示完成地图
function showCompletionMap() {
    if (!completionChart) return;

    const option = {
        backgroundColor: '#fff',
        series: [{
            name: '河南省',
            type: 'map',
            map: currentMode === 'city' ? 'henan' : 'henan-county',
            roam: false,
            aspectScale: 0.85,
            layoutCenter: ['50%', '50%'],
            layoutSize: '95%',
            zoom: 1.2,
            label: {
                show: false
            },
            itemStyle: {
                areaColor: '#91cc75',
                borderColor: '#fff',
                borderWidth: 1
            },
            emphasis: {
                disabled: true
            },
            select: {
                disabled: true
            }
        }]
    };
    
    try {
        completionChart.clear();
        completionChart.setOption(option, true);
        
        // 监听窗口大小变化
        window.addEventListener('resize', function() {
            completionChart && completionChart.resize();
        });
    } catch (error) {
        // 错误处理
    }
}

// 显示完成状态
function showCompletion() {
    const totalCities = (currentMode === 'city' ? cityData : countyData).features.length;
    const completionRate = (correctCities.length / totalCities) * 100;
    const completionSection = document.querySelector('.completion-section');
    const inputSection = document.querySelector('.input-section');
    const shareContent = document.getElementById('share-content');
    const shareSection = document.querySelector('.share-section');
    const retryBtn = document.querySelector('.retry-btn');

    // 隐藏输入区域
    inputSection.style.display = 'none';
    
    // 显示完成区域
    completionSection.style.display = 'block';

    if (skippedCities.length > 0) {
        // 部分完成
        document.querySelector('.rules-title').textContent = `您已完成 ${Math.round(completionRate)}% 的轮廓挑战，继续加油！`;
        shareSection.style.display = 'none';
        retryBtn.style.display = 'block';
    } else {
        // 全部完成
        document.querySelector('.rules-title').textContent = '🎉 恭喜您完成河南轮廓挑战！';
        if (currentMode === 'city') {
            shareContent.textContent = '我已完成河南行政区划轮廓挑战，网址http://explorehenan.com/challenge/outline.html，您也来挑战吧。';
        } else {
            shareContent.textContent = '我已完成河南行政区划157个县市区的轮廓挑战，网址http://explorehenan.com/challenge/outline.html，您也来挑战吧。';
        }
        shareSection.style.display = 'block';
        retryBtn.style.display = 'none';
    }

    // 更新地图显示
    updateCompletionMap();
}

// 更新完成状态的地图显示
function updateCompletionMap() {
    if (!chart) return;

    const data = currentMode === 'city' ? cityData : countyData;
    const option = {
        series: [{
            type: 'map',
            map: currentMode === 'city' ? 'henan' : 'henan-county',
            roam: true,
            aspectScale: 0.85,
            layoutCenter: ['50%', '50%'],
            layoutSize: '95%',
            label: {
                show: false
            },
            itemStyle: {
                areaColor: '#f3f3f3',
                borderColor: '#ccc'
            },
            emphasis: {
                label: {
                    show: false
                }
            },
            data: data.features.map(feature => ({
                name: feature.properties.name,
                itemStyle: {
                    areaColor: correctCities.includes(feature.properties.name) ? '#91cc75' : '#f3f3f3',
                    borderColor: '#fff'
                }
            }))
        }]
    };

    chart.setOption(option);
    
    // 延迟一下重新调整大小，确保地图完全显示
    setTimeout(() => {
        chart.resize();
    }, 100);
}

// 重试挑战
function retryChallenge() {
    // 重置游戏状态
    currentMode = 'city';
    correctCities = [];
    skippedCities = [];
    score = 0;
    skipsLeft = 3;
    
    // 重置显示
    const completionSection = document.querySelector('.completion-section');
    const inputSection = document.querySelector('.input-section');
    const feedbackText = document.getElementById('feedback-text');
    const distanceHint = document.getElementById('distance-hint');
    const cityInput = document.getElementById('city-input');
    const correctCitiesGrid = document.getElementById('correct-cities');
    const skippedCitiesGrid = document.getElementById('skipped-cities');
    const scoreElement = document.getElementById('score');
    const completedElement = document.getElementById('completed');
    const skipsLeftElement = document.getElementById('skips-left');
    
    // 更新UI显示
    if (completionSection) completionSection.style.display = 'none';
    if (inputSection) inputSection.style.display = 'block';
    if (feedbackText) feedbackText.textContent = '请猜猜图中轮廓是那个城市...';
    if (distanceHint) distanceHint.textContent = '';
    if (cityInput) cityInput.value = '';
    if (correctCitiesGrid) correctCitiesGrid.innerHTML = '';
    if (skippedCitiesGrid) skippedCitiesGrid.innerHTML = '';
    if (scoreElement) scoreElement.textContent = '0';
    if (completedElement) completedElement.textContent = '0/34';
    if (skipsLeftElement) skipsLeftElement.textContent = '3';
    
    // 重置模式按钮状态
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-mode') === 'city') {
            btn.classList.add('active');
        }
    });
    
    // 重新初始化地图
    initChart();
    
    // 开始新一轮
    startNewRound();
}

// 标准化地区名称
function normalizeRegionName(name) {
    return name.replace(/市$/, '')  // 移除末尾的"市"
              .replace(/区$/, '')   // 移除末尾的"区"
              .replace(/县$/, '')   // 移除末尾的"县"
              .replace(/特区$/, '') // 移除末尾的"特区"
              .trim();              // 移除空格
}

// 检查答案是否正确
function checkAnswer(guess, target) {
    const normalizedGuess = normalizeRegionName(guess);
    const normalizedTarget = normalizeRegionName(target);
    return normalizedGuess === normalizedTarget;
}

// 复制分享内容
function copyShareContent() {
    const shareContent = document.getElementById('share-content')?.textContent;
    if (shareContent) {
        navigator.clipboard.writeText(shareContent).then(() => {
            alert('分享内容已复制到剪贴板！');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    }
}

// 更新统计信息
function updateStats() {
    document.getElementById('score').textContent = score;
    const total = currentMode === 'city' ? cityData.features.length : countyData.features.length;
    document.getElementById('completed').textContent = `${correctCities.length}/${total}`;
    document.getElementById('skips-left').textContent = skipsLeft;
}

// 提交答案
function submitGuess() {
    const guess = document.getElementById('city-input').value.trim();
    
    if (checkAnswer(guess, currentTarget.properties.name)) {
        document.getElementById('feedback-text').textContent = '恭喜你猜对了！';
        document.getElementById('distance-hint').textContent = '';
        score += 10;
        correctCities.push(currentTarget.properties.name);
        updateCorrectCities();
        setTimeout(startNewRound, 1500);
    } else {
        document.getElementById('feedback-text').textContent = '猜的不太对呦，请继续猜';
        // 查找匹配的城市
        const data = currentMode === 'city' ? cityData : countyData;
        const guessedCity = data.features.find(f => 
            checkAnswer(guess, f.properties.name)
        );
        
        if (guessedCity) {
            const distance = calculateDistance(
                currentTarget.properties.center,
                guessedCity.properties.center
            );
            document.getElementById('distance-hint').textContent = `距离：${distance} 千米`;
        } else {
            document.getElementById('distance-hint').textContent = '未找到匹配的城市';
        }
    }
    
    updateStats();
}

// 跳过当前轮
function skipRound() {
    if (skipsLeft > 0) {
        skipsLeft--;
        skippedCities.push(currentTarget.properties.name);
        updateSkippedCities();
        startNewRound();
    } else {
        alert('已经没有跳过机会了！');
    }
}

// 更新已猜对的城市列表
function updateCorrectCities() {
    const container = document.getElementById('correct-cities');
    container.innerHTML = correctCities.map(city => 
        `<div class="result-item correct">${city}</div>`
    ).join('');
}

// 更新已跳过的城市列表
function updateSkippedCities() {
    const container = document.getElementById('skipped-cities');
    container.innerHTML = skippedCities.map(city => 
        `<div class="result-item skipped">${city}</div>`
    ).join('');
}

// 初始化事件监听
document.addEventListener('DOMContentLoaded', function() {
    // 绑定按钮事件
    document.querySelector('.copy-btn')?.addEventListener('click', copyShareContent);
    document.querySelector('.retry-btn')?.addEventListener('click', retryChallenge);

    // 提交按钮事件
    document.querySelector('.submit-btn').addEventListener('click', submitGuess);

    // 跳过按钮事件
    document.querySelector('.skip-btn').addEventListener('click', skipRound);

    // 输入框回车事件
    document.getElementById('city-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitGuess();
        }
    });

    // 提示按钮事件
    document.querySelector('.hint-btn').addEventListener('click', function() {
        showingHint = !showingHint;
        updateMap(showingHint);
    });

    // 初始化地图
    setTimeout(initChart, 100);
}); 