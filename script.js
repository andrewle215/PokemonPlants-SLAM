window.onload = () => {
  let userMarker = null;
  let blueMarkers = [];

  const scene = document.querySelector('a-scene');
  const camera = document.querySelector('[gps-new-camera]');
  const userLocation = document.getElementById('user-location');
  const headingDisplay = document.getElementById('heading');
  const plantList = document.getElementById('plant-list');
  const selectedPlantInfo = document.getElementById('selected-plant-info');
  const debugInfo = document.getElementById('debug-info');

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const offset = isIOS ? 0 : 0;
  debugInfo.textContent = `Offset applied: ${offset}° (${isIOS ? 'iOS' : 'Default'})`;

  // 🎯 Heading tracker
  scene.addEventListener('loaded', () => {
    scene.addEventListener('frame', () => {
      const rotation = camera.getAttribute('rotation');
      headingDisplay.textContent = `Heading: ${Math.round(rotation.y)}°`;
    });
  });

  // 📍 Main update logic: only when user moves ~5m
  camera.addEventListener("gps-camera-update-position", (e) => {
    const userLat = e.detail.position.latitude;
    const userLon = e.detail.position.longitude;

    userLocation.textContent = `Lat: ${userLat}, Lon: ${userLon}`;

    // 🔴 Red marker (user)
    if (!userMarker) {
      userMarker = document.createElement("a-box");
      userMarker.setAttribute("scale", "1 1 1");
      userMarker.setAttribute("material", "color: red");
      scene.appendChild(userMarker);
    }
    userMarker.setAttribute("gps-new-entity-place", `latitude: ${userLat}; longitude: ${userLon}`);

    // 🔁 Remove old blue markers
    blueMarkers.forEach(marker => scene.removeChild(marker));
    blueMarkers = [];

    // 📦 Load plant data
    fetch("./ABG.csv")
      .then(response => response.text())
      .then(csvText => {
        const plants = parseCSV(csvText)
          .map(p => ({
            ...p,
            distance: getDistance(userLat, userLon, p.lat, p.lon)
          }))
          .filter(p => p.distance <= 10)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);

        // 🔄 Update list + scene
        plantList.innerHTML = "";

        plants.forEach(plant => {
          const marker = document.createElement("a-box");
          const heightScale = getAdjustedHeight(plant.height);

          marker.setAttribute("scale", `1 ${heightScale} 1`);
          marker.setAttribute("position", "0 0 0");
          marker.setAttribute("material", "color: blue");
          marker.setAttribute("gps-new-entity-place", `latitude: ${plant.lat}; longitude: ${plant.lon}`);
          marker.setAttribute("class", "clickable");

          marker.addEventListener("click", () => {
            selectedPlantInfo.innerHTML = `
              🌱 <strong>${plant.cname1 || "Unknown"}</strong><br>
              Genus: ${plant.genus || "N/A"}<br>
              Species: ${plant.species || "N/A"}<br>
              Distance: ${plant.distance.toFixed(1)} meters
            `;
          });

          scene.appendChild(marker);
          blueMarkers.push(marker);

          const listItem = document.createElement("li");
          listItem.innerText = `${plant.cname1 || "N/A"} - Genus: ${plant.genus}, Species: ${plant.species} (${plant.distance.toFixed(1)}m)`;
          plantList.appendChild(listItem);
        });
      })
      .catch(err => console.error("CSV load error:", err));
  });
};

// --- Helpers ---
function parseCSV(csvText) {
  const rows = csvText.split("\n").slice(1);
  return rows.map(row => {
    const columns = row.split(",");
    while (columns.length < 10) columns.push("");
    return {
      s_id: columns[0]?.trim(),
      cname1: columns[1]?.trim() || "Unknown",
      cname2: columns[2]?.trim() || "",
      cname3: columns[3]?.trim() || "",
      genus: columns[4]?.trim() || "Unknown",
      species: columns[5]?.trim() || "",
      cultivar: columns[6]?.trim() || "",
      lon: parseFloat(columns[7]) || 0,
      lat: parseFloat(columns[8]) || 0,
      height: parseFloat(columns[9]) || 1
    };
  }).filter(p => p.s_id && p.lat !== 0 && p.lon !== 0);
}

function getAdjustedHeight(h) {
  const mapping = {
    0.5: 0,
    1: 0.1,
    1.5: 0.2,
    2: 0.4,
    2.5: 0.6,
    3: 0.9,
    4.5: 1.3
  };
  const rounded = Math.round(h * 10) / 10;
  return mapping[rounded] || 0.4;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
