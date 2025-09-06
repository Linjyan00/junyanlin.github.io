// 访客地理位置统计地图
class VisitorMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.visitorData = this.loadVisitorData();
        this.map = null;
        this.markers = [];
        this.init();
    }

    // 初始化地图
    init() {
        // 检查是否已经加载了Leaflet
        if (typeof L === 'undefined') {
            console.error('Leaflet library not loaded');
            return;
        }

        // 创建地图
        this.map = L.map(this.containerId).setView([20, 0], 2);
        
        // 添加地图瓦片
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // 加载访客数据并显示
        this.loadAndDisplayVisitors();
        
        // 更新统计信息显示
        this.updateStatsDisplay();
    }

    // 获取访客地理位置
    async getVisitorLocation() {
        try {
            // 使用免费的IP地理位置API
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data.error) {
                console.warn('Failed to get location:', data.reason);
                return null;
            }

            return {
                ip: data.ip,
                country: data.country_name,
                city: data.city,
                latitude: data.latitude,
                longitude: data.longitude,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.warn('Failed to get visitor location:', error);
            return null;
        }
    }

    // 保存访客数据到localStorage
    saveVisitorData(visitorInfo) {
        if (!visitorInfo) return;

        // 检查是否已经记录过这个IP
        const existingVisitor = this.visitorData.find(v => v.ip === visitorInfo.ip);
        
        if (existingVisitor) {
            // 更新访问时间
            existingVisitor.lastVisit = visitorInfo.timestamp;
            existingVisitor.visitCount = (existingVisitor.visitCount || 1) + 1;
        } else {
            // 添加新访客
            this.visitorData.push({
                ...visitorInfo,
                visitCount: 1,
                firstVisit: visitorInfo.timestamp,
                lastVisit: visitorInfo.timestamp
            });
        }

        // 保存到localStorage
        localStorage.setItem('visitorMapData', JSON.stringify(this.visitorData));
    }

    // 从localStorage加载访客数据
    loadVisitorData() {
        try {
            const data = localStorage.getItem('visitorMapData');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.warn('Failed to load visitor data:', error);
            return [];
        }
    }

    // 加载并显示访客数据
    async loadAndDisplayVisitors() {
        // 获取当前访客位置
        const currentVisitor = await this.getVisitorLocation();
        if (currentVisitor) {
            this.saveVisitorData(currentVisitor);
        }

        // 显示所有访客位置
        this.displayVisitors();
    }

    // 在地图上显示访客位置
    displayVisitors() {
        // 清除现有标记
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // 按国家分组统计
        const countryStats = {};
        this.visitorData.forEach(visitor => {
            if (visitor.latitude && visitor.longitude) {
                const country = visitor.country || 'Unknown';
                if (!countryStats[country]) {
                    countryStats[country] = {
                        count: 0,
                        visitors: [],
                        lat: visitor.latitude,
                        lng: visitor.longitude
                    };
                }
                countryStats[country].count += visitor.visitCount;
                countryStats[country].visitors.push(visitor);
            }
        });

        // 为每个国家创建标记
        Object.entries(countryStats).forEach(([country, stats]) => {
            const marker = L.circleMarker([stats.lat, stats.lng], {
                radius: Math.min(Math.max(stats.count * 2, 8), 20),
                fillColor: this.getColorByCount(stats.count),
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);

            // 添加弹出信息
            const popupContent = `
                <div style="text-align: center;">
                    <h4>${country}</h4>
                    <p><strong>访问次数:</strong> ${stats.count}</p>
                    <p><strong>访客数量:</strong> ${stats.visitors.length}</p>
                    <small>最近访问: ${new Date(stats.visitors[0].lastVisit).toLocaleDateString()}</small>
                </div>
            `;
            marker.bindPopup(popupContent);

            this.markers.push(marker);
        });

        // 添加图例
        this.addLegend();
    }

    // 根据访问次数获取颜色
    getColorByCount(count) {
        if (count >= 10) return '#d73027'; // 红色
        if (count >= 5) return '#f46d43';  // 橙红色
        if (count >= 3) return '#fdae61';  // 橙色
        if (count >= 2) return '#fee08b';  // 黄色
        return '#e6f598'; // 浅绿色
    }

    // 添加图例
    addLegend() {
        const legend = L.control({position: 'bottomright'});
        
        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'visitor-map-legend');
            div.innerHTML = `
                <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                    <h4 style="margin: 0 0 10px 0; font-size: 14px;">访问统计</h4>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 12px; height: 12px; background: #d73027; border-radius: 50%; margin-right: 8px;"></div>
                        <span style="font-size: 12px;">10+ 次访问</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 12px; height: 12px; background: #f46d43; border-radius: 50%; margin-right: 8px;"></div>
                        <span style="font-size: 12px;">5-9 次访问</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 12px; height: 12px; background: #fdae61; border-radius: 50%; margin-right: 8px;"></div>
                        <span style="font-size: 12px;">3-4 次访问</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 12px; height: 12px; background: #fee08b; border-radius: 50%; margin-right: 8px;"></div>
                        <span style="font-size: 12px;">2 次访问</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 12px; height: 12px; background: #e6f598; border-radius: 50%; margin-right: 8px;"></div>
                        <span style="font-size: 12px;">1 次访问</span>
                    </div>
                </div>
            `;
            return div;
        };
        
        legend.addTo(this.map);
    }

    // 更新统计信息显示
    updateStatsDisplay() {
        const stats = this.getStats();
        const statsElement = document.getElementById('visitor-stats-text');
        if (statsElement) {
            statsElement.innerHTML = `
                总访问次数: <strong>${stats.totalVisits}</strong> | 
                独立访客: <strong>${stats.uniqueVisitors}</strong> | 
                来自国家: <strong>${stats.countries}</strong>
            `;
        }
    }

    // 获取统计信息
    getStats() {
        const totalVisits = this.visitorData.reduce((sum, visitor) => sum + (visitor.visitCount || 1), 0);
        const uniqueVisitors = this.visitorData.length;
        const countries = [...new Set(this.visitorData.map(v => v.country).filter(Boolean))].length;
        
        return {
            totalVisits,
            uniqueVisitors,
            countries
        };
    }
}

// 页面加载完成后初始化地图
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否有访客地图容器
    const mapContainer = document.getElementById('visitor-map');
    if (mapContainer) {
        // 加载Leaflet CSS和JS
        if (!document.querySelector('link[href*="leaflet"]')) {
            const leafletCSS = document.createElement('link');
            leafletCSS.rel = 'stylesheet';
            leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(leafletCSS);
        }

        if (typeof L === 'undefined') {
            const leafletJS = document.createElement('script');
            leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            leafletJS.onload = function() {
                window.visitorMap = new VisitorMap('visitor-map');
            };
            document.head.appendChild(leafletJS);
        } else {
            window.visitorMap = new VisitorMap('visitor-map');
        }
    }
});
