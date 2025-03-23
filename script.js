const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const districtList = document.getElementById('district-list');
const cityCountDisplay = document.getElementById('cityCount');
const exportBtn = document.getElementById('exportBtn');

let geoData;
let selectedCities = new Set();
let scale = 1; // 缩放比例
let offsetX = 0; // 平移X
let offsetY = 0; // 平移Y
let isDragging = false;
let startX, startY;

// 设置 Canvas 尺寸
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// 加载河南省行政区划数据
async function loadGeoData() {
    const response = await fetch('./data/henan.json');
    if (!response.ok) {
        console.error('Failed to load geo data:', response.statusText);
        return;
    }
    geoData = await response.json();
    console.log('GeoData loaded:', geoData); // 调试信息
    drawMap();
    populateDistrictList();
}

// 绘制地图
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算坐标范围
    const bounds = getBounds(geoData.features);
    
    // 计算宽高比
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    // 计算缩放比例
    const scaleX = (canvas.width - 20) / width; // 留出边距
    const scaleY = (canvas.height - 20) / height; // 留出边距
    const scaleFactor = Math.min(scaleX, scaleY) * scale; // 选择较小的比例以保持比例

    // 计算偏移量
    const offsetX = (canvas.width - (width * scaleFactor)) / 2; // 居中
    const offsetY = (canvas.height - (height * scaleFactor)) / 2; // 居中

    geoData.features.forEach(feature => {
        ctx.beginPath();
        const coordinates = feature.geometry.coordinates;
        
        // 处理多边形的坐标
        coordinates.forEach(polygon => {
            ctx.moveTo(
                ((polygon[0][0][0] - bounds.minX) * scaleFactor + offsetX),
                ((bounds.maxY - polygon[0][0][1]) * scaleFactor + offsetY) // 反转Y坐标
            );
            polygon[0].forEach(coord => {
                const x = ((coord[0] - bounds.minX) * scaleFactor + offsetX);
                const y = ((bounds.maxY - coord[1]) * scaleFactor + offsetY); // 反转Y坐标
                ctx.lineTo(x, y);
            });
        });
        
        ctx.closePath();
        ctx.fillStyle = selectedCities.has(feature.properties.name) ? 'rgba(255, 0, 0, 0.5)' : 'rgba(200, 200, 200, 0.5)';
        ctx.strokeStyle = 'black'; // 设置边界颜色
        ctx.stroke();
        ctx.fill();
    });
}

// 计算坐标范围
function getBounds(features) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    features.forEach(feature => {
        // 处理多边形的坐标
        const coordinates = feature.geometry.coordinates;
        coordinates.forEach(polygon => {
            polygon[0].forEach(coord => {
                if (coord[0] < minX) minX = coord[0];
                if (coord[0] > maxX) maxX = coord[0];
                if (coord[1] < minY) minY = coord[1];
                if (coord[1] > maxY) maxY = coord[1];
            });
        });
    });
    
    return { minX, minY, maxX, maxY };
}

// 填充行政区划列表
function populateDistrictList() {
    geoData.features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature.properties.name;
        li.onclick = () => toggleCitySelection(feature.properties.name);
        districtList.appendChild(li);
    });
}

// 切换城市选择状态
function toggleCitySelection(cityName) {
    if (selectedCities.has(cityName)) {
        selectedCities.delete(cityName);
    } else {
        selectedCities.add(cityName);
    }
    cityCountDisplay.textContent = selectedCities.size;
    drawMap();
}

// 导出足迹图片
exportBtn.onclick = () => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'henan_map.png';
    link.click();
};

// 缩放功能
canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const zoomFactor = 0.1;
    scale += event.deltaY > 0 ? -zoomFactor : zoomFactor;
    scale = Math.max(scale, 0.1); // 防止缩放过小
    drawMap();
});

// 拖动功能
canvas.addEventListener('mousedown', (event) => {
    isDragging = true;
    startX = event.offsetX - offsetX;
    startY = event.offsetY - offsetY;
});

canvas.addEventListener('mousemove', (event) => {
    if (isDragging) {
        offsetX = event.offsetX - startX;
        offsetY = event.offsetY - startY;
        drawMap();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});

// 初始化
loadGeoData();