# EV Route – Smart EV Charging Assistant

EV Route is a full-stack web application designed to help electric vehicle drivers find the nearest reachable charging stations based on their current location and battery level. 

Originally built as a C++ algorithmic project, **EV Route** has now evolved into a dynamic, map-based web application with live API integrations, voice recognition, and a community-driven alert system!

Instead of planning an entire cross-country journey, this system focuses on the most critical real-world problem:
*“I’m low on battery — where should I go right now?”*

---

## 🌟 Key Features

### 🗺️ Interactive Map & Visualization (Leaflet.js)
- Beautiful, real-time map interface powered by OpenStreetMap and Leaflet.js.
- Automatically zooms and centers on your searched location.
- Charging stations are plotted as interactive markers.

### 📍 Smart Geolocation & Fallbacks
- **Use My Location:** Click the GPS icon (📍) to instantly fetch your exact browser coordinates.
- **Dual Database System:** The app first searches the live **Open Charge Map API** for real-world stations. If none are found within 50km, it smartly falls back to your **local dataset** (`data/stations.txt`), generating offset coordinates so local stations still appear on the map!

### 🧭 Routing & Navigation
- **View Route:** Calculates and draws the optimal driving path directly on the map using the **Open Source Routing Machine (OSRM)** API.
- **Turn-by-Turn Navigation:** Click the "Navigate 🧭" button to instantly transfer the route to **Google Maps** (opens natively on mobile devices) for voice-guided navigation.

### 🎙️ Voice Search
- Click the microphone icon (🎤) to speak your desired city or location using the **Web Speech API**, making it easy to search hands-free.

### ⚠️ Community Alerts System
- A built-in, persistent community feature!
- Users can click **Report Issue** on any station to report broken chargers, queues, or availability.
- Alerts are saved to `data/alerts.json` and immediately synced to the UI, appearing as highlighted warning boxes for all other drivers looking at that station.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3, Leaflet.js
- **Backend:** Node.js, Express.js
- **External APIs:** 
  - Open Charge Map (Live Station Data)
  - Nominatim (Geocoding)
  - OSRM (Route Paths)
  - Google Maps Directions URI (Turn-by-Turn Navigation)
- **Local Data:** Fallback city nodes (`data/nodes.txt`) and custom stations (`data/stations.txt`).

---

## 🚀 How to Run the Web App

1. Ensure you have **Node.js** installed on your system.
2. Open your terminal in the `EVRoute` directory.
3. Install dependencies:
   ```bash
   npm install express axios
   ```
4. Start the server:
   ```bash
   node server.js
   ```
5. Open your browser and go to:
   ```text
   http://localhost:3000
   ```

---

## ⚙️ The Original C++ Core

This project originated as a systems and algorithms project focusing on real-world EV challenges using Dijkstra's algorithm. The original C++ files are still included in the repository for academic reference and algorithmic testing.

**To run the legacy C++ console application:**
```bash
g++ main.cpp graph.cpp dijkstra.cpp ev_logic.cpp -o evroute
./evroute
```

---
*Built focusing on real-world EV challenges.*