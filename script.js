let map = L.map('map').setView([20, 78], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let markers = [];
let routeLine;

// FIND STATIONS
window.findStations = async function (e, userLat, userLon) {
    if (e && e.preventDefault) e.preventDefault();

    let cityElem = document.getElementById("city") || document.getElementById("city-input");
    let batteryElem = document.getElementById("battery") || document.getElementById("battery-input");

    if (!cityElem || !batteryElem) return;

    let city = cityElem.value.trim();
    let battery = batteryElem.value;

    // If they manually typed 'current location' but we don't have GPS coordinates yet, trigger GPS
    if (city.toLowerCase() === "current location" && userLat === undefined && window.lastUserLat === undefined) {
        window.useMyLocation();
        return;
    }

    let payload = { city, battery };
    
    // Send exact coordinates if requested via the Geolocation API
    if (userLat !== undefined && userLon !== undefined) {
        payload.userLat = userLat;
        payload.userLon = userLon;
        window.lastUserLat = userLat;
        window.lastUserLon = userLon;
        // Optionally update UI city name
        cityElem.value = "Current Location";
    } else if (city.toLowerCase() === "current location" && window.lastUserLat !== undefined) {
        payload.userLat = window.lastUserLat;
        payload.userLon = window.lastUserLon;
    } else if (!city) {
        alert("Please enter a location or use your GPS.");
        return;
    }

    let res = await fetch("/findStations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    let data = await res.json();

    if (data.error) {
        alert(data.error);
        return;
    }

    let { lat, lon, stations } = data;

    // ✅ zoom
    map.setView([lat, lon], 12);

    // clear old
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    if (routeLine) map.removeLayer(routeLine);

    document.getElementById("results") && (document.getElementById("results").innerHTML = "");
    document.getElementById("dynamic-results") && (document.getElementById("dynamic-results").innerHTML = "");

    let resultsContainer = document.getElementById("results") || document.getElementById("dynamic-results");

    if (!stations || stations.length === 0) {
        if (resultsContainer) {
            resultsContainer.innerHTML = "<div class='station' style='color: #ef4444; font-weight: bold;'>No charging stations found within 50km of this location.</div>";
        }
        alert("No charging stations found nearby.");
        return;
    }

    stations.forEach(st => {

        let marker = L.marker([st.lat, st.lon]).addTo(map)
            .bindPopup(st.name);

        markers.push(marker);

        let div = document.createElement("div");
        div.className = "station";

        let alertsHtml = '';
        if (st.alerts && st.alerts.length > 0) {
            alertsHtml = `<div style="background: #fef2f2; color: #ef4444; font-size: 13px; padding: 5px; margin-top: 5px; border-radius: 5px; border: 1px solid #fca5a5;">
                <b>⚠️ Community Alerts:</b><br>
                ${st.alerts.map(a => `- ${a.message}`).join('<br>')}
            </div>`;
        }

        div.innerHTML = `
            <b>${st.name}</b><br>
            ${st.distance} km<br>
            ${alertsHtml}
            <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px;">
                <button class="route-btn" style="flex: 1; padding: 8px;"
                    onclick="findRoute(${lat}, ${lon}, ${st.lat}, ${st.lon})">
                    View Route
                </button>
                <button class="route-btn" style="background: #10b981; flex: 1; padding: 8px;"
                    onclick="window.open('https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${st.lat},${st.lon}', '_blank')">
                    Navigate 🧭
                </button>
                <button class="route-btn" style="background: #ef4444; flex: 1; padding: 8px; min-width: 100%;"
                    onclick="reportIssue('${st.name.replace(/'/g, "\\'")}')">
                    ⚠️ Report Issue
                </button>
            </div>
        `;

        if (resultsContainer) resultsContainer.appendChild(div);
    });
};

// Web Speech API Integration
function initSpeechRecognition(micBtnId, inputId) {
    const micBtn = document.getElementById(micBtnId);
    const input = document.getElementById(inputId);

    if (!micBtn || !input) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = "none"; // Hide if speech recognition is not supported
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let isRecording = false;

    micBtn.addEventListener("click", () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    recognition.onstart = () => {
        isRecording = true;
        micBtn.style.background = "#ef4444"; // Turn red when recording
    };

    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        // Clean up common speech artifacts like trailing periods
        input.value = speechToText.replace(/\./g, '').trim();
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        alert("Speech recognition failed: " + event.error);
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.style.background = "#3b82f6"; // Back to blue
    };
}

document.addEventListener("DOMContentLoaded", () => {
    let form = document.getElementById("route-form");
    if (form) form.addEventListener("submit", window.findStations);

    let city = document.getElementById("city");
    let battery = document.getElementById("battery");
    if (city) city.addEventListener("keypress", (e) => { if (e.key === "Enter") findStations(); });
    if (battery) battery.addEventListener("keypress", (e) => { if (e.key === "Enter") findStations(); });

    // Initialize Speech Recognition for both UI variations
    initSpeechRecognition("mic-btn", "city");
    initSpeechRecognition("mic-btn-map", "city-input");
});

// ROUTE
window.findRoute = async function (lat1, lon1, lat2, lon2) {

    if (routeLine) map.removeLayer(routeLine);

    try {
        let response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`);
        let data = await response.json();

        if (data.routes && data.routes.length > 0) {
            let coords = data.routes[0].geometry.coordinates;
            // OSRM returns [lon, lat], Leaflet expects [lat, lon]
            let latlngs = coords.map(coord => [coord[1], coord[0]]);

            routeLine = L.polyline(latlngs, {
                color: "blue",
                weight: 5
            }).addTo(map);

            map.fitBounds(routeLine.getBounds());
        } else {
            alert("Could not find a route.");
        }
    } catch (error) {
        console.error("Error fetching route from OpenStreetMap:", error);
        alert("Failed to fetch route from OpenStreetMap.");
    }
};

// REPORT ISSUE
window.reportIssue = async function(stationName) {
    let issue = prompt("Enter alert or issue for " + stationName + " (e.g. 'Charger 2 broken'):");
    if (!issue || !issue.trim()) return;
    
    try {
        let res = await fetch("/addAlert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stationName, issue: issue.trim() })
        });
        let data = await res.json();
        if (data.success) {
            alert("Thank you! Your alert has been shared with the community.");
            let cityElem = document.getElementById("city") || document.getElementById("city-input");
            if (cityElem && cityElem.value) {
                // re-submit to refresh the UI
                window.findStations();
            }
        } else {
            alert("Failed to share alert.");
        }
    } catch(e) {
        console.error(e);
        alert("Failed to share alert.");
    }
};

// GEOLOCATION
window.useMyLocation = function() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                let lat = position.coords.latitude;
                let lon = position.coords.longitude;
                // Automatically find stations near this exact location
                window.findStations(null, lat, lon);
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert("Unable to retrieve your location. Please check your browser permissions or enter a city manually.");
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
};