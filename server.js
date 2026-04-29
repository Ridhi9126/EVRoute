const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let nodes = fs.readFileSync(path.join(__dirname, "data/nodes.txt"), "utf-8").split("\n");
let stationsData = fs.readFileSync(path.join(__dirname, "data/stations.txt"), "utf-8").split("\n");

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

const axios = require("axios");

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
        if (!cityData) return res.json({ error: "City not found" });
        lat = cityData.lat;
        lon = cityData.lon;
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
                distance: st.AddressInfo.Distance ? st.AddressInfo.Distance.toFixed(1) : ((i + 1) * 5)
            };
        });

        res.json({ lat, lon, stations });
    } catch (error) {
        console.error("OCM API Error:", error.message);
        
        // Return the exact error to the frontend so it doesn't silently fail
        res.json({ error: "Failed to fetch from Open Charge Map: " + error.message });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));