const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let nodes = fs.readFileSync(path.join(__dirname, "data/nodes.txt"), "utf-8").split("\n");
let stationsData = fs.readFileSync(path.join(__dirname, "data/stations.txt"), "utf-8").split("\n");

let alertsFile = path.join(__dirname, "data/alerts.json");
let communityAlerts = {};
try {
    if (fs.existsSync(alertsFile)) {
        communityAlerts = JSON.parse(fs.readFileSync(alertsFile, "utf-8"));
    }
} catch(e) {
    console.error("Error loading alerts:", e);
}

// 🔍 get city from dataset
function getCity(cityName) {
    for (let line of nodes) {
        if (!line.trim()) continue;

        let parts = line.split(" ");
        if (parts[1].toLowerCase() === cityName.toLowerCase()) {
            return {
                index: parseInt(parts[0]),
                lat: parseFloat(parts[2]),
                lon: parseFloat(parts[3])
            };
        }
    }
    return null;
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function getLocalStations(nodeIndex) {
    for (let line of stationsData) {
        if (!line.trim()) continue;
        let parts = line.split(" ");
        if (parseInt(parts[0]) === nodeIndex) {
            return parts.slice(1).map(p => p.trim()).filter(p => p);
        }
    }
    return [];
}

const axios = require("axios");

app.post("/addAlert", (req, res) => {
    const { stationName, issue } = req.body;
    if (!stationName || !issue) return res.json({ error: "Missing data" });

    if (!communityAlerts[stationName]) communityAlerts[stationName] = [];
    communityAlerts[stationName].push({ message: issue, time: new Date().toISOString() });
    
    fs.writeFileSync(alertsFile, JSON.stringify(communityAlerts, null, 2));
    res.json({ success: true });
});

app.post("/findStations", async (req, res) => {
    const { city, battery, userLat, userLon } = req.body;

    let lat, lon;

    // Use exact coordinates if provided via Geolocation API
    if (userLat !== undefined && userLon !== undefined) {
        lat = parseFloat(userLat);
        lon = parseFloat(userLon);
    } else {
        // Otherwise fallback to mapping the city name
        let cityData = getCity(city);
        if (cityData) {
            lat = cityData.lat;
            lon = cityData.lon;
        } else {
            // If not found in local dataset, try to geocode the location string
            try {
                let geoRes = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                    params: { format: 'json', q: city },
                    headers: { 'User-Agent': 'EVRouteApp/1.0' }
                });
                if (geoRes.data && geoRes.data.length > 0) {
                    lat = parseFloat(geoRes.data[0].lat);
                    lon = parseFloat(geoRes.data[0].lon);
                } else {
                    return res.json({ error: "Location not found. Please try a different location name." });
                }
            } catch (err) {
                console.error("Geocoding error:", err.message);
                return res.json({ error: "Failed to geocode location." });
            }
        }
    }

    // 🔋 CORRECT BATTERY LOGIC
    let count;
    if (battery <= 30) count = 2;
    else if (battery <= 60) count = 4;
    else count = 6;

    // Open Charge Map Integration
    const OCM_API_KEY = "a7425f87-7386-4fa8-b214-1e5f32aecca0"; // Replace with your actual Open Charge Map API Key

    try {
        let ocmRes = await axios.get(`https://api.openchargemap.io/v3/poi/`, {
            headers: { 'User-Agent': 'EVRouteApp/1.0' },
            params: {
                output: 'json',
                latitude: lat,
                longitude: lon,
                distance: 50, // 50km radius
                distanceunit: 'KM',
                maxresults: count,
                key: OCM_API_KEY
            }
        });

        let stations = ocmRes.data.map((st, i) => {
            let name = st.AddressInfo.Title || (st.OperatorInfo ? st.OperatorInfo.Title : "EV Charging Station");
            return {
                name,
                lat: st.AddressInfo.Latitude,
                lon: st.AddressInfo.Longitude,
                distance: st.AddressInfo.Distance ? st.AddressInfo.Distance.toFixed(1) : ((i + 1) * 5),
                alerts: communityAlerts[name] || []
            };
        });

        // 🟢 FALLBACK TO LOCAL DATASET IF OCM RETURNS NOTHING
        if (stations.length === 0) {
            let closestNode = null;
            let minDistance = 50; // max 50km
            
            for (let line of nodes) {
                if (!line.trim()) continue;
                let parts = line.split(" ");
                let nLat = parseFloat(parts[2]);
                let nLon = parseFloat(parts[3]);
                let dist = getDistance(lat, lon, nLat, nLon);
                
                if (dist < minDistance) {
                    minDistance = dist;
                    closestNode = { index: parseInt(parts[0]), lat: nLat, lon: nLon };
                }
            }

            if (closestNode) {
                let localNames = getLocalStations(closestNode.index);
                stations = localNames.slice(0, count).map((name, i) => {
                    let offsetLat = (Math.random() - 0.5) * 0.01;
                    let offsetLon = (Math.random() - 0.5) * 0.01;
                    let cleanName = name.replace(/_/g, " ");
                    return {
                        name: cleanName,
                        lat: closestNode.lat + offsetLat,
                        lon: closestNode.lon + offsetLon,
                        distance: (minDistance + i * 1.5).toFixed(1),
                        alerts: communityAlerts[cleanName] || []
                    };
                });
            }
        }

        res.json({ lat, lon, stations });
    } catch (error) {
        console.error("OCM API Error:", error.message);
        
        // Return the exact error to the frontend so it doesn't silently fail
        res.json({ error: "Failed to fetch from Open Charge Map: " + error.message });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));