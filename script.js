document.addEventListener('DOMContentLoaded', function() {
    // 初始化变量
    let currentMode = 'city'; // 'city' 或 'county'
    let visitedCities = [];
    let visitedCounties = [];
    let henanCities = [
        '郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市', 
        '新乡市', '焦作市', '濮阳市', '许昌市', '漯河市', '三门峡市',
        '南阳市', '商丘市', '信阳市', '周口市', '驻马店市', '济源市'
    ];
    let henanCounties = []; // 将在加载数据后填充
    
    // 获取DOM元素
    const mapChart = document.getElementById('map-chart');
    const locationList = document.getElementById('location-list');
    const cityToggle = document.getElementById('city-toggle');
    const countyToggle = document.getElementById('county-toggle');
    let countDisplay = document.getElementById('city-count'); // 修改为let而非const
    const exportBtn = document.getElementById('export-btn');
    const shareBtn = document.getElementById('share-btn');
    
    // 初始化ECharts实例
    const chart = echarts.init(mapChart);
    
    // 加载地图数据
    function loadMapData(mode) {
        const mapFile = mode === 'city' ? './data/henan.json' : './data/henan_qx.json';
        
        return fetch(mapFile)
            .then(response => {
                if (!response.ok) {
                    throw new Error('无法加载地图数据：' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                // 注册地图
                echarts.registerMap('henan', data);
                
                // 提取区县数据
                if (mode === 'county' && data.features) {
                    // 获取一个区县属性的示例，帮助调试
                    if (data.features.length > 0) {
                        console.log('数据样例:', JSON.stringify(data.features[0].properties, null, 2));
                    }
                    
                    // 清空现有区县数据
                    henanCounties = [];
                    
                    // 处理复杂的城市属性
                    function parseCity(cityProp) {
                        if (typeof cityProp === 'string') {
                            return cityProp;
                        } else if (cityProp && typeof cityProp === 'object') {
                            // 尝试获取对象中的name属性或其他可能的属性
                            if (typeof cityProp.name === 'string') return cityProp.name;
                            if (typeof cityProp.NAME === 'string') return cityProp.NAME;
                            if (typeof cityProp.title === 'string') return cityProp.title;
                            
                            // 如果没有找到合适的属性，尝试转为字符串
                            const cityStr = String(cityProp);
                            if (cityStr !== '[object Object]') {
                                return cityStr;
                            }
                        }
                        return '';
                    }
                    
                    // 解析区县数据
                    data.features.forEach(feature => {
                        if (feature.properties && feature.properties.name) {
                            let name = feature.properties.name;
                            let city = '';
                            
                            // 尝试多种方式获取所属城市
                            if (feature.properties.city) {
                                city = parseCity(feature.properties.city);
                            } else if (feature.properties.cityname) {
                                city = feature.properties.cityname;
                            } else if (feature.properties.parent) {
                                city = feature.properties.parent;
                            }
                            
                            // 如果仍未获取到城市，尝试用名称推断
                            if (!city) {
                                for (const cityName of henanCities) {
                                    const cityPrefix = cityName.replace('市', '');
                                    if (name.startsWith(cityPrefix)) {
                                        city = cityName;
                                        break;
                                    }
                                }
                            }
                            
                            // 手动匹配一些特殊区县
                            if (!city) {
                                if (name.includes('郑州') || 
                                    ['中原区', '二七区', '金水区', '惠济区', '管城回族区', '上街区'].includes(name)) {
                                    city = '郑州市';
                                } else if (name.includes('开封') || 
                                          ['龙亭区', '鼓楼区', '禹王台区', '顺河回族区'].includes(name)) {
                                    city = '开封市';
                                }
                                // 可以添加更多手动匹配规则...
                            }
                            
                            // 确保有所属市
                            if (!city) {
                                city = '未分类';
                            }
                            
                            console.log(`解析区县: ${name}, 所属市: ${city}`);
                            
                            henanCounties.push({
                                name: name,
                                city: city
                            });
                        }
                    });
                    
                    console.log(`共提取 ${henanCounties.length} 个区县数据`);
                }
                
                return data;
            });
    }
    
    // 渲染地图
    function renderMap() {
        // 准备地图数据
        let mapData = [];
        
        if (currentMode === 'city') {
            mapData = henanCities.map(city => {
                return {
                    name: city,
                    value: visitedCities.includes(city) ? 1 : 0,
                    itemStyle: {
                        areaColor: visitedCities.includes(city) ? '#ff6b6b' : '#f3f3f3'
                    }
                };
            });
        } else {
            mapData = henanCounties.map(county => {
                const countyName = county.name;
                return {
                    name: countyName,
                    value: visitedCounties.includes(countyName) ? 1 : 0,
                    itemStyle: {
                        areaColor: visitedCounties.includes(countyName) ? '#ff6b6b' : '#f3f3f3'
                    }
                };
            });
        }
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{b}'
            },
            series: [{
                type: 'map',
                map: 'henan',
                roam: true,
                label: {
                    show: false, // 默认不显示标签，避免过于拥挤
                    fontSize: 10
                },
                itemStyle: {
                    areaColor: '#f3f3f3',
                    borderColor: '#ddd'
                },
                emphasis: {
                    label: {
                        show: true
                    },
                    itemStyle: {
                        areaColor: '#f8a59b'
                    }
                },
                select: {
                    itemStyle: {
                        areaColor: '#ff6b6b'
                    }
                },
                selectedMode: 'multiple',
                data: mapData
            }]
        };
        
        chart.setOption(option);
        
        // 调用新的updateStats函数替代原来的统计代码
        updateStats();
    }
    
    // 渲染地点列表
    function renderLocationList() {
        locationList.innerHTML = '';
        
        if (currentMode === 'city') {
            // 渲染地市列表
            henanCities.forEach(city => {
                const item = document.createElement('div');
                item.className = 'location-item';
                item.textContent = city;
                
                if (visitedCities.includes(city)) {
                    item.classList.add('selected');
                }
                
                item.addEventListener('click', () => {
                    toggleLocation(city);
                });
                
                locationList.appendChild(item);
            });
        } else {
            // 区县模式 - 使用表格式布局展示
            if (henanCounties.length === 0) {
                const notice = document.createElement('div');
                notice.className = 'loading-notice';
                notice.textContent = '正在加载区县数据，请稍候...';
                locationList.appendChild(notice);
                return;
            }
            
            // 创建表格容器
            const tableContainer = document.createElement('div');
            tableContainer.className = 'county-table-container';
            
            // 创建表格
            const table = document.createElement('table');
            table.className = 'county-table';
            
            // 预定义河南省各地市及其对应的区县
            // 这里使用硬编码方式确保数据准确性
            const cityCountyMap = {
                '郑州市': ['中原区', '二七区', '管城回族区', '金水区', '上街区', '惠济区', '中牟县', '荥阳市', '新密市', '新郑市', '登封市', '巩义市'],
                '开封市': ['龙亭区', '顺河回族区', '鼓楼区', '禹王台区', '祥符区', '杞县', '通许县', '尉氏县', '兰考县'],
                '洛阳市': ['老城区', '西工区', '瀍河回族区', '涧西区', '洛龙区', '偃师区', '孟津区', '新安县', '栾川县', '嵩县', '汝阳县', '宜阳县', '洛宁县', '伊川县'],
                '平顶山市': ['新华区', '卫东区', '石龙区', '湛河区', '宝丰县', '叶县', '鲁山县', '郏县', '舞钢市', '汝州市'],
                '安阳市': ['文峰区', '北关区', '殷都区', '龙安区', '安阳县', '汤阴县', '内黄县', '滑县', '林州市'],
                '鹤壁市': ['鹤山区', '山城区', '淇滨区', '浚县', '淇县'],
                '新乡市': ['红旗区', '卫滨区', '凤泉区', '牧野区', '新乡县', '获嘉县', '原阳县', '延津县', '封丘县', '卫辉市', '辉县市', '长垣市'],
                '焦作市': ['解放区', '中站区', '马村区', '山阳区', '修武县', '博爱县', '武陟县', '温县', '沁阳市', '孟州市'],
                '濮阳市': ['华龙区', '清丰县', '南乐县', '范县', '台前县', '濮阳县'],
                '许昌市': ['魏都区', '建安区', '鄢陵县', '襄城县', '禹州市', '长葛市'],
                '漯河市': ['源汇区', '郾城区', '召陵区', '舞阳县', '临颍县'],
                '三门峡市': ['湖滨区', '陕州区', '渑池县', '卢氏县', '义马市', '灵宝市'],
                '南阳市': ['宛城区', '卧龙区', '南召县', '方城县', '西峡县', '镇平县', '内乡县', '淅川县', '社旗县', '唐河县', '新野县', '桐柏县', '邓州市'],
                '商丘市': ['梁园区', '睢阳区', '民权县', '睢县', '宁陵县', '柘城县', '虞城县', '夏邑县', '永城市'],
                '信阳市': ['浉河区', '平桥区', '罗山县', '光山县', '新县', '商城县', '固始县', '潢川县', '淮滨县', '息县'],
                '周口市': ['川汇区', '淮阳区', '扶沟县', '西华县', '商水县', '沈丘县', '郸城县', '太康县', '鹿邑县', '项城市'],
                '驻马店市': ['驿城区', '西平县', '上蔡县', '平舆县', '正阳县', '确山县', '泌阳县', '汝南县', '遂平县', '新蔡县'],
                '济源市': ['济源市']
            };
            
            // 为每个地市创建一行
            Object.keys(cityCountyMap).forEach(cityName => {
                // 创建行
                const row = document.createElement('tr');
                
                // 地市单元格
                const cityCell = document.createElement('td');
                cityCell.className = 'city-cell';
                cityCell.textContent = cityName;
                row.appendChild(cityCell);
                
                // 区县单元格
                const countyCell = document.createElement('td');
                countyCell.className = 'county-cell';
                
                // 添加区县
                cityCountyMap[cityName].forEach(countyName => {
                    const countyItem = document.createElement('span');
                    countyItem.className = 'county-item';
                    countyItem.textContent = countyName;
                    
                    // 检查是否已访问
                    if (visitedCounties.includes(countyName)) {
                        countyItem.classList.add('visited');
                    }
                    
                    // 点击切换访问状态
                    countyItem.addEventListener('click', () => {
                        toggleLocation(countyName);
                    });
                    
                    countyCell.appendChild(countyItem);
                });
                
                row.appendChild(countyCell);
                table.appendChild(row);
            });
            
            tableContainer.appendChild(table);
            locationList.appendChild(tableContainer);
        }
    }
    
    // 切换地点访问状态
    function toggleLocation(name) {
        if (currentMode === 'city') {
            const index = visitedCities.indexOf(name);
            if (index > -1) {
                visitedCities.splice(index, 1);
            } else {
                visitedCities.push(name);
            }
        } else {
            const index = visitedCounties.indexOf(name);
            if (index > -1) {
                visitedCounties.splice(index, 1);
            } else {
                visitedCounties.push(name);
            }
        }
        
        renderMap();
        renderLocationList();
    }
    
    // 地图事件监听
    chart.on('click', function(params) {
        toggleLocation(params.name);
    });
    
    // 窗口大小变化时重新调整地图大小
    window.addEventListener('resize', function() {
        chart.resize();
    });
    
    // 切换模式事件
    cityToggle.addEventListener('click', function() {
        if (currentMode !== 'city') {
            currentMode = 'city';
            cityToggle.classList.add('active');
            countyToggle.classList.remove('active');
            
            loadMapData('city').then(() => {
                renderMap(); // renderMap会调用updateStats
                renderLocationList();
            }).catch(error => {
                console.error('加载地市数据失败:', error);
                alert('地市数据加载失败，请刷新重试');
            });
        }
    });
    
    countyToggle.addEventListener('click', function() {
        if (currentMode !== 'county') {
            currentMode = 'county';
            countyToggle.classList.add('active');
            cityToggle.classList.remove('active');
            
            loadMapData('county').then(() => {
                renderMap(); // renderMap会调用updateStats
                renderLocationList();
            }).catch(error => {
                console.error('加载区县数据失败:', error);
                alert('区县数据加载失败，请刷新重试');
            });
        }
    });
    
    // 导出图片
    exportBtn.addEventListener('click', function() {
        // 显示导出中的提示
        const exportTip = document.createElement('div');
        exportTip.style.position = 'fixed';
        exportTip.style.top = '50%';
        exportTip.style.left = '50%';
        exportTip.style.transform = 'translate(-50%, -50%)';
        exportTip.style.padding = '10px 20px';
        exportTip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        exportTip.style.color = 'white';
        exportTip.style.borderRadius = '5px';
        exportTip.style.zIndex = '9999';
        exportTip.textContent = '正在生成图片，请稍候...';
        document.body.appendChild(exportTip);
        
        // 使用 html2canvas 生成图片
        setTimeout(() => {
            html2canvas(document.querySelector('.container'), {
                backgroundColor: '#f5f5f7',
                scale: 2, // 提高导出图片的清晰度
                logging: false
            }).then(canvas => {
                // 移除提示
                document.body.removeChild(exportTip);
                
                // 创建下载链接
                const link = document.createElement('a');
                link.download = '河南省足迹地图.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(error => {
                console.error('导出图片失败:', error);
                document.body.removeChild(exportTip);
                alert('图片导出失败，请重试');
            });
        }, 100);
    });
    
    // 分享足迹
    shareBtn.addEventListener('click', function() {
        // 实现分享功能，例如调用Web Share API（如果浏览器支持）
        if (navigator.share) {
            navigator.share({
                title: '我的河南省足迹地图',
                text: `我已经去过河南省${visitedCities.length}个地市${visitedCounties.length}个区县！`,
                url: window.location.href
            }).catch(error => {
                console.log('分享失败:', error);
                alert('分享功能开发中...');
            });
        } else {
            alert('分享功能开发中...');
        }
    });
    
    // 初始化 - 加载本地存储中的数据（如果有）
    function loadLocalData() {
        const savedCities = localStorage.getItem('hnmap_visitedCities');
        const savedCounties = localStorage.getItem('hnmap_visitedCounties');
        
        if (savedCities) {
            try {
                visitedCities = JSON.parse(savedCities);
            } catch (e) {
                console.error('解析保存的城市数据出错:', e);
            }
        }
        
        if (savedCounties) {
            try {
                visitedCounties = JSON.parse(savedCounties);
            } catch (e) {
                console.error('解析保存的区县数据出错:', e);
            }
        }
    }
    
    // 保存数据到本地存储
    function saveLocalData() {
        localStorage.setItem('hnmap_visitedCities', JSON.stringify(visitedCities));
        localStorage.setItem('hnmap_visitedCounties', JSON.stringify(visitedCounties));
    }
    
    // 在每次变更数据后保存
    function saveDataAfterChange() {
        // 使用防抖函数避免频繁保存
        clearTimeout(saveDataTimeout);
        saveDataTimeout = setTimeout(saveLocalData, 500);
    }
    
    let saveDataTimeout;
    
    // 修改toggleLocation函数，确保更新统计
    const originalToggleLocation = toggleLocation;
    toggleLocation = function(name) {
        originalToggleLocation(name);
        saveDataAfterChange();
        updateStats(); // 添加这一行，确保每次切换状态时更新统计数字
    };
    
    // 初始化应用程序
    loadLocalData();
    loadMapData('city').then(() => {
        renderMap();
        renderLocationList();
    }).catch(error => {
        console.error('初始化加载地图数据失败:', error);
        alert('地图数据加载失败，请刷新页面重试');
    });

    // 修改updateStats函数，用于更新地图上方的统计信息
    function updateStats() {
        if (currentMode === 'city') {
            // 地市模式统计
            document.querySelector('.stats p').innerHTML = 
                `您已到过河南 <span id="city-count">${visitedCities.length}</span> 个地市`;
            countDisplay = document.getElementById('city-count');
        } else {
            // 区县模式统计
            // 1. 计算已访问的区县数量
            const visitedCountyCount = visitedCounties.length;
            
            // 2. 计算已访问地市数量（基于区县统计）
            const visitedCitySet = new Set();
            const cityCountyMap = getCityCountyMap();
            
            // 根据已访问区县推算已到访地市
            visitedCounties.forEach(countyName => {
                // 查找该区县所属的地市
                for (const city in cityCountyMap) {
                    if (cityCountyMap[city].includes(countyName)) {
                        visitedCitySet.add(city);
                        break;
                    }
                }
            });
            
            // 更新统计文字
            document.querySelector('.stats p').innerHTML = 
                `您已到过河南 <span id="city-count">${visitedCitySet.size}</span> 个地市 <span id="county-count">${visitedCountyCount}</span> 个区县`;
            countDisplay = document.getElementById('county-count');
        }
    }

    // 获取地市-区县映射表
    function getCityCountyMap() {
        return {
            '郑州市': ['中原区', '二七区', '管城回族区', '金水区', '上街区', '惠济区', '中牟县', '荥阳市', '新密市', '新郑市', '登封市', '巩义市'],
            '开封市': ['龙亭区', '顺河回族区', '鼓楼区', '禹王台区', '祥符区', '杞县', '通许县', '尉氏县', '兰考县'],
            '洛阳市': ['老城区', '西工区', '瀍河回族区', '涧西区', '洛龙区', '偃师区', '孟津区', '新安县', '栾川县', '嵩县', '汝阳县', '宜阳县', '洛宁县', '伊川县'],
            '平顶山市': ['新华区', '卫东区', '石龙区', '湛河区', '宝丰县', '叶县', '鲁山县', '郏县', '舞钢市', '汝州市'],
            '安阳市': ['文峰区', '北关区', '殷都区', '龙安区', '安阳县', '汤阴县', '内黄县', '滑县', '林州市'],
            '鹤壁市': ['鹤山区', '山城区', '淇滨区', '浚县', '淇县'],
            '新乡市': ['红旗区', '卫滨区', '凤泉区', '牧野区', '新乡县', '获嘉县', '原阳县', '延津县', '封丘县', '卫辉市', '辉县市', '长垣市'],
            '焦作市': ['解放区', '中站区', '马村区', '山阳区', '修武县', '博爱县', '武陟县', '温县', '沁阳市', '孟州市'],
            '濮阳市': ['华龙区', '清丰县', '南乐县', '范县', '台前县', '濮阳县'],
            '许昌市': ['魏都区', '建安区', '鄢陵县', '襄城县', '禹州市', '长葛市'],
            '漯河市': ['源汇区', '郾城区', '召陵区', '舞阳县', '临颍县'],
            '三门峡市': ['湖滨区', '陕州区', '渑池县', '卢氏县', '义马市', '灵宝市'],
            '南阳市': ['宛城区', '卧龙区', '南召县', '方城县', '西峡县', '镇平县', '内乡县', '淅川县', '社旗县', '唐河县', '新野县', '桐柏县', '邓州市'],
            '商丘市': ['梁园区', '睢阳区', '民权县', '睢县', '宁陵县', '柘城县', '虞城县', '夏邑县', '永城市'],
            '信阳市': ['浉河区', '平桥区', '罗山县', '光山县', '新县', '商城县', '固始县', '潢川县', '淮滨县', '息县'],
            '周口市': ['川汇区', '淮阳区', '扶沟县', '西华县', '商水县', '沈丘县', '郸城县', '太康县', '鹿邑县', '项城市'],
            '驻马店市': ['驿城区', '西平县', '上蔡县', '平舆县', '正阳县', '确山县', '泌阳县', '汝南县', '遂平县', '新蔡县'],
            '济源市': ['济源市']
        };
    }
});