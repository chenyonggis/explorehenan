/**
 * 中国足迹地图相关功能JavaScript
 */

// 全局变量
let currentMapType = 'province'; // 当前地图类型：'province'或'city'
let provinceMap = null; // 省级别的ECharts实例
let cityMap = null; // 地市级别的ECharts实例
let visitedProvinces = {}; // 已访问省份数据
let visitedCities = {}; // 已访问地市数据
let activeProvinces = []; // 当前选中的省份
let activeCities = []; // 当前选中的地市
let provinceCityMap = {}; // 省份与地市的映射关系
let provinceAdcodeMap = {}; // 存储省份adcode与名称的对应关系
let cityAdcodeMap = {}; // 存储地市adcode与名称的对应关系
let currentMapStyle = 'natural'; // 当前地图风格：'natural', 'tech', 'warm'

// 定义三种风格的地图颜色配置
const mapStyles = {
    // 清新自然风格 - 莫兰迪绿色系
    natural: {
        unvisited: '#e8f0e6', // 淡灰绿色
        visited: '#8ba889',   // 灰绿色
        selected: 'rgb(191,242,188)',  // 选中状态填充色
        borderColor: {
            province: '#85a380',     // 较深的灰绿色边界
            city: '#afc5aa'    // 中等深度的灰绿色边界
        },
        emphasisColor: '#526b56' // 橄榄绿高亮
    },
    // 科技时尚风格 - 莫兰迪蓝色系
    tech: {
        unvisited: '#e7edf0', // 淡灰蓝色
        visited: '#8da7b9',   // 灰蓝色
        selected: 'rgb(127,215,247)',  // 选中状态填充色
        borderColor: {
            province: '#7593a7',     // 较深的灰蓝色边界
            city: '#a0b5c4'    // 中等深度的灰蓝色边界
        },
        emphasisColor: '#516d82' // 灰蓝色高亮
    },
    // 温暖活力风格 - 莫兰迪暖色系
    warm: {
        unvisited: '#f0e9e6', // 淡灰米色
        visited: '#c2a499',   // 灰棕色
        selected: 'rgb(249,198,213)',  // 选中状态填充色
        borderColor: {
            province: '#b08e81',     // 较深的灰棕色边界
            city: '#c9b0a6'    // 中等深度的灰米色边界
        },
        emphasisColor: '#8a6e62' // 灰棕色高亮
    }
};

// 省份名称简写映射
const provinceShortNames = {
    '黑龙江省': '黑龙江',
    '内蒙古自治区': '内蒙古',
    '新疆维吾尔自治区': '新疆',
    '西藏自治区': '西藏',
    '广西壮族自治区': '广西',
    '宁夏回族自治区': '宁夏',
    '北京市': '北京',
    '天津市': '天津',
    '上海市': '上海',
    '重庆市': '重庆',
    '河北省': '河北',
    '山西省': '山西',
    '辽宁省': '辽宁',
    '吉林省': '吉林',
    '江苏省': '江苏',
    '浙江省': '浙江',
    '安徽省': '安徽',
    '福建省': '福建',
    '江西省': '江西',
    '山东省': '山东',
    '河南省': '河南',
    '湖北省': '湖北',
    '湖南省': '湖南',
    '广东省': '广东',
    '海南省': '海南',
    '四川省': '四川',
    '贵州省': '贵州',
    '云南省': '云南',
    '陕西省': '陕西',
    '甘肃省': '甘肃',
    '青海省': '青海',
    '台湾省': '台湾',
    '香港特别行政区': '香港',
    '澳门特别行政区': '澳门'
};

document.addEventListener('DOMContentLoaded', function() {
    // 初始化地图
    initMap();
    
    // 初始化省份/地市切换
    initRegionTypeSwitch();
    
    // 初始化导出和分享按钮
    initActionButtons();
    
    // 加载足迹统计信息
    initFootprintStats();
    
    // 初始化地图风格切换
    initMapStyleSwitch();
});

/**
 * 初始化地图
 */
function initMap() {
    // 获取地图容器
    const mapChart = document.getElementById('map-chart');
    
    // 确保地图容器有一致的尺寸
    if (mapChart) {
        mapChart.style.width = '100%';
        mapChart.style.height = '100%';
        mapChart.style.minHeight = '400px'; // 设置最小高度确保地图正常显示
    }
    
    // 初始化ECharts实例
    const myChart = echarts.init(mapChart);
    
    // 加载中国省份地图数据
    loadChinaProvinceMap(myChart);
    
    // 保存省级别的地图实例
    provinceMap = myChart;
    
    // 预加载地市数据 - 省份数据加载完成后再加载
    // preloadCityData(); // 移除这里的调用，确保省份数据先加载完成
    
    // 确保地图在初始加载时正确调整大小
    setTimeout(() => {
        if (myChart) {
            myChart.resize();
            myChart.setOption({
                series: [{
                    center: [104, 35],
                    zoom: 1.1,
                    aspectScale: 0.75
                }]
            });
        }
    }, 50);
    
    // 监听窗口大小变化，调整地图大小
    window.addEventListener('resize', function() {
        if (provinceMap) {
            provinceMap.resize();
            provinceMap.setOption({
                series: [{
                    center: [104, 35],
                    zoom: 1.1
                }]
            });
        }
        if (cityMap) {
            cityMap.resize();
            cityMap.setOption({
                series: [{
                    center: [104, 35],
                    zoom: 1.1
                }]
            });
        }
    });
}

/**
 * 加载中国省份地图
 */
function loadChinaProvinceMap(chart) {
    // 从本地存储加载已访问省份数据（仅加载省份数据，不关联地市数据）
    const savedProvinces = localStorage.getItem('visitedProvinces');
    if (savedProvinces) {
        try {
            visitedProvinces = JSON.parse(savedProvinces);
            console.log("从本地存储加载省份数据:", visitedProvinces);
        } catch (error) {
            console.error('解析已访问省份数据失败:', error);
            visitedProvinces = {};
        }
    } else {
        visitedProvinces = {};
    }
    
    // 加载中国省份地图数据
    fetch('../data/china.json')
        .then(response => response.json())
        .then(mapData => {
            // 注册地图数据
            echarts.registerMap('china', mapData);
            
            // 构建省份adcode映射关系
            buildProvinceAdcodeMap(mapData.features);
            
            // 过滤掉名称为空的省份数据
            const validFeatures = mapData.features.filter(feature => 
                feature.properties.name && feature.properties.name.trim() !== ''
            );
            
            // 准备地图数据
            const data = validFeatures.map(feature => {
                const name = feature.properties.name;
                // 检查是否为已选中省份
                const isSelected = activeProvinces.includes(name);
                return { 
                    name, 
                    value: isSelected ? 1 : 0,
                    selected: isSelected,
                    itemStyle: {
                        areaColor: isSelected ? 
                            mapStyles[currentMapStyle].selected : 
                            mapStyles[currentMapStyle].unvisited
                    }
                };
            });
            
            // 设置地图配置项
            const option = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}'
                },
                series: [
                    {
                        name: '中国省份',
                        type: 'map',
                        map: 'china',
                        roam: true,
                        zoom: 1.1,  // 略微调小以确保完整显示
                        center: [104, 35], // 调整中心点坐标，向上移动地图
                        aspectScale: 0.75, // 调整长宽比使地图更完整显示
                        scaleLimit: {
                            min: 1,
                            max: 10
                        },
                        label: {
                            show: true,
                            fontSize: 12,
                            formatter: function(params) {
                                return provinceShortNames[params.name] || params.name;
                            }
                        },
                        emphasis: {
                            label: {
                                show: true,
                                fontSize: 14,
                                fontWeight: 'bold'
                            },
                            itemStyle: {
                                areaColor: mapStyles[currentMapStyle].emphasisColor
                            }
                        },
                        itemStyle: {
                            areaColor: mapStyles[currentMapStyle].unvisited,
                            borderColor: mapStyles[currentMapStyle].borderColor.province,
                            borderWidth: 1
                        },
                        data: data,
                        selectedMode: 'multiple',
                        select: {
                            itemStyle: {
                                areaColor: mapStyles[currentMapStyle].selected
                            }
                        }
                    }
                ]
            };
            
            // 设置地图配置
            chart.setOption(option);
            
            // 添加点击事件
            chart.on('click', function(params) {
                if (params.name) {
                    toggleProvinceSelection(params.name);
                }
            });
            
            // 更新访问统计信息
            updateVisitedCount('province');
            
            // 生成省份按钮 - 移到这里以确保在地图初始化后生成
            generateProvinceButtons(validFeatures);
            
            // 在省份数据加载完成后，再预加载地市数据
            preloadCityData();
            
            // --- 新增：同步T按钮状态 ---
            setTimeout(() => {
                const btn = document.querySelector('.control-btn[title="切换默认标签显示"]');
                if (btn && chart) {
                    const opt = chart.getOption();
                    const show = opt.series[0].label.show;
                    btn.classList.toggle('active', !!show);
                    btn.style.backgroundColor = show ? '#e8e8e8' : '#f8f8f8';
                }
            }, 200);
        })
        .catch(error => {
            console.error('加载中国省份地图数据失败:', error);
        });
}

/**
 * 构建省份adcode映射关系
 */
function buildProvinceAdcodeMap(features) {
    // 清空现有映射
    provinceAdcodeMap = {};
    
    // 遍历所有省份数据，构建adcode与名称的映射
    features.forEach(feature => {
        const provinceName = feature.properties.name;
        const adcode = feature.properties.adcode;
        
        if (adcode) {
            provinceAdcodeMap[adcode] = {
                name: provinceName,
                adcode: adcode
            };
        }
    });
    
    console.log("省份adcode映射关系:", provinceAdcodeMap);
}

/**
 * 预加载地市数据
 */
function preloadCityData() {
    // 加载中国地市数据
    fetch('../data/china-shi.json')
        .then(response => response.json())
        .then(data => {
            // 构建省份与地市的映射关系
            buildProvinceMapping(data);
        })
        .catch(error => {
            console.error('加载中国地市数据失败:', error);
        });
}

/**
 * 构建省份与地市的映射关系
 */
function buildProvinceMapping(data) {
    // 清空现有映射
    provinceCityMap = {};
    
    // 遍历所有地市数据，构建映射
    data.features.forEach(feature => {
        const cityName = feature.properties.name;
        let provinceName = null;
        
        // 通过parent.adcode获取省份名称
        if (feature.properties.parent && feature.properties.parent.adcode) {
            const parentAdcode = feature.properties.parent.adcode;
            // 检查adcode是否存在于provinceAdcodeMap中
            if (provinceAdcodeMap[parentAdcode]) {
                provinceName = provinceAdcodeMap[parentAdcode].name;
            }
        }
        
        // 如果找不到通过adcode的对应关系，尝试使用parent直接作为省份名称
        if (!provinceName && feature.properties.parent) {
            if (typeof feature.properties.parent === 'string') {
                provinceName = feature.properties.parent;
            } else if (feature.properties.parent.name) {
                provinceName = feature.properties.parent.name;
            }
        }
        
        // 如果找不到省份名称，则跳过该地市
        if (!provinceName) {
            console.warn("无法确定地市所属省份:", cityName, feature.properties);
            return;
        }
        
        // 如果省份不存在于映射中，则创建一个新数组
        if (!provinceCityMap[provinceName]) {
            provinceCityMap[provinceName] = [];
        }
        
        // 将地市添加到对应省份的数组中
        provinceCityMap[provinceName].push(cityName);
    });
    
    console.log("省份地市映射关系:", provinceCityMap);
}

/**
 * 加载中国地市地图
 */
function loadChinaCityMap() {
    // 创建新的ECharts实例
    const mapChart = document.getElementById('map-chart');
    const chart = echarts.init(mapChart);
    
    // 从本地存储加载已访问地市数据（仅加载地市数据，不关联省份数据）
    const savedCities = localStorage.getItem('visitedCities');
    if (savedCities) {
        try {
            visitedCities = JSON.parse(savedCities);
            console.log("从本地存储加载地市数据:", visitedCities);
        } catch (error) {
            console.error('解析已访问地市数据失败:', error);
            visitedCities = {};
        }
    } else {
        visitedCities = {};
    }
    
    // 加载中国地市数据
    fetch('../data/china-shi.json')
        .then(response => response.json())
        .then(mapData => {
            // 注册地图数据
            echarts.registerMap('china-cities', mapData);
            
            // 构建地市adcode映射
            buildCityAdcodeMap(mapData.features);
            
            // 生成地市按钮(按省份分组)
            generateCityButtonsByProvince(mapData.features);
            
            // 确保台湾在地图数据中
            const hasTaiwan = mapData.features.some(feature => 
                feature.properties.name === '台湾' || 
                (feature.properties.parent && 
                 (feature.properties.parent.name === '台湾省' || 
                  (typeof feature.properties.parent === 'string' && 
                   feature.properties.parent === '台湾省')))
            );
            
            // 如果地图数据中没有台湾，则添加一个虚拟的台湾数据
            if (!hasTaiwan) {
                console.log("地图数据中未找到台湾，将在处理特殊省份时添加");
            }
            
            // 准备地图数据
            const data = mapData.features.map(feature => {
                const name = feature.properties.name;
                // 检查是否为已访问地市
                const value = visitedCities[name] ? 1 : 0;
                // 检查是否已选中
                const isSelected = activeCities.includes(name);
                return { 
                    name, 
                    value,
                    selected: isSelected,
                    itemStyle: {
                        areaColor: isSelected ? 
                            mapStyles[currentMapStyle].selected : 
                            (visitedCities[name] ? 
                                mapStyles[currentMapStyle].visited : 
                                mapStyles[currentMapStyle].unvisited)
                    }
                };
            });
            
            // 如果地图数据中没有台湾省，并且台湾在activeCities中或visitedCities中，
            // 确保它也显示在地图上
            const taiwanData = { 
                name: '台湾省', 
                value: visitedCities['台湾'] ? 1 : 0,
                selected: activeCities.includes('台湾'),
                itemStyle: {
                    areaColor: activeCities.includes('台湾') ? 
                        mapStyles[currentMapStyle].selected : 
                        (visitedCities['台湾'] ? 
                            mapStyles[currentMapStyle].visited : 
                            mapStyles[currentMapStyle].unvisited)
                }
            };
            
            // 确保台湾省数据在地图数据中
            if (!data.some(item => item.name === '台湾省' || item.name === '台湾')) {
                data.push(taiwanData);
            }
            
            // 设置地图配置项
            const option = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}'
                },
                series: [
                    {
                        name: '中国地市',
                        type: 'map',
                        map: 'china-cities',
                        roam: true,
                        zoom: 1.1, // 调小以确保完整显示
                        center: [104, 35], // 调整中心点坐标，向上移动地图
                        aspectScale: 0.75, // 调整长宽比使地图更完整显示
                        scaleLimit: {
                            min: 1,
                            max: 10
                        },
                        label: {
                            show: false,
                            fontSize: 10
                        },
                        emphasis: {
                            label: {
                                show: true,
                                fontSize: 12,
                                fontWeight: 'bold'
                            },
                            itemStyle: {
                                areaColor: mapStyles[currentMapStyle].emphasisColor
                            }
                        },
                        itemStyle: {
                            areaColor: mapStyles[currentMapStyle].unvisited,
                            borderColor: mapStyles[currentMapStyle].borderColor.city,
                            borderWidth: 0.5
                        },
                        data: data,
                        selectedMode: 'multiple',
                        select: {
                            itemStyle: {
                                areaColor: mapStyles[currentMapStyle].selected
                            }
                        }
                    }
                ]
            };
            
            // 设置地图配置
            chart.setOption(option);
            
            // 添加点击事件
            chart.on('click', function(params) {
                if (params.name) {
                    // 处理台湾省的特殊情况
                    if (params.name === '台湾省') {
                        toggleCitySelection('台湾');
                    } else {
                    toggleCitySelection(params.name);
                    }
                }
            });
            
            // 保存地市级别的地图实例
            cityMap = chart;
            
            // 强制重新调整地图大小，确保正确居中显示
            setTimeout(() => {
                if (chart) {
                    chart.resize();
                    chart.setOption({
                        series: [{
                            center: [104, 35],
                            zoom: 1.1,
                            aspectScale: 0.75
                        }]
                    });
                }
            }, 100);
            
            // 更新访问统计信息
            updateVisitedCount('city');
            
            // 输出调试信息
            console.log("已访问的地市:", visitedCities);
            console.log("已访问的地市数量:", Object.keys(visitedCities).length);
        })
        .catch(error => {
            console.error('加载中国地市地图数据失败:', error);
        });
}

/**
 * 构建地市adcode映射关系
 */
function buildCityAdcodeMap(features) {
    // 清空现有映射
    cityAdcodeMap = {};
    
    // 遍历所有地市数据，构建adcode与名称的映射
    features.forEach(feature => {
        const cityName = feature.properties.name;
        const adcode = feature.properties.adcode;
        let parentAdcode = null;
        
        if (feature.properties.parent && feature.properties.parent.adcode) {
            parentAdcode = feature.properties.parent.adcode;
        }
        
        if (adcode) {
            cityAdcodeMap[cityName] = {
                name: cityName,
                adcode: adcode,
                parentAdcode: parentAdcode
            };
        }
    });
    
    console.log("地市adcode映射关系:", cityAdcodeMap);
}

/**
 * 生成省份按钮
 */
function generateProvinceButtons(features) {
    const provinceList = document.getElementById('province-list');
    provinceList.innerHTML = '';
    
    // 设置省份列表的样式，确保与地市列表宽度一致
    provinceList.style.width = '100%';
    provinceList.style.maxWidth = '100%';
    provinceList.style.overflowX = 'hidden';
    
    // 按拼音排序省份，并过滤掉名称为空的省份
    const provinces = features
        .map(feature => feature.properties.name)
        .filter(name => name && name.trim() !== '') // 过滤掉空名称省份
        .sort((a, b) => a.localeCompare(b, 'zh-CN', {sensitivity: 'accent'}));
    
    // 创建分组容器
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'city-button-grid';
    buttonsContainer.style.width = '100%';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.flexWrap = 'wrap';
    buttonsContainer.style.justifyContent = 'flex-start';
    buttonsContainer.style.gap = '12px'; // 增加按钮之间的间距
    buttonsContainer.style.padding = '10px'; // 增加外边距
    
    // 为每个省份创建按钮
    provinces.forEach(province => {
        const btn = document.createElement('button');
        btn.className = 'region-btn';
        
        // 使用省份简称显示
        btn.textContent = provinceShortNames[province] || province;
        btn.dataset.region = province;
        btn.title = province; // 添加完整名称作为提示
        
        // 设置按钮样式
        btn.style.padding = '6px 12px'; // 增加内边距
        btn.style.borderRadius = '15px'; // 圆角样式
        btn.style.border = '1px solid #ddd';
        btn.style.backgroundColor = '#f8f8f8';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.2s ease';
        btn.style.fontWeight = 'normal';
        btn.style.color = '#333';
        btn.style.boxShadow = 'none';
        
        // 只根据activeProvinces设置高亮
        if (activeProvinces.includes(province)) {
            btn.classList.add('active');
            btn.style.backgroundColor = mapStyles[currentMapStyle].selected;
            btn.style.color = '#333';
            btn.style.fontWeight = 'bold';
            btn.style.borderColor = mapStyles[currentMapStyle].emphasisColor;
            btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        } else {
            btn.classList.remove('active');
            btn.style.backgroundColor = '#f8f8f8';
            btn.style.color = '#333';
            btn.style.fontWeight = 'normal';
            btn.style.borderColor = '#ddd';
            btn.style.boxShadow = 'none';
        }
        
        // 添加点击事件，切换省份的选中状态
        btn.addEventListener('click', function() {
            toggleProvinceSelection(province);
        });
        
        buttonsContainer.appendChild(btn);
    });
    
    provinceList.appendChild(buttonsContainer);
}

/**
 * 生成地市按钮（按省份分组）
 */
function generateCityButtonsByProvince(features) {
    console.log("开始生成地市按钮", features.length);
    console.log("第一个地市数据示例:", features[0]);
    
    const cityList = document.getElementById('city-list');
    
    // 检查DOM元素
    if (!cityList) {
        console.error("找不到city-list元素");
        return;
    }
    
    console.log("清空前的cityList:", cityList.innerHTML);
    cityList.innerHTML = '';
    
    // 设置地市列表的样式，确保与省份列表宽度一致
    cityList.style.width = '100%';
    cityList.style.maxWidth = '100%';
    cityList.style.overflowX = 'hidden';
    
    // 构建省份与地市的映射关系
    const provinceGroups = {};
    const provinceAdcodes = {};
    
    // 遍历所有地市数据，按省份分组
    features.forEach(feature => {
        const cityName = feature.properties.name;
        const cityAdcode = feature.properties.adcode;
        let provinceName = null;
        let provinceAdcode = null;
        
        // 通过parent.adcode获取省份名称
        if (feature.properties.parent && feature.properties.parent.adcode) {
            provinceAdcode = feature.properties.parent.adcode;
            // 从provinceAdcodeMap中找到省份名称
            if (provinceAdcodeMap[provinceAdcode]) {
                provinceName = provinceAdcodeMap[provinceAdcode].name;
            }
        }
        
        // 如果找不到通过adcode的对应关系，尝试使用parent直接作为省份名称
        if (!provinceName && feature.properties.parent) {
            if (typeof feature.properties.parent === 'string') {
                provinceName = feature.properties.parent;
            } else if (feature.properties.parent.name) {
                provinceName = feature.properties.parent.name;
            }
        }
        
        // 如果找不到省份名称，则跳过该地市
        if (!provinceName) {
            console.warn("无法确定地市所属省份:", cityName, feature.properties);
            return;
        }
        
        // 如果省份不存在于映射中，则创建一个新数组
        if (!provinceGroups[provinceName]) {
            provinceGroups[provinceName] = [];
            if (provinceAdcode) {
                provinceAdcodes[provinceName] = provinceAdcode;
            }
        }
        
        // 将地市添加到对应省份的数组中
        provinceGroups[provinceName].push({
            name: cityName,
            adcode: cityAdcode
        });
    });
    
    console.log("省份分组数据:", provinceGroups);
    
    // 按省份adcode排序省份名称
    const sortedProvinces = Object.keys(provinceGroups).sort((a, b) => {
        const adcodeA = provinceAdcodes[a] || 0;
        const adcodeB = provinceAdcodes[b] || 0;
        return adcodeA - adcodeB;
    });
    
    console.log("按adcode排序后的省份列表:", sortedProvinces);
    
    // 创建外层容器确保宽度一致
    const citiesOuterContainer = document.createElement('div');
    citiesOuterContainer.style.width = '100%';
    
    // 为每个省份创建分组
    sortedProvinces.forEach(provinceName => {
        console.log("处理省份:", provinceName);
        
        // 创建省份分组容器
        const provinceGroup = document.createElement('div');
        provinceGroup.className = 'county-group';
        provinceGroup.style.width = '100%';
        provinceGroup.style.marginBottom = '8px'; // 减少省份间垂直间距
        provinceGroup.style.paddingBottom = '8px'; // 减少省份内底部内边距
        provinceGroup.style.borderBottom = '1px solid #eee';
        
        // 按adcode排序地市
        const cities = provinceGroups[provinceName].sort((a, b) => {
            return (a.adcode || 0) - (b.adcode || 0);
        });

        // 创建省份标题和地市列表文本
        const provinceHeader = document.createElement('div');
        provinceHeader.className = 'province-header';
        provinceHeader.style.fontSize = '16px';
        provinceHeader.style.fontWeight = 'bold';
        provinceHeader.style.marginBottom = '5px'; // 减少省份标题和地市列表的间距
        
        // 显示省份名称
        const provinceTitle = document.createElement('span');
        provinceTitle.textContent = provinceName + '：';
        provinceTitle.style.color = '#333';
        provinceHeader.appendChild(provinceTitle);
        
        provinceGroup.appendChild(provinceHeader);
        
        // 创建地市列表容器
        const citiesContainer = document.createElement('div');
        citiesContainer.className = 'city-list-container';
        citiesContainer.style.width = '100%';
        citiesContainer.style.display = 'flex';
        citiesContainer.style.flexWrap = 'wrap';
        citiesContainer.style.gap = '6px'; // 减少地市按钮间的间距
        citiesContainer.style.lineHeight = '1.6'; // 减少行高
        citiesContainer.style.fontSize = '14px';
        citiesContainer.style.padding = '3px 0'; // 减少顶部和底部内边距
        
        // 为每个地市创建按钮
        cities.forEach(city => {
            const cityBtn = document.createElement('span');
            cityBtn.className = 'city-item';
            cityBtn.textContent = city.name;
            cityBtn.dataset.region = city.name;
            cityBtn.style.padding = '3px 8px'; // 减少按钮内边距
            cityBtn.style.borderRadius = '15px';
            cityBtn.style.border = '1px solid #ccc'; // 更明显的边框
            cityBtn.style.cursor = 'pointer';
            cityBtn.style.display = 'inline-block';
            cityBtn.style.transition = 'all 0.2s ease';
            cityBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)'; // 添加轻微阴影
            
            // 如果是已访问的地市，添加visited样式
            if (visitedCities[city.name]) {
                cityBtn.style.backgroundColor = '#e8f0e6';
                cityBtn.style.color = '#526b56';
                cityBtn.style.borderColor = '#8ba889';
                cityBtn.style.fontWeight = 'bold';
            } else {
                cityBtn.style.backgroundColor = '#f8f8f8';
                cityBtn.style.color = '#666';
            }
            
            // 如果是选中的地市，添加active样式
            if (activeCities.includes(city.name)) {
                cityBtn.style.backgroundColor = mapStyles[currentMapStyle].selected;
                cityBtn.style.color = '#333';
                cityBtn.style.fontWeight = 'bold';
                cityBtn.style.borderColor = mapStyles[currentMapStyle].emphasisColor;
                cityBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
            }
            
            // 添加点击事件，切换地市的选中状态
            cityBtn.addEventListener('click', function() {
                toggleCitySelection(city.name);
            });
            
            citiesContainer.appendChild(cityBtn);
        });
        
        provinceGroup.appendChild(citiesContainer);
        citiesOuterContainer.appendChild(provinceGroup);
    });
    
    // 特殊处理：添加台湾省
    if (!provinceGroups['台湾省'] && !provinceGroups['台湾']) {
        // 创建台湾省分组容器
        const taiwanGroup = document.createElement('div');
        taiwanGroup.className = 'county-group';
        taiwanGroup.style.width = '100%';
        taiwanGroup.style.marginBottom = '8px';
        taiwanGroup.style.paddingBottom = '8px';
        taiwanGroup.style.borderBottom = '1px solid #eee';
        
        // 创建省份标题
        const taiwanHeader = document.createElement('div');
        taiwanHeader.className = 'province-header';
        taiwanHeader.style.fontSize = '16px';
        taiwanHeader.style.fontWeight = 'bold';
        taiwanHeader.style.marginBottom = '5px';
        
        // 显示省份名称
        const taiwanTitle = document.createElement('span');
        taiwanTitle.textContent = '台湾省：';
        taiwanTitle.style.color = '#333';
        taiwanHeader.appendChild(taiwanTitle);
        
        taiwanGroup.appendChild(taiwanHeader);
        
        // 创建台湾地市列表容器
        const taiwanCitiesContainer = document.createElement('div');
        taiwanCitiesContainer.className = 'city-list-container';
        taiwanCitiesContainer.style.width = '100%';
        taiwanCitiesContainer.style.display = 'flex';
        taiwanCitiesContainer.style.flexWrap = 'wrap';
        taiwanCitiesContainer.style.gap = '6px';
        taiwanCitiesContainer.style.lineHeight = '1.6';
        taiwanCitiesContainer.style.fontSize = '14px';
        taiwanCitiesContainer.style.padding = '3px 0';
        
        // 创建台湾按钮
        const taiwanBtn = document.createElement('span');
        taiwanBtn.className = 'city-item';
        taiwanBtn.textContent = '台湾';
        taiwanBtn.dataset.region = '台湾';
        taiwanBtn.style.padding = '3px 8px';
        taiwanBtn.style.borderRadius = '15px';
        taiwanBtn.style.border = '1px solid #ccc';
        taiwanBtn.style.cursor = 'pointer';
        taiwanBtn.style.display = 'inline-block';
        taiwanBtn.style.transition = 'all 0.2s ease';
        taiwanBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
        
        // 设置样式
        if (visitedCities['台湾']) {
            taiwanBtn.style.backgroundColor = '#e8f0e6';
            taiwanBtn.style.color = '#526b56';
            taiwanBtn.style.borderColor = '#8ba889';
            taiwanBtn.style.fontWeight = 'bold';
        } else {
            taiwanBtn.style.backgroundColor = '#f8f8f8';
            taiwanBtn.style.color = '#666';
        }
        
        // 如果是选中的，添加active样式
        if (activeCities.includes('台湾')) {
            taiwanBtn.style.backgroundColor = mapStyles[currentMapStyle].selected;
            taiwanBtn.style.color = '#333';
            taiwanBtn.style.fontWeight = 'bold';
            taiwanBtn.style.borderColor = mapStyles[currentMapStyle].emphasisColor;
            taiwanBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
        }
        
        // 添加点击事件
        taiwanBtn.addEventListener('click', function() {
            toggleCitySelection('台湾');
        });
        
        taiwanCitiesContainer.appendChild(taiwanBtn);
        taiwanGroup.appendChild(taiwanCitiesContainer);
        citiesOuterContainer.appendChild(taiwanGroup);
    }
    
    cityList.appendChild(citiesOuterContainer);
    
    console.log("生成后的cityList HTML:", cityList.innerHTML);
}

/**
 * 更新地图上省份的选中状态
 */
function updateProvinceSelection() {
    if (!provinceMap) return;
    // 先获取当前的地图配置
    const option = provinceMap.getOption();
    // 准备新的选中数据，明确为对象形式
    const selectedMap = {};
    activeProvinces.forEach(province => {
        selectedMap[province] = true;
    });
    // 更新选中状态
    option.series[0].data = option.series[0].data.map(item => {
        const isSelected = selectedMap[item.name] || false;
        return {
            ...item,
            selected: isSelected,
            itemStyle: {
                areaColor: isSelected ? 
                    mapStyles[currentMapStyle].selected : 
                    mapStyles[currentMapStyle].unvisited
            }
        };
    });
    // 重置所有省份的选中状态
    const selectedData = {};
    activeProvinces.forEach(name => {
        selectedData[name] = true;
    });
    // 重置选中模式并应用选中状态
    option.series[0].selectedMode = 'multiple';
    option.series[0].select = {
        itemStyle: {
            areaColor: mapStyles[currentMapStyle].selected
        }
    };
    // 更新地图配置
    provinceMap.setOption(option, true);
    // 强制更新选中状态
    setTimeout(() => {
        if (provinceMap) {
            // 设置地图选中数据
            provinceMap.dispatchAction({
                type: 'selectAll',
                seriesIndex: 0
            });
            provinceMap.dispatchAction({
                type: 'unselect',
                seriesIndex: 0,
                dataIndex: option.series[0].data
                    .map((item, index) => ({ name: item.name, index }))
                    .filter(item => !selectedData[item.name])
                    .map(item => item.index)
            });
        }
    }, 50);
}

/**
 * 切换省份的选中状态
 */
function toggleProvinceSelection(provinceName) {
    console.log(`切换省份 ${provinceName} 的选中状态`);
    
    // 查找省份按钮
    const provinceBtn = document.querySelector(`.region-btn[data-region="${provinceName}"]`);
    
    // 如果省份按钮不存在，则返回
    if (!provinceBtn) return;
    
    // 切换省份的选中状态
    const index = activeProvinces.indexOf(provinceName);
    if (index === -1) {
        // 如果省份不在选中列表中，则添加到选中列表
        activeProvinces.push(provinceName);
        provinceBtn.classList.add('active');
        // 添加高亮样式
        provinceBtn.style.backgroundColor = mapStyles[currentMapStyle].selected;
        provinceBtn.style.color = '#333';
        provinceBtn.style.fontWeight = 'bold';
        provinceBtn.style.borderColor = mapStyles[currentMapStyle].emphasisColor;
        provinceBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        
        // 同时将选中的省份标记为已访问
        markProvinceVisited(provinceName);
    } else {
        // 如果省份已在选中列表中，则从选中列表中移除
        activeProvinces.splice(index, 1);
        provinceBtn.classList.remove('active');
        // 恢复未选中样式
        if (visitedProvinces[provinceName]) {
            // 已访问但未选中
            provinceBtn.style.backgroundColor = '#e8f0e6';
            provinceBtn.style.color = '#526b56';
            provinceBtn.style.fontWeight = 'normal';
            provinceBtn.style.borderColor = '#8ba889';
        } else {
            // 未访问未选中
            provinceBtn.style.backgroundColor = '#f8f8f8';
            provinceBtn.style.color = '#333';
            provinceBtn.style.fontWeight = 'normal';
            provinceBtn.style.borderColor = '#ddd';
        }
        provinceBtn.style.boxShadow = 'none';
    }
    
    // 更新地图的选中状态
    updateProvinceSelection();
    
    // 更新选中计数
    updateSelectedCount('province');
    
    // 更新探索百分比
    updateExplorePercent('province');
    
    // 记录调试信息
    console.log("当前选中的省份:", activeProvinces, "选中/取消选中:", provinceName);
}

/**
 * 切换地市的选中状态
 */
function toggleCitySelection(cityName) {
    console.log("切换地市选中状态:", cityName);
    console.log("选中前provinceCityMap:", provinceCityMap);
    
    // 切换地市的选中状态
    const index = activeCities.indexOf(cityName);
    if (index === -1) {
        // 如果地市不在选中列表中，则添加到选中列表
        activeCities.push(cityName);
        
        // 同时将选中的地市标记为已访问
        markCityVisited(cityName);
    } else {
        // 如果地市已在选中列表中，则从选中列表中移除
        activeCities.splice(index, 1);
    }
    
    // 更新地图的选中状态
    updateCitySelection();
    
    // 更新地市项的样式
    updateCitySelectionStyle();
    
    // 更新选中计数 - 确保在地市模式下显示正确格式
    updateSelectedCount('city');
    
    // 只有在没有选中地市时才更新探索百分比，否则保持显示总探索比例
    if (activeCities.length === 0) {
    updateExplorePercent('city');
    }
}

/**
 * 更新地图上地市的选中状态
 */
function updateCitySelection() {
    if (!cityMap) return;
    
    // 获取当前地图的配置
    const option = cityMap.getOption();
    
    // 准备选中状态映射
    const selectedMap = {};
    activeCities.forEach(city => {
        selectedMap[city] = true;
    });
    
    // 特殊处理台湾省
    if (selectedMap['台湾']) {
        selectedMap['台湾省'] = true;
    }
    
    // 只存在高亮色和默认色两种状态
    option.series[0].data = option.series[0].data.map(item => {
        let isSelected = false;
        if (item.name === '台湾省' || item.name === '台湾') {
            isSelected = selectedMap['台湾'] || selectedMap['台湾省'];
        } else {
            isSelected = selectedMap[item.name] || false;
        }
        return {
            ...item,
            selected: isSelected,
            itemStyle: {
                areaColor: isSelected
                    ? mapStyles[currentMapStyle].selected
                    : mapStyles[currentMapStyle].unvisited
            }
        };
    });
    
    // 重置选中模式并应用选中状态
    option.series[0].selectedMode = 'multiple';
    option.series[0].select = {
        itemStyle: {
            areaColor: mapStyles[currentMapStyle].selected
        }
    };
    
    // 更新地图配置
    cityMap.setOption(option, true);
    
    // 强制清除所有未选中的高亮
    setTimeout(() => {
        if (cityMap) {
            cityMap.dispatchAction({
                type: 'selectAll',
                seriesIndex: 0
            });
            cityMap.dispatchAction({
                type: 'unselect',
                seriesIndex: 0,
                dataIndex: option.series[0].data
                    .map((item, index) => ({ 
                        name: item.name, 
                        index,
                        selected: (item.name === '台湾省' || item.name === '台湾') ? 
                            selectedMap['台湾'] || selectedMap['台湾省'] : 
                            selectedMap[item.name]
                    }))
                    .filter(item => !item.selected)
                    .map(item => item.index)
            });
        }
    }, 50);
    
    // 同步刷新按钮样式
    updateCitySelectionStyle();
    
    // 记录调试信息
    console.log("当前选中的地市:", activeCities);
    // 新增：同步计数
    updateSelectedCount('city');
}

/**
 * 更新地市选中状态的样式
 */
function updateCitySelectionStyle() {
    // 获取所有地市项
    const cityItems = document.querySelectorAll('.city-item');
    
    // 只有高亮色和默认色两种状态
    cityItems.forEach(item => {
        const cityName = item.dataset.region;
        if (activeCities.includes(cityName)) {
            item.classList.add('active');
            item.style.backgroundColor = mapStyles[currentMapStyle].selected;
            item.style.color = '#333';
            item.style.fontWeight = 'bold';
            item.style.borderColor = mapStyles[currentMapStyle].emphasisColor;
            item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
        } else {
            item.classList.remove('active');
            item.style.backgroundColor = mapStyles[currentMapStyle].unvisited;
            item.style.color = '#666';
            item.style.borderColor = '#ccc';
            item.style.fontWeight = 'normal';
            item.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
        }
    });
}

/**
 * 标记省份为已访问
 */
function markProvinceVisited(provinceName) {
    // 如果省份已标记为已访问，则返回
    if (visitedProvinces[provinceName]) {
        return;
    }
    
    // 标记省份为已访问
    visitedProvinces[provinceName] = true;
    
    // 更新省份按钮样式
    const provinceBtn = document.querySelector(`.region-btn[data-region="${provinceName}"]`);
    if (provinceBtn) {
        provinceBtn.classList.add('visited');
    }
    
    // 更新地图样式
    updateProvinceMapStyle();
    
    // 更新访问统计信息
    updateVisitedCount('province');
    
    // 保存到本地存储
    saveVisitedData();
}

/**
 * 标记省份下的所有地市为已访问
 */
function markCitiesInProvinceVisited(provinceName) {
    console.log(`准备标记省份 ${provinceName} 下的所有地市为已访问`);
    
    // 检查provinceCityMap中是否有该省份的地市数据
    if (provinceCityMap[provinceName] && provinceCityMap[provinceName].length > 0) {
        console.log(`省份 ${provinceName} 下有 ${provinceCityMap[provinceName].length} 个地市`);
        
        // 标记该省份下的所有地市为已访问
        provinceCityMap[provinceName].forEach(cityName => {
            if (!visitedCities[cityName]) {
                console.log(`将省份 ${provinceName} 下的地市 ${cityName} 标记为已访问`);
                visitedCities[cityName] = true;
            }
        });
    } else {
        console.log(`省份 ${provinceName} 下没有找到地市数据`);
    }
}

/**
 * 标记地市为已访问
 */
function markCityVisited(cityName) {
    // 如果地市已标记为已访问，则返回
    if (visitedCities[cityName]) {
        return;
    }
    
    // 标记地市为已访问
    visitedCities[cityName] = true;
    
    // 更新地市按钮样式
    const cityBtn = document.querySelector(`.city-item[data-region="${cityName}"]`);
    if (cityBtn) {
        cityBtn.classList.add('visited');
    }
    
    // 更新地图样式
    updateCityMapStyle();
    
    // 更新访问统计信息
    updateVisitedCount('city');
    
    // 保存到本地存储
    saveVisitedData();
}

/**
 * 更新省份地图样式
 */
function updateProvinceMapStyle() {
    if (!provinceMap) return;
    
    const style = mapStyles[currentMapStyle];
    
    // 获取当前地图的配置
    const option = provinceMap.getOption();
    
    // 更新边界颜色和高亮颜色
    if (option.series && option.series.length > 0) {
        option.series[0].itemStyle.borderColor = style.borderColor.province;
        option.series[0].emphasis.itemStyle.areaColor = style.emphasisColor;
        option.series[0].select.itemStyle.areaColor = style.selected;
    }
    
    // 准备选中状态映射
    const selectedMap = {};
    activeProvinces.forEach(province => {
        selectedMap[province] = true;
    });
    
    // 更新省份的样式
    const newData = option.series[0].data.map(item => {
        const isSelected = selectedMap[item.name] || false;
        return {
            ...item,
            selected: isSelected,
            itemStyle: {
                areaColor: isSelected ? 
                    style.selected : 
                    (visitedProvinces[item.name] ? style.visited : style.unvisited)
            },
            value: visitedProvinces[item.name] ? 1 : 0
        };
    });
    
    // 更新数据
    option.series[0].data = newData;
    
    // 更新地图配置
    provinceMap.setOption(option, true);
}

/**
 * 更新地市地图样式
 */
function updateCityMapStyle() {
    if (!cityMap) return;
    
    const style = mapStyles[currentMapStyle];
    
    // 获取当前地图的配置
    const option = cityMap.getOption();
    
    // 更新边界颜色和高亮颜色
    if (option.series && option.series.length > 0) {
        option.series[0].itemStyle.borderColor = style.borderColor.city;
        option.series[0].emphasis.itemStyle.areaColor = style.emphasisColor;
        option.series[0].select.itemStyle.areaColor = style.selected;
    }
    
    // 更新地市的样式
    const newData = option.series[0].data.map(item => {
        return {
            ...item,
            itemStyle: visitedCities[item.name] ? {
                areaColor: style.visited
            } : {
                areaColor: style.unvisited
            },
            value: visitedCities[item.name] ? 1 : 0
        };
    });
    
    // 更新数据
    option.series[0].data = newData;
    
    // 更新地图配置
    cityMap.setOption(option);
    
    // 恢复地市选中状态
    restoreCitySelection();
}

/**
 * 更新访问统计信息
 */
function updateVisitedCount(type) {
    // 获取统计信息元素
    const visitedCountElem = document.getElementById('visited-count');
    const regionUnitElem = document.getElementById('region-unit');
    const explorePercentElem = document.getElementById('explore-percent');
    
    // 如果统计信息元素不存在，则返回
    if (!visitedCountElem || !regionUnitElem || !explorePercentElem) return;
    
    let totalCount, visitedCount;
    
    if (type === 'province') {
        // 更新省份统计信息
        totalCount = Object.keys(provinceAdcodeMap).length || 34; // 中国有34个省级行政区
        visitedCount = Object.keys(visitedProvinces).length;
        // 省份页签只显示省份数量
        visitedCountElem.textContent = visitedCount;
        regionUnitElem.textContent = '省';
    } else {
        // 更新地市统计信息
        totalCount = 300; // 中国地市数量（估计值，实际上可能不同）
        visitedCount = Object.keys(visitedCities).length;
        
        // 计算地市所属的已访问省份数量（不影响省份页签的数据）
        const visitedProvincesFromCities = {};
        for (const cityName in visitedCities) {
            if (visitedCities[cityName]) {
                const provinceName = findProvinceForCity(cityName);
                if (provinceName) {
                    visitedProvincesFromCities[provinceName] = true;
                }
            }
        }
        const provinceCount = Object.keys(visitedProvincesFromCities).length;
        
        // 地市页签显示"N省 M地"格式
        visitedCountElem.textContent = provinceCount + '省 ' + visitedCount + '地';
        regionUnitElem.textContent = ''; // 单位已包含在数字后面
    }
    
    // 计算探索比例
    const explorePercent = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;
    
    // 更新探索比例显示
    explorePercentElem.textContent = explorePercent + '%';
}

/**
 * 初始化足迹统计信息
 */
function initFootprintStats() {
    // 从本地存储加载已访问数据
    loadVisitedData();
    
    // 更新访问统计信息
    updateVisitedCount(currentMapType);
}

/**
 * 初始化省份/地市切换
 */
function initRegionTypeSwitch() {
    // 获取切换按钮
    const typeButtons = document.querySelectorAll('.type-btn');
    const provinceList = document.getElementById('province-list');
    const cityList = document.getElementById('city-list');
    
    // 如果切换按钮不存在，则返回
    if (!typeButtons || !provinceList || !cityList) return;
    
    // 设置列表容器的共同样式，确保宽度一致
    [provinceList, cityList].forEach(list => {
        list.style.width = '100%';
        list.style.maxWidth = '100%';
        list.style.boxSizing = 'border-box';
        list.style.padding = '10px';
    });
    
    // 为每个切换按钮添加点击事件
    typeButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            
            // 如果当前按钮已经是激活状态，则不做任何操作
            if (this.classList.contains('active')) return;
            
            // 移除所有按钮的激活状态
            typeButtons.forEach(btn => btn.classList.remove('active'));
            
            // 添加当前按钮的激活状态
            this.classList.add('active');
            
            // 获取当前选择的地图类型
            currentMapType = this.dataset.type;

            // 切换时彻底清除访问记录和高亮
            if (currentMapType === 'province') {
                activeProvinces = [];
                visitedProvinces = {};
                localStorage.removeItem('visitedProvinces');
                if (provinceMap) {
                    provinceMap.dispatchAction({ type: 'unselect', seriesIndex: 0 });
                    updateProvinceSelection();
                }
                document.querySelectorAll('.region-btn.active').forEach(btn => btn.classList.remove('active'));
            } else {
                activeCities = [];
                visitedCities = {};
                localStorage.removeItem('visitedCities');
                if (cityMap) {
                    cityMap.dispatchAction({ type: 'unselect', seriesIndex: 0 });
                    updateCitySelection();
                }
                document.querySelectorAll('.city-item.active').forEach(btn => btn.classList.remove('active'));
            }
            
            // 根据地图类型显示不同的地图和按钮列表
            if (currentMapType === 'province') {
                // 显示省份地图和按钮列表
                provinceList.style.display = 'flex';
                cityList.style.display = 'none';
                
                // 销毁当前的地市地图实例
                if (cityMap) {
                    cityMap.dispose();
                    cityMap = null;
                }
                
                // 显示省份地图
                const mapChart = document.getElementById('map-chart');
                if (!provinceMap) {
                    loadChinaProvinceMap(echarts.init(mapChart));
                } else {
                    provinceMap.resize();
                }
            } else {
                // 显示地市地图和按钮列表
                provinceList.style.display = 'none';
                cityList.style.display = 'flex';
                
                // 销毁当前的省份地图实例
                if (provinceMap) {
                    provinceMap.dispose();
                    provinceMap = null;
                }
                
                // 显示地市地图
                const mapChart = document.getElementById('map-chart');
                // 确保每次切换后地图容器尺寸一致
                if (mapChart) {
                    mapChart.style.width = '100%';
                    mapChart.style.height = '100%';
                    mapChart.style.minHeight = '400px';
                }
                
                // 创建新地图实例并延迟执行以确保DOM已更新
                setTimeout(() => {
                    if (!cityMap) {
                        loadChinaCityMap();
                    } else {
                        // 强制重新调整地图大小并居中
                        cityMap.resize();
                        cityMap.setOption({
                            series: [{
                                center: [104, 35],
                                zoom: 1.1,
                                aspectScale: 0.75
                            }]
                        });
                    }
                }, 50);
            }
            
            // 更新访问统计信息
            updateVisitedCount(currentMapType);
            
            // 更新选中计数
            updateSelectedCount(currentMapType);
        });
    });
}

/**
 * 初始化导出按钮
 */
function initActionButtons() {
    // 移除原有的操作按钮区域
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
        actionButtons.remove();
    }
    
    // 创建地图导出控件容器
    const exportContainer = document.createElement('div');
    exportContainer.className = 'map-export-control';
    exportContainer.style.position = 'absolute';
    exportContainer.style.left = '10px';
    exportContainer.style.bottom = '10px';
    exportContainer.style.zIndex = '10';
    exportContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    exportContainer.style.padding = '5px';
    exportContainer.style.borderRadius = '4px';
    exportContainer.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
    exportContainer.style.display = 'flex';
    exportContainer.style.alignItems = 'center';
    exportContainer.style.flexWrap = 'wrap';

    // 1. 创建全屏按钮
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'control-btn';
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenBtn.title = '全屏显示';
    fullscreenBtn.style.padding = '4px 8px';
    fullscreenBtn.style.marginRight = '8px';
    fullscreenBtn.style.border = '1px solid #ccc';
    fullscreenBtn.style.borderRadius = '3px';
    fullscreenBtn.style.backgroundColor = '#f8f8f8';
    fullscreenBtn.style.cursor = 'pointer';
    fullscreenBtn.style.fontSize = '14px';
    fullscreenBtn.style.transition = 'all 0.2s';
    fullscreenBtn.style.width = '32px';
    fullscreenBtn.style.height = '32px';
    fullscreenBtn.style.display = 'flex';
    fullscreenBtn.style.justifyContent = 'center';
    fullscreenBtn.style.alignItems = 'center';
    fullscreenBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    fullscreenBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    fullscreenBtn.addEventListener('click', function() { toggleFullscreen(); });

    // 2. 创建导出图片按钮
    const exportViewBtn = document.createElement('button');
    exportViewBtn.className = 'export-btn';
    exportViewBtn.innerHTML = '<i class="fas fa-download"></i>';
    exportViewBtn.title = '导出足迹图片';
    exportViewBtn.style.padding = '4px 8px';
    exportViewBtn.style.marginRight = '8px';
    exportViewBtn.style.border = '1px solid #ccc';
    exportViewBtn.style.borderRadius = '3px';
    exportViewBtn.style.backgroundColor = '#f8f8f8';
    exportViewBtn.style.cursor = 'pointer';
    exportViewBtn.style.fontSize = '14px';
    exportViewBtn.style.transition = 'all 0.2s';
    exportViewBtn.style.width = '32px';
    exportViewBtn.style.height = '32px';
    exportViewBtn.style.display = 'flex';
    exportViewBtn.style.justifyContent = 'center';
    exportViewBtn.style.alignItems = 'center';
    exportViewBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    exportViewBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    exportViewBtn.addEventListener('click', function() { exportMapCurrentView(); });

    // 3. 创建分享按钮
    const shareBtn = document.createElement('button');
    shareBtn.className = 'share-btn';
    shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
    shareBtn.title = '分享足迹地图';
    shareBtn.style.padding = '4px 8px';
    shareBtn.style.marginRight = '5px';
    shareBtn.style.border = '1px solid #ccc';
    shareBtn.style.borderRadius = '3px';
    shareBtn.style.backgroundColor = '#f8f8f8';
    shareBtn.style.cursor = 'pointer';
    shareBtn.style.fontSize = '14px';
    shareBtn.style.transition = 'all 0.2s';
    shareBtn.style.width = '32px';
    shareBtn.style.height = '32px';
    shareBtn.style.display = 'flex';
    shareBtn.style.justifyContent = 'center';
    shareBtn.style.alignItems = 'center';
    shareBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    shareBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    shareBtn.addEventListener('click', function() { showShareDialog(); });

    // 4. T按钮（切换默认标签显示）
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
        marginRight: '8px'
    });
    defaultLabelToggleBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    defaultLabelToggleBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    defaultLabelToggleBtn.addEventListener('click', toggleDefaultMapLabels);

    // 5. A按钮（切换高亮标签显示）
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
        marginRight: '8px'
    });
    labelToggleBtn.addEventListener('mouseover', function() { this.style.backgroundColor = '#e8e8e8'; });
    labelToggleBtn.addEventListener('mouseout', function() { this.style.backgroundColor = '#f8f8f8'; });
    labelToggleBtn.addEventListener('click', toggleMapLabels);

    // 统一append
    exportContainer.appendChild(fullscreenBtn);
    exportContainer.appendChild(defaultLabelToggleBtn);
    exportContainer.appendChild(labelToggleBtn);
    exportContainer.appendChild(exportViewBtn);
    exportContainer.appendChild(shareBtn);
    //exportContainer.appendChild(exportLargeBtn);

    // ... existing code ...
    
    // 将导出控件添加到地图容器
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.style.position = 'relative'; // 确保容器是相对定位的
        mapContainer.appendChild(exportContainer);
    }
}

/**
 * 切换地图全屏显示
 */
function toggleFullscreen() {
    const mapContainer = document.querySelector('.map-container');
    
    if (!mapContainer) return;
    
    // 检查当前是否为全屏状态
    const isFullScreen = document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         document.mozFullScreenElement || 
                         document.msFullscreenElement;
    
    if (!isFullScreen) {
        // 进入全屏模式
        if (mapContainer.requestFullscreen) {
            mapContainer.requestFullscreen();
        } else if (mapContainer.webkitRequestFullscreen) { /* Safari */
            mapContainer.webkitRequestFullscreen();
        } else if (mapContainer.msRequestFullscreen) { /* IE11 */
            mapContainer.msRequestFullscreen();
        } else if (mapContainer.mozRequestFullScreen) { /* Firefox */
            mapContainer.mozRequestFullScreen();
        }
        
        // 更新全屏按钮图标
        const fullscreenBtn = document.querySelector('.control-btn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenBtn.title = '退出全屏';
        }
    } else {
        // 退出全屏模式
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        }
        
        // 更新全屏按钮图标
        const fullscreenBtn = document.querySelector('.control-btn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.title = '全屏显示';
        }
    }
}

/**
 * 拼接导出完整地图
 * 在当前缩放级别下，自动分片导出并拼接成完整的中国地图
 */
function exportMapStitched() {
        // 获取当前显示的地图实例
        const chart = currentMapType === 'province' ? provinceMap : cityMap;
        
        // 如果地图实例不存在，则返回
    if (!chart) {
        console.error('地图实例不存在，无法导出');
        return;
    }
    
    // 获取选择的清晰度
    const resolutionSelect = document.querySelector('.resolution-select');
    const scale = resolutionSelect ? parseInt(resolutionSelect.value) : 1;
    
    // 显示正在导出的提示
    showExportingMessage('正在准备拼接导出...');
    
    // 获取当前的地图配置
    const originalOption = chart.getOption();
    
    // 备份当前视图状态
    const currentZoom = originalOption.series[0].zoom;
    const currentCenter = originalOption.series[0].center;
    
    // 计算需要的网格数（基于当前缩放级别）
    // 如果缩放比例越大，需要的网格就越多
    let gridSize;
    if (currentZoom <= 1) {
        gridSize = { rows: 1, cols: 1 }; // 无需拼接
    } else if (currentZoom <= 2) {
        gridSize = { rows: 2, cols: 2 }; // 2x2网格
    } else if (currentZoom <= 3.5) {
        gridSize = { rows: 3, cols: 3 }; // 3x3网格
    } else {
        gridSize = { rows: 4, cols: 4 }; // 4x4网格
    }
    
    // 获取地图容器的尺寸
    const mapContainer = document.getElementById('map-chart');
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;
    
    // 创建一个离屏Canvas来拼接图像
    const stitchCanvas = document.createElement('canvas');
    stitchCanvas.width = containerWidth * gridSize.cols;
    stitchCanvas.height = containerHeight * gridSize.rows;
    const ctx = stitchCanvas.getContext('2d');
    
    // 中国地图的经纬度范围（近似值）
    const mapBounds = {
        minLng: 73,   // 最西边约为73°E
        maxLng: 135,  // 最东边约为135°E
        minLat: 18,   // 最南边约为18°N
        maxLat: 54    // 最北边约为54°N
    };
    
    // 计算经纬度步长
    const lngStep = (mapBounds.maxLng - mapBounds.minLng) / gridSize.cols;
    const latStep = (mapBounds.maxLat - mapBounds.minLat) / gridSize.rows;
    
    // 准备图片数组，稍后用于拼接
    const imagePromises = [];
    
    // 循环捕获每个网格的图像
    for (let row = 0; row < gridSize.rows; row++) {
        for (let col = 0; col < gridSize.cols; col++) {
            // 计算当前网格的中心经纬度
            const centerLng = mapBounds.minLng + lngStep * (col + 0.5);
            const centerLat = mapBounds.maxLat - latStep * (row + 0.5); // 纬度从北到南递减
            
            // 创建一个Promise来处理这个网格的图像捕获
            const imagePromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        // 更新提示信息
                        showExportingMessage(`正在导出第 ${row * gridSize.cols + col + 1}/${gridSize.rows * gridSize.cols} 个分片...`);
                        
                        // 设置地图中心到当前网格
                        chart.setOption({
                            series: [{
                                center: [centerLng, centerLat],
                                zoom: currentZoom
                            }]
                        });
                        
                        // 给地图一些时间重新渲染
                        setTimeout(() => {
                            // 导出当前视图为图片
                            const imageData = chart.getDataURL({
                                pixelRatio: scale,
                                backgroundColor: '#fff'
                            });
                            
                            // 创建图像对象以便稍后绘制到Canvas
                            const img = new Image();
                            img.onload = function() {
                                // 返回图像和位置信息
                                resolve({
                                    img: img,
                                    row: row,
                                    col: col
                                });
                            };
                            img.onerror = function() {
                                reject(new Error(`无法加载图像 (${row}, ${col})`));
                            };
                            img.src = imageData;
                        }, 300); // 给足够的时间让地图渲染
                    } catch (error) {
                        reject(error);
                    }
                }, (row * gridSize.cols + col) * 500); // 错开定时器，每个网格间隔500ms
            });
            
            imagePromises.push(imagePromise);
        }
    }
    
    // 等待所有图像准备就绪
    Promise.all(imagePromises)
        .then(results => {
            // 更新提示信息
            showExportingMessage('正在拼接图像...');
            
            // 绘制每个图像到Canvas的相应位置
            results.forEach(result => {
                ctx.drawImage(
                    result.img,
                    result.col * containerWidth,
                    result.row * containerHeight
                );
            });
            
            // 转换Canvas为图像并下载
            const stitchedImage = stitchCanvas.toDataURL(`image/png`);
            
            // 创建下载链接
            const link = document.createElement('a');
            link.download = `中国足迹地图_拼接${scale > 1 ? '_2x' : ''}.png`;
            link.href = stitchedImage;
            link.click();
            
            // 恢复原始视图
            chart.setOption({
                series: [{
                    center: currentCenter,
                    zoom: currentZoom
                }]
            });
            
            // 隐藏提示
            hideExportingMessage();
        })
        .catch(error => {
            console.error('拼接导出失败:', error);
            alert('拼接导出失败，请稍后重试');
            
            // 恢复原始视图
            chart.setOption({
                series: [{
                    center: currentCenter,
                    zoom: currentZoom
                }]
            });
            
            // 隐藏提示
            hideExportingMessage();
        });
}

/**
 * 显示导出中的提示消息
 * @param {string} message - 要显示的消息文本
 */
function showExportingMessage(message = '正在导出图片...') {
    // 检查是否已有提示框
    let messageBox = document.getElementById('export-message');
    if (messageBox) {
        // 更新现有提示框的消息
        const textElement = messageBox.querySelector('span');
        if (textElement) {
            textElement.textContent = message;
        }
        messageBox.style.display = 'flex';
        return;
    }
    
    // 创建提示框
    messageBox = document.createElement('div');
    messageBox.id = 'export-message';
    messageBox.style.position = 'fixed';
    messageBox.style.top = '50%';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translate(-50%, -50%)';
    messageBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageBox.style.color = 'white';
    messageBox.style.padding = '15px 20px';
    messageBox.style.borderRadius = '5px';
    messageBox.style.zIndex = '1000';
    messageBox.style.display = 'flex';
    messageBox.style.alignItems = 'center';
    messageBox.style.justifyContent = 'center';
    
    // 创建加载图标
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.width = '20px';
    spinner.style.height = '20px';
    spinner.style.border = '3px solid rgba(255, 255, 255, 0.3)';
    spinner.style.borderTop = '3px solid #fff';
    spinner.style.borderRadius = '50%';
    spinner.style.marginRight = '10px';
    spinner.style.animation = 'spin 1s linear infinite';
    
    // 添加旋转动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // 添加文字
    const text = document.createElement('span');
    text.textContent = message;
    
    // 组装提示框
    messageBox.appendChild(spinner);
    messageBox.appendChild(text);
    
    // 添加到页面
    document.body.appendChild(messageBox);
}

/**
 * 导出当前视图的地图图片
 */
function exportMapCurrentView() {
    // 获取当前显示的地图实例
    const chart = currentMapType === 'province' ? provinceMap : cityMap;
    
    // 如果地图实例不存在，则返回
    if (!chart) {
        console.error('地图实例不存在，无法导出');
        return;
    }
    
    // 使用默认清晰度为2
    const scale = 2;
    
    // 显示正在导出的提示
    showExportingMessage();
    
    // 延迟执行，让UI先更新
    setTimeout(() => {
        try {
            // 获取统计信息文本
            const statsElement = document.querySelector('.visit-stats p');
            let statsText = statsElement ? statsElement.textContent.trim() : '';
            
            // 处理逗号后面的多余空格
            statsText = statsText.replace(/，\s+/g, '，');
            
            // 获取导出的原始图片
        const img = chart.getDataURL({
                pixelRatio: scale,
            backgroundColor: '#fff'
        });
            
            // 创建一个新的图片对象，用于获取原始尺寸
            const originalImg = new Image();
            originalImg.src = img;
            
            originalImg.onload = function() {
                // 创建canvas元素来编辑图片
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 设置canvas尺寸，上下增加空间放统计信息和水印
                const topPadding = 50;
                const bottomPadding = 20;
                canvas.width = originalImg.width;
                canvas.height = originalImg.height + topPadding + bottomPadding;
                
                // 填充白色背景
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // 绘制原始图像（在统计信息下方）
                ctx.drawImage(originalImg, 0, topPadding);
                
                // 处理统计信息文本（突出显示数字）
                ctx.font = '22px Arial';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                
                // 找到所有数字部分（包括百分比）
                const parts = statsText.split(/(\d+%?)/g);
                
                // 计算整个文本的宽度，以便正确定位
                let totalWidth = 0;
                parts.forEach(part => {
                    const isNumber = /^\d+%?$/.test(part);
                    ctx.font = isNumber ? 'bold 26px Arial' : '22px Arial';
                    totalWidth += ctx.measureText(part).width;
                });
                
                // 开始绘制位置
                let x = (canvas.width - totalWidth) / 2;
                
                // 分别绘制各部分
                parts.forEach(part => {
                    // 判断是否为数字部分
                    const isNumber = /^\d+%?$/.test(part);
                    
                    if (isNumber) {
                        // 设置数字的样式（加粗、红色）
                        ctx.font = 'bold 26px Arial';
                        ctx.fillStyle = '#E74C3C'; // 使用红色强调数字
                    } else {
                        // 设置普通文本样式
                        ctx.font = '22px Arial';
                        ctx.fillStyle = '#333';
                    }
                    
                    // 绘制文本部分
                    ctx.textAlign = 'left';
                    ctx.fillText(part, x, topPadding / 2 + 10);
                    
                    // 移动到下一个绘制位置
                    x += ctx.measureText(part).width;
                });
                
                // 在顶部文本下方绘制分隔线
                ctx.strokeStyle = '#eee';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(canvas.width * 0.1, topPadding - 10);
                ctx.lineTo(canvas.width * 0.9, topPadding - 10);
                ctx.stroke();
                
                // 添加水印文字
                ctx.font = '14px Arial';
                ctx.fillStyle = '#999';
                ctx.textAlign = 'center';
                const watermark = 'by@https://explorehenan.com/footprint/china.html';
                
                // 在底部居中绘制水印
                ctx.fillText(watermark, canvas.width / 2, canvas.height - (bottomPadding / 2));
                
                // 导出处理后的图片
                const processedImg = canvas.toDataURL('image/png');
        
        // 创建下载链接
        const link = document.createElement('a');
                link.download = `中国足迹地图_${currentMapType === 'province' ? '省份' : '地市'}_${new Date().getTime()}.png`;
                link.href = processedImg;
        link.click();
                
                // 隐藏导出提示
                hideExportingMessage();
            };
        } catch (error) {
            console.error('导出地图图片失败:', error);
            hideExportingMessage();
            alert('导出图片失败，请稍后重试');
        }
    }, 100);
}

/**
 * 导出全国范围的地图图片
 */
function exportMapFullRange() {
    // 获取当前显示的地图实例
    const chart = currentMapType === 'province' ? provinceMap : cityMap;
    
    // 如果地图实例不存在，则返回
    if (!chart) {
        console.error('地图实例不存在，无法导出');
        return;
    }
    
    // 获取选择的清晰度
    const resolutionSelect = document.querySelector('.resolution-select');
    const scale = resolutionSelect ? parseInt(resolutionSelect.value) : 1;
    
    // 显示正在导出的提示
    showExportingMessage();
    
    // 使用setTimeout让UI先更新，显示导出提示
    setTimeout(() => {
        try {
            // 备份当前配置
            const originalOption = chart.getOption();
            const originalZoom = originalOption.series[0].zoom;
            
            // 复制当前配置，并修改为全国视图
            const newOption = JSON.parse(JSON.stringify(originalOption));
            
            // 调整地图配置，确保显示全国范围
            if (newOption.series && newOption.series.length > 0) {
                // 保持当前的缩放级别
                const currentZoom = originalZoom || 1.4;
                
                // 将地图中心点设置为中国中心
                newOption.series[0].center = [104, 37];
                
                // 根据当前缩放级别调整，确保能显示全国
                const adjustedZoom = currentZoom > 2 ? 1.0 : currentZoom;
                newOption.series[0].zoom = adjustedZoom;
                
                // 调整宽高比，确保南北方向能完整显示
                newOption.series[0].aspectScale = 0.85;
                
                // 如果清晰度为2X，放大注记
                if (scale === 2) {
                    // 放大标签
                    if (newOption.series[0].label) {
                        newOption.series[0].label.fontSize = (newOption.series[0].label.fontSize || 12) * 2;
                        newOption.series[0].label.show = true; // 确保标签显示
                    }
                    
                    // 放大强调状态的标签
                    if (newOption.series[0].emphasis && newOption.series[0].emphasis.label) {
                        newOption.series[0].emphasis.label.fontSize = (newOption.series[0].emphasis.label.fontSize || 14) * 2;
                    }
                    
                    // 放大边界线宽度
                    if (newOption.series[0].itemStyle) {
                        newOption.series[0].itemStyle.borderWidth = (newOption.series[0].itemStyle.borderWidth || 1) * 2;
                    }
                }
            }
            
            // 应用新配置
            chart.setOption(newOption, true);
            
            // 给ECharts一点时间来重新渲染地图
            setTimeout(() => {
                try {
                    // 获取统计信息文本
                    const statsElement = document.querySelector('.visit-stats p');
                    let statsText = statsElement ? statsElement.textContent.trim() : '';
                    
                    // 处理逗号后面的多余空格
                    statsText = statsText.replace(/，\s+/g, '，');
                    
                    // 导出地图为图片
                    const originalImg = chart.getDataURL({
                        pixelRatio: scale,
                        backgroundColor: '#fff'
                    });
                    
                    // 恢复原始配置
                    chart.setOption(originalOption, true);
                    
                    // 创建图片对象来获取原始尺寸
                    const img = new Image();
                    img.src = originalImg;
                    img.onload = function() {
                        // 创建canvas元素来编辑图片
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // 设置canvas尺寸，上下增加空间放统计信息和水印
                        const topPadding = 50;
                        const bottomPadding = 20;
                        canvas.width = img.width;
                        canvas.height = img.height + topPadding + bottomPadding;
                        
                        // 填充白色背景
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // 绘制原始图像（在统计信息下方）
                        ctx.drawImage(img, 0, topPadding);
                        
                        // 处理统计信息文本（突出显示数字）
                        ctx.font = '22px Arial';
                        ctx.fillStyle = '#333';
                        ctx.textAlign = 'center';
                        
                        // 找到所有数字部分（包括百分比）
                        const parts = statsText.split(/(\d+%?)/g);
                        
                        // 计算整个文本的宽度，以便正确定位
                        let totalWidth = 0;
                        parts.forEach(part => {
                            const isNumber = /^\d+%?$/.test(part);
                            ctx.font = isNumber ? 'bold 26px Arial' : '22px Arial';
                            totalWidth += ctx.measureText(part).width;
                        });
                        
                        // 开始绘制位置
                        let x = (canvas.width - totalWidth) / 2;
                        
                        // 分别绘制各部分
                        parts.forEach(part => {
                            // 判断是否为数字部分
                            const isNumber = /^\d+%?$/.test(part);
                            
                            if (isNumber) {
                                // 设置数字的样式（加粗、红色）
                                ctx.font = 'bold 26px Arial';
                                ctx.fillStyle = '#E74C3C'; // 使用红色强调数字
                            } else {
                                // 设置普通文本样式
                                ctx.font = '22px Arial';
                                ctx.fillStyle = '#333';
                            }
                            
                            // 绘制文本部分
                            ctx.textAlign = 'left';
                            ctx.fillText(part, x, topPadding / 2 + 10);
                            
                            // 移动到下一个绘制位置
                            x += ctx.measureText(part).width;
                        });
                        
                        // 在顶部文本下方绘制分隔线
                        ctx.strokeStyle = '#eee';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(canvas.width * 0.1, topPadding - 10);
                        ctx.lineTo(canvas.width * 0.9, topPadding - 10);
                        ctx.stroke();
                        
                        // 添加水印文字
                        ctx.font = '14px Arial';
                        ctx.fillStyle = '#999';
                        ctx.textAlign = 'center';
                        const watermark = 'by@https://explorehenan.com/footprint/china.html';
                        
                        // 在底部居中绘制水印
                        ctx.fillText(watermark, canvas.width / 2, canvas.height - (bottomPadding / 2));
                        
                        // 导出处理后的图片
                        const processedImg = canvas.toDataURL('image/png');
                        
                        // 创建下载链接
                        const link = document.createElement('a');
                        link.download = '中国足迹地图_全国范围' + (scale > 1 ? '_2x' : '') + '.png';
                        link.href = processedImg;
                        link.click();
                        
                        // 隐藏导出提示
                        hideExportingMessage();
                    };
                } catch (error) {
                    console.error('导出地图图片失败:', error);
                    hideExportingMessage();
                    alert('导出图片失败，请稍后重试');
                    
                    // 恢复原始配置
                    chart.setOption(originalOption, true);
                }
            }, 300);
        } catch (error) {
            console.error('导出地图图片失败:', error);
            hideExportingMessage();
            alert('导出图片失败，请稍后重试');
        }
    }, 100);
}

/**
 * 导出地图为图片
 * @param {number} scale - 导出的比例，1 或 2
 */
function exportMapImage(scale) {
    // 这个函数保留用于兼容性，但实际上已被上面两个新函数取代
    exportMapFullRange();
}

/**
 * 隐藏导出中的提示消息
 */
function hideExportingMessage() {
    const messageBox = document.getElementById('export-message');
    if (messageBox) {
        messageBox.style.display = 'none';
    }
}

/**
 * 从本地存储加载已访问数据
 */
function loadVisitedData() {
    // 根据当前类型选择性加载数据
    if (currentMapType === 'province') {
    // 尝试从本地存储加载已访问省份数据
    const savedProvinces = localStorage.getItem('visitedProvinces');
    if (savedProvinces) {
        try {
            visitedProvinces = JSON.parse(savedProvinces);
                console.log("从本地存储加载省份数据:", visitedProvinces);
        } catch (error) {
            console.error('解析已访问省份数据失败:', error);
            visitedProvinces = {};
        }
        } else {
            visitedProvinces = {};
    }
    } else {
    // 尝试从本地存储加载已访问地市数据
    const savedCities = localStorage.getItem('visitedCities');
    if (savedCities) {
        try {
            visitedCities = JSON.parse(savedCities);
                console.log("从本地存储加载地市数据:", visitedCities);
        } catch (error) {
            console.error('解析已访问地市数据失败:', error);
            visitedCities = {};
        }
        } else {
            visitedCities = {};
        }
        
        // 确保初始地市数据为空（清除任何默认数据）
        if (!localStorage.getItem('visitedCities')) {
            visitedCities = {};
        }
    }
}

/**
 * 保存已访问数据到本地存储
 */
function saveVisitedData() {
    // 保存已访问省份数据到本地存储
    localStorage.setItem('visitedProvinces', JSON.stringify(visitedProvinces));
    
    // 保存已访问地市数据到本地存储
    localStorage.setItem('visitedCities', JSON.stringify(visitedCities));
}

/**
 * 更新选中的区域计数
 */
function updateSelectedCount(type) {
    // 获取统计信息元素
    const visitedCountElem = document.getElementById('visited-count');
    const regionUnitElem = document.getElementById('region-unit');
    
    // 如果统计信息元素不存在，则返回
    if (!visitedCountElem || !regionUnitElem) return;
    
    // 计算省份和地市的选中数量
    const provinceSelectedCount = activeProvinces.length;
    const citySelectedCount = activeCities.length;
    
    if (type === 'province') {
        // 更新省份统计信息
        visitedCountElem.textContent = provinceSelectedCount;
        regionUnitElem.textContent = '省';
    } else {
        // 只显示当前选中的地市和省份数量
        const selectedProvincesFromCities = {};
        activeCities.forEach(cityName => {
            const provinceName = findProvinceForCity(cityName);
            if (provinceName) {
                selectedProvincesFromCities[provinceName] = true;
            }
        });
        const provinceCount = Object.keys(selectedProvincesFromCities).length;
        visitedCountElem.textContent = provinceCount + '省 ' + citySelectedCount + '地';
        regionUnitElem.textContent = '';
    }
}

/**
 * 更新探索百分比
 */
function updateExplorePercent(type) {
    // 获取统计信息元素
    const explorePercentElem = document.getElementById('explore-percent');
    
    // 如果统计信息元素不存在，则返回
    if (!explorePercentElem) return;
    
    let totalCount, selectedCount;
    
    if (type === 'province') {
        // 更新省份统计信息
        totalCount = 34; // 中国有34个省级行政区
        selectedCount = activeProvinces.length;
    } else {
        // 更新地市统计信息
        totalCount = 476; // 中国地市数量估计值
        selectedCount = activeCities.length;
    }
    
    // 计算探索比例
    const explorePercent = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;
    
    // 更新统计信息显示
    explorePercentElem.textContent = explorePercent + '%';
}

/**
 * 初始化地图风格切换
 */
function initMapStyleSwitch() {
    // 查找地图风格切换容器
    let styleContainer = document.getElementById('map-style-switch');
    
    // 如果容器已存在，先移除
    if (styleContainer) {
        styleContainer.remove();
    }
    
    // 创建风格切换容器
    const container = document.createElement('div');
    container.id = 'map-style-switch';
    container.className = 'map-style-switch';
    
    // 添加风格按钮
    const styles = [
        { id: 'natural', name: '清新', color: 'rgb(191,242,188)' },
        { id: 'tech', name: '科技', color: 'rgb(127,215,247)' },
        { id: 'warm', name: '温暖', color: 'rgb(249,198,213)' }
    ];
    
    styles.forEach(style => {
        const colorBlock = document.createElement('div');
        colorBlock.className = 'color-block' + (style.id === currentMapStyle ? ' active' : '');
        colorBlock.setAttribute('data-style', style.id);
        colorBlock.setAttribute('title', style.name);
        colorBlock.style.backgroundColor = style.color;
        
        // 为按钮添加点击事件
        colorBlock.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 更新所有按钮状态
            document.querySelectorAll('.color-block').forEach(block => {
                block.classList.remove('active');
            });
            this.classList.add('active');
            
            // 更新当前风格并重新加载地图
            changeMapStyle(style.id);
        });
        
        container.appendChild(colorBlock);
    });
    
    // 将风格切换容器添加到地图容器内
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.appendChild(container);
    }
}

/**
 * 更改地图风格
 * @param {string} styleId - 风格ID: 'natural', 'tech', 'warm'
 */
function changeMapStyle(styleId) {
    // 确保是有效的风格ID
    if (!mapStyles[styleId]) {
        console.error('无效的地图风格ID:', styleId);
        return;
    }
    
    // 更新当前风格
    currentMapStyle = styleId;
    
    // 根据当前显示的地图类型更新地图样式
    if (currentMapType === 'province' && provinceMap) {
        updateProvinceMapStyle();
    } else if (currentMapType === 'city' && cityMap) {
        updateCityMapStyle();
    }
}

/**
 * 恢复省份选中状态
 */
function restoreProvinceSelection() {
    if (!provinceMap || activeProvinces.length === 0) return;
    
    const option = provinceMap.getOption();
    
    // 准备选中状态映射
    const selectedMap = {};
    activeProvinces.forEach(province => {
        selectedMap[province] = true;
    });
    
    // 更新选中状态和样式
    option.series[0].data.forEach((item, index) => {
        const isSelected = selectedMap[item.name] || false;
        option.series[0].data[index] = {
            ...item,
            selected: isSelected,
            itemStyle: {
                areaColor: isSelected ? 
                    mapStyles[currentMapStyle].selected : 
                    (visitedProvinces[item.name] ? 
                        mapStyles[currentMapStyle].visited : 
                        mapStyles[currentMapStyle].unvisited)
            }
        };
    });
    
    // 更新地图配置
    provinceMap.setOption(option, true);
}

/**
 * 恢复地市选中状态
 */
function restoreCitySelection() {
    if (!cityMap || activeCities.length === 0) return;
    
    const option = cityMap.getOption();
    
    // 更新选中状态
    option.series[0].data.forEach(item => {
        if (activeCities.includes(item.name)) {
            item.selected = true;
        }
    });
    
    // 更新地图配置
    cityMap.setOption(option);
}

/**
 * 根据地市数据更新省份数据，确保一致性
 */
function updateProvinceDataFromCities() {
    console.log("开始更新省份数据，基于已访问地市");
    console.log("更新前的provinceCityMap:", provinceCityMap);
    console.log("更新前的visitedCities:", visitedCities);
    
    // 遍历所有已访问的地市
    for (const cityName in visitedCities) {
        if (visitedCities[cityName]) {
            // 查找该地市所属的省份
            let provinceName = findProvinceForCity(cityName);
            
            if (provinceName) {
                // 将该省份标记为已访问
                visitedProvinces[provinceName] = true;
                console.log(`根据地市 ${cityName} 自动标记省份 ${provinceName} 为已访问`);
            } else {
                console.warn(`无法找到地市 ${cityName} 所属的省份`);
            }
        }
    }
    
    // 保存更新后的省份数据
    saveVisitedData();
    
    console.log("更新后的省份数据:", visitedProvinces);
    console.log("更新后的省份数量:", Object.keys(visitedProvinces).length);
}

/**
 * 查找地市所属的省份
 */
function findProvinceForCity(cityName) {
    console.log(`尝试为地市 ${cityName} 查找所属省份`);
    
    // 检查provinceCityMap中是否有该地市
    for (const provinceName in provinceCityMap) {
        if (provinceCityMap[provinceName].includes(cityName)) {
            console.log(`找到地市 ${cityName} 所属的省份: ${provinceName}`);
            return provinceName;
        }
    }
    
    // 特殊处理台湾
    if (cityName === '台湾') {
        console.log(`特殊处理: 地市 ${cityName} 属于台湾省`);
        return '台湾省';
    }
    
    // 特殊处理一些常见的地市-省份映射
    const specialMapping = {
        '日喀则市': '西藏自治区',
        '延安市': '陕西省',
        '拉萨市': '西藏自治区',
        '西安市': '陕西省',
        '北京市': '北京市',
        '上海市': '上海市',
        '广州市': '广东省',
        '深圳市': '广东省',
        '杭州市': '浙江省',
        '南京市': '江苏省',
        '成都市': '四川省',
        '重庆市': '重庆市',
        '武汉市': '湖北省',
        '长沙市': '湖南省',
        '南昌市': '江西省',
        '合肥市': '安徽省',
        '郑州市': '河南省',
        '济南市': '山东省',
        '太原市': '山西省',
        '西宁市': '青海省',
        '兰州市': '甘肃省',
        '银川市': '宁夏回族自治区',
        '呼和浩特市': '内蒙古自治区',
        '乌鲁木齐市': '新疆维吾尔自治区',
        '哈尔滨市': '黑龙江省',
        '长春市': '吉林省',
        '沈阳市': '辽宁省',
        '石家庄市': '河北省',
        '南宁市': '广西壮族自治区',
        '海口市': '海南省',
        '贵阳市': '贵州省',
        '昆明市': '云南省',
        '福州市': '福建省',
        '台北市': '台湾省'
    };
    
    if (specialMapping[cityName]) {
        console.log(`使用特殊映射找到地市 ${cityName} 所属的省份: ${specialMapping[cityName]}`);
        return specialMapping[cityName];
    }
    
    // 未找到匹配的省份
    console.warn(`未能找到地市 ${cityName} 所属的省份`);
    return null;
}

/**
 * 在省份和地市页签之间同步数据
 */
function syncDataBetweenTabs() {
    console.log("同步省份和地市页签数据...");
    
    // 1. 确保所有已访问省份下的地市都被标记为已访问
    for (const provinceName in visitedProvinces) {
        if (visitedProvinces[provinceName]) {
            markCitiesInProvinceVisited(provinceName);
        }
    }
    
    // 2. 确保所有已访问地市的所属省份都被标记为已访问
    updateProvinceDataFromCities();
    
    // 3. 保存更新后的数据
    saveVisitedData();
    
    console.log("数据同步完成");
    console.log("同步后已访问省份:", Object.keys(visitedProvinces));
    console.log("同步后已访问地市:", Object.keys(visitedCities));
}

/**
 * 大图导出功能 - 在原页面弹出模态窗口显示大图
 */
function exportLargeMap() {
    // 获取当前显示的地图实例
    const chart = currentMapType === 'province' ? provinceMap : cityMap;
    
    // 如果地图实例不存在，则返回
    if (!chart) {
        console.error('地图实例不存在，无法导出');
        return;
    }
    
    // 获取选择的清晰度
    const resolutionSelect = document.querySelector('.resolution-select');
    const scale = resolutionSelect ? parseInt(resolutionSelect.value) : 1;
    
    try {
        // 检查是否已存在模态窗口，如果存在则移除
        const existingModal = document.getElementById('large-map-modal');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }
        
        // 创建模态窗口容器
        const modal = document.createElement('div');
        modal.id = 'large-map-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modal.style.zIndex = '10000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.padding = '20px';
        modal.style.boxSizing = 'border-box';
        
        // 创建模态窗口内容区域
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = 'white';
        modalContent.style.borderRadius = '8px';
        modalContent.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        modalContent.style.width = '90%';
        modalContent.style.height = '90%';
        modalContent.style.display = 'flex';
        modalContent.style.flexDirection = 'column';
        modalContent.style.position = 'relative';
        
        // 创建标题栏
        const titleBar = document.createElement('div');
        titleBar.style.padding = '15px 20px';
        titleBar.style.borderBottom = '1px solid #eee';
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        
        // 添加标题
        const title = document.createElement('h3');
        title.textContent = '中国足迹地图 - 大图导出';
        title.style.margin = '0';
        title.style.fontSize = '18px';
        titleBar.appendChild(title);
        
        // 添加按钮组
        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.gap = '10px';
        
        // 创建保存按钮
        const saveButton = document.createElement('button');
        saveButton.textContent = '保存图片';
        saveButton.style.padding = '6px 12px';
        saveButton.style.backgroundColor = '#4CAF50';
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.fontWeight = 'bold';
        
        // 添加按钮悬停效果
        saveButton.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#45a049';
        });
        saveButton.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#4CAF50';
        });
        
        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.padding = '6px 12px';
        closeButton.style.backgroundColor = '#f44336';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontWeight = 'bold';
        
        // 添加按钮悬停效果
        closeButton.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#d32f2f';
        });
        closeButton.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#f44336';
        });
        
        // 添加按钮到按钮组
        buttonGroup.appendChild(saveButton);
        buttonGroup.appendChild(closeButton);
        titleBar.appendChild(buttonGroup);
        
        // 创建地图容器
        const mapContainer = document.createElement('div');
        mapContainer.style.flex = '1';
        mapContainer.style.overflow = 'auto';
        mapContainer.style.padding = '10px';
        mapContainer.style.position = 'relative';
        
        // 创建地图画布
        const mapCanvas = document.createElement('div');
        mapCanvas.id = 'large-map-canvas';
        mapCanvas.style.width = window.innerWidth * 2 + 'px';
        mapCanvas.style.height = window.innerHeight * 2 + 'px';
        
        // 将地图画布添加到地图容器
        mapContainer.appendChild(mapCanvas);
        
        // 将标题栏和地图容器添加到模态内容
        modalContent.appendChild(titleBar);
        modalContent.appendChild(mapContainer);
        
        // 将模态内容添加到模态窗口
        modal.appendChild(modalContent);
        
        // 将模态窗口添加到页面
        document.body.appendChild(modal);
        
        // 添加关闭按钮事件
        closeButton.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        // 添加ESC键关闭
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.getElementById('large-map-modal')) {
                document.body.removeChild(modal);
            }
        });
        
        // 添加模态窗口背景点击关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // 初始化地图
        const largeChart = echarts.init(document.getElementById('large-map-canvas'));
        
        // 获取当前地图配置
        const currentOption = chart.getOption();
        
        // 设置新地图配置
        largeChart.setOption(currentOption);
        
        // 修复图表样式（确保完整渲染）
        setTimeout(() => {
            largeChart.resize();
        }, 100);
        
        // 添加保存按钮事件
        saveButton.addEventListener('click', function() {
            // 获取图片数据URL
            const imageURL = largeChart.getDataURL({
                pixelRatio: scale,
                backgroundColor: '#fff'
            });
            
            // 创建下载链接
            const downloadLink = document.createElement('a');
            downloadLink.href = imageURL;
            downloadLink.download = `中国足迹地图_${currentMapType === 'province' ? '省份' : '地市'}_${new Date().getTime()}.png`;
            downloadLink.click();
        });
        
    } catch (error) {
        console.error('打开大图模式失败:', error);
        alert('打开大图模式失败，请稍后重试');
    }
}

/**
 * 显示分享对话框
 */
function showShareDialog() {
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
    content.textContent = '访问网站 https://explorehenan.com/footprint/china.html 记录您探索的中国，制作中国足迹地图';
    
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

function toggleDefaultMapLabels() {
    let chart = null;
    if (currentMapType === 'province') {
        chart = provinceMap;
    } else {
        chart = cityMap;
    }
    if (!chart) return;
    const option = chart.getOption();
    if (!option.series || !option.series[0] || !option.series[0].label) return;
    const series = option.series[0];
    const isLabelVisible = series.label.show;
    chart.setOption({
        series: [{
            label: {
                show: !isLabelVisible
            }
        }]
    }); // 彻底移除notMerge:true
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

function toggleMapLabels() {
    let chart = null;
    if (currentMapType === 'province') {
        chart = provinceMap;
    } else {
        chart = cityMap;
    }
    if (!chart) return;
    const option = chart.getOption();
    if (!option.series || !option.series[0] || !option.series[0].emphasis || !option.series[0].emphasis.label) return; // 健壮性判断
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
