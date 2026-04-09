let map;
let currentLayers = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Map centered over India
    map = L.map('map', {zoomControl: false}).setView([22.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Render underlying active network natively from coreData.js
    nodes.forEach(st => {
        const markerHtml = `<div class="station-marker"></div>`;
        const icon = L.divIcon({ html: markerHtml, className: 'custom-div-icon', iconSize: [12, 12] });
        L.marker([st.lat, st.lon], { icon }).addTo(map).bindPopup(`<small style="color:#94a3b8">EV Hub</small><br><b>${st.name}</b>`);
    });

    const form = document.getElementById('route-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSearch();
    });
});

function handleSearch() {
    const errorMsg = document.getElementById('error-msg');
    errorMsg.style.display = 'none';

    const cityInput = document.getElementById('city-input').value.trim().toLowerCase();
    const batteryPercent = parseInt(document.getElementById('battery-input').value);

    // Find city
    const srcNode = nodes.find(n => n.name.toLowerCase() === cityInput);
    if (!srcNode) {
        errorMsg.textContent = "Invalid city! Not found in network.";
        errorMsg.style.display = 'block';
        return;
    }

    const batteryKm = (batteryPercent * 400) / 100;
    
    const { candidates, parent } = runDijkstra(srcNode.id, batteryKm);

    renderResults(srcNode, candidates, parent, batteryKm);
}

function runDijkstra(sourceId, maxDistance) {
    const dist = {};
    const parent = {};
    nodes.forEach(n => { dist[n.id] = Infinity; parent[n.id] = -1; });
    dist[sourceId] = 0;
    
    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
        adj[e[0]].push({to: e[1], weight: e[2]});
        adj[e[1]].push({to: e[0], weight: e[2]});
    });

    const unvisited = new Set(nodes.map(n => n.id));
    
    while(unvisited.size > 0) {
        let u = null;
        for(let v of unvisited) {
            if(u === null || dist[v] < dist[u]) {
                u = v;
            }
        }
        if(dist[u] === Infinity || u === null) break;
        unvisited.delete(u);
        
        for(let edge of adj[u]) {
            let v = edge.to;
            let weight = edge.weight;
            if(dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                parent[v] = u;
            }
        }
    }
    
    let candidates = [];
    for(let cityId in cityStations) {
        let d = dist[cityId];
        if(d !== Infinity && d <= maxDistance) {
            candidates.push({id: parseInt(cityId), dist: d});
        }
    }
    
    return { candidates: candidates.sort((a,b) => a.dist - b.dist), parent };
}

function renderResults(srcNode, candidates, parent, maxBattery) {
    const resultsArea = document.getElementById('dynamic-results');
    
    // Clear old route layers
    currentLayers.forEach(l => map.removeLayer(l));
    currentLayers = [];

    // recenter
    map.setView([srcNode.lat, srcNode.lon], 6);

    let html = `
        <div style="margin-top:20px;">
            <p style="color:#94a3b8; font-size:14px; margin: 0 0 8px 0;">Current Location</p>
            <div class="source-chip">📍 ${srcNode.name}</div>
        </div>
    `;

    if (candidates.length === 0) {
        html += `<h3 style="color:#ef4444; margin-top:20px;">No reachable charging cities!</h3>`;
        resultsArea.innerHTML = html;
        return;
    }

    html += `
        <div class="results" style="margin-top:24px;">
            <h3>Reachable Charging Bays</h3>
    `;

    const colors = ['#10b981', '#3b82f6', '#f59e0b']; 
    const limit = Math.min(3, candidates.length);

    for(let i=0; i<limit; i++) {
        let opt = candidates[i];
        let color = colors[i] || colors[0];
        let destNode = nodes.find(n => n.id === opt.id);
        
        // Reconstruct path
        let pathNodes = [];
        for(let v = destNode.id; v !== -1; v = parent[v]) {
            pathNodes.push(nodes.find(n => n.id === v));
        }
        pathNodes.reverse();

        const destHtml = `<div class="station-marker pulse" style="background:${color}; border-color:#fff; width:16px; height:16px;"></div>`;
        const destIcon = L.divIcon({ html: destHtml, className: 'custom-div-icon', iconSize: [16, 16] });
        let m = L.marker([destNode.lat, destNode.lon], { icon: destIcon }).addTo(map).bindPopup(`<b>${destNode.name}</b>`);
        currentLayers.push(m);

        const latlngs = pathNodes.map(p => [p.lat, p.lon]);
        let line = L.polyline(latlngs, { color: color, weight: 6, opacity: 0.8, lineJoin: 'round' }).addTo(map);
        currentLayers.push(line);

        let stationsList = cityStations[destNode.id] || [];
        
        let remBattery = maxBattery - opt.dist;
        let percentLeft = Math.round((remBattery * 100) / 400);

        html += `
            <div class="option-card" style="border-left-color: ${color}">
                <div class="opt-header">
                    <h4>Option ${i + 1}: ${destNode.name}</h4>
                    <span style="font-size:18px;">🔋</span>
                </div>
                <div style="margin-top:8px;">
                    <span class="dist-chip">${opt.dist} km distance</span>
                    <span class="dist-chip" style="margin-left:8px;">Arrive with ${percentLeft}%</span>
                </div>
            </div>
        `;
    }

    html += `</div>`;
    resultsArea.innerHTML = html;

    const srcHtml = `<div class="station-marker pulse" style="background:#ef4444; border-color:#fff; width:18px; height:18px;"></div>`;
    const srcIcon = L.divIcon({ html: srcHtml, className: 'custom-div-icon', iconSize: [18, 18] });
    let sm = L.marker([srcNode.lat, srcNode.lon], { icon: srcIcon, zIndexOffset: 1000 }).addTo(map).bindPopup(`<b>Your Location</b><br>${srcNode.name}`).openPopup();
    currentLayers.push(sm);
}
