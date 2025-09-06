// Visitor Geographic Location Statistics Map
class VisitorMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.visitorData = this.loadVisitorData();
        this.map = null;
        this.markers = [];
        this.init();
    }

    // Initialize map
    init() {
        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            console.error('Leaflet library not loaded');
            return;
        }

        // Create map
        this.map = L.map(this.containerId).setView([20, 0], 2);
        
        // Add map tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Load and display visitor data
        this.loadAndDisplayVisitors();
        
        // Update statistics display
        this.updateStatsDisplay();
    }

    // Get visitor geographic location
    async getVisitorLocation() {
        try {
            // Use free IP geolocation API
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

    // Save visitor data to localStorage
    saveVisitorData(visitorInfo) {
        if (!visitorInfo) return;

        // Check if this IP has been recorded before
        const existingVisitor = this.visitorData.find(v => v.ip === visitorInfo.ip);
        
        if (existingVisitor) {
            // Update visit time
            existingVisitor.lastVisit = visitorInfo.timestamp;
            existingVisitor.visitCount = (existingVisitor.visitCount || 1) + 1;
        } else {
            // Add new visitor
            this.visitorData.push({
                ...visitorInfo,
                visitCount: 1,
                firstVisit: visitorInfo.timestamp,
                lastVisit: visitorInfo.timestamp
            });
        }

        // Save to localStorage
        localStorage.setItem('visitorMapData', JSON.stringify(this.visitorData));
    }

    // Load visitor data from localStorage
    loadVisitorData() {
        try {
            const data = localStorage.getItem('visitorMapData');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.warn('Failed to load visitor data:', error);
            return [];
        }
    }

    // Load and display visitor data
    async loadAndDisplayVisitors() {
        // Get current visitor location
        const currentVisitor = await this.getVisitorLocation();
        if (currentVisitor) {
            this.saveVisitorData(currentVisitor);
        }

        // Display all visitor locations
        this.displayVisitors();
    }

    // Display visitor locations on map
    displayVisitors() {
        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Group statistics by country
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

        // Create markers for each country
        Object.entries(countryStats).forEach(([country, stats]) => {
            const marker = L.circleMarker([stats.lat, stats.lng], {
                radius: Math.min(Math.max(stats.count * 2, 8), 20),
                fillColor: this.getColorByCount(stats.count),
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);

            // Add popup information
            const popupContent = `
                <div style="text-align: center;">
                    <h4>${country}</h4>
                    <p><strong>Visits:</strong> ${stats.count}</p>
                    <p><strong>Visitors:</strong> ${stats.visitors.length}</p>
                    <small>Last visit: ${new Date(stats.visitors[0].lastVisit).toLocaleDateString()}</small>
                </div>
            `;
            marker.bindPopup(popupContent);

            this.markers.push(marker);
        });

        // Legend removed as requested
    }

    // Get color based on visit count
    getColorByCount(count) {
        if (count >= 10) return '#d73027'; // Red
        if (count >= 5) return '#f46d43';  // Orange-red
        if (count >= 3) return '#fdae61';  // Orange
        if (count >= 2) return '#fee08b';  // Yellow
        return '#e6f598'; // Light green
    }


    // Update statistics display
    updateStatsDisplay() {
        const stats = this.getStats();
        const statsElement = document.getElementById('visitor-stats-text');
        if (statsElement) {
            statsElement.innerHTML = `
                Total Visits: <strong>${stats.totalVisits}</strong> | 
                Unique Visitors: <strong>${stats.uniqueVisitors}</strong> | 
                Countries: <strong>${stats.countries}</strong>
            `;
        }
    }

    // Get statistics
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

// Initialize map after page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if visitor map container exists
    const mapContainer = document.getElementById('visitor-map');
    if (mapContainer) {
        // Load Leaflet CSS and JS
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
