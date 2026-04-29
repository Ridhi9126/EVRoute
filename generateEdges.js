const fs = require("fs");

// read nodes
const nodes = fs.readFileSync("data/nodes.txt", "utf-8")
    .trim()
    .split("\n")
    .map(line => {
        let [id, name, lat, lon] = line.split(" ");
        return {
            id: parseInt(id),
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        };
    });

// 📏 distance function (Haversine - realistic)
function getDistance(a, b) {
    const R = 6371; // km
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;

    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;

    const x = Math.sin(dLat / 2) ** 2 +
        Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    const d = 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return Math.round(d);
}

// 🔗 generate edges
let edges = [];

nodes.forEach(a => {
    let distances = nodes
        .filter(b => b.id !== a.id)
        .map(b => ({
            from: a.id,
            to: b.id,
            dist: getDistance(a, b)
        }))
        .sort((x, y) => x.dist - y.dist)
        .slice(0, 4); // connect to 4 nearest cities

    distances.forEach(e => {
        edges.push(`${e.from} ${e.to} ${e.dist}`);
    });
});

// ❗ remove duplicates (A-B same as B-A)
let unique = new Set();
let finalEdges = [];

edges.forEach(line => {
    let [a, b, d] = line.split(" ");
    let key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!unique.has(key)) {
        unique.add(key);
        finalEdges.push(line);
    }
});

// save file
fs.writeFileSync("data/edges.txt", finalEdges.join("\n"));

console.log("✅ Edges generated:", finalEdges.length);