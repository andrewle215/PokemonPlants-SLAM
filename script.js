window.onload = () => {
  let userLat = null;
  let userLon = null;
  let userMarker = null;
  let blueMarkers = [];

  const scene = document.querySelector('a-scene');
  const camera = document.querySelector('[gps-new-camera]');
  const userLocation = document.getElementById('user-location');
  const headingDisplay = document.getElementById('heading');
  const plantList = document.getElementById('plant-list');
  const selectedPlantInfo = document.getElementById('selected-plant-info');

  // Heading display
  scene.addEventListener('loaded', () => {
    scene.addEventListener('frame', () => {
      const rotation = camera.getAttribute('rotation');
      headingDisplay.textContent = `Heading: ${Math.round(rotation.y)}°`;
    });
  });

  // Watch GPS position continuously
  navigator.geolocation.watchPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
    },
    (err) => {
      console.error("GPS Error:", err);
      userLocation.textContent = "GPS error";
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );

  // Run this every 3 seconds
  setInterval(() => {
    if (!userLat || !userLon) return;

    userLocation.textContent = `Lat: ${userLat}, Lon: ${userLon}`;

    // 🔴 Red user marker
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

    // 🔵 Load + filter nearest plants
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

        // Update UI list
        plantList.innerHTML = "";
        plants.forEach(plant => {
          const marker = document.createElement("a-box");
          marker.setAttribute("scale", "1 1 1");
          marker.setAttribute("material", "color: blue");
          marker.setAttribute("gps-new-entity-place", `latitude: ${plant.lat}; longitude: ${plant.lon}`);
          marker.setAttribute("position", "0 1 0");
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
  }, 3000); // every 3 seconds
};

// --- Helpers ---

function parseCSV(csvText) {
  const rows = csvText.split("\n").slice(1);
  return rows
    .map(row => {
      const columns = row.split(",");
      while (columns.length < 9) columns.push("");
      return {
        s_id: columns[0]?.trim(),
        cname1: columns[1]?.trim() || "Unknown",
        cname2: columns[2]?.trim() || "",
        cname3: columns[3]?.trim() || "",
        genus: columns[4]?.trim() || "Unknown",
        species: columns[5]?.trim() || "",
        cultivar: columns[6]?.trim() || "",
        lon: parseFloat(columns[7]) || 0,
        lat: parseFloat(columns[8]) || 0
      };
    })
    .filter(p => p.s_id && p.lat !== 0 && p.lon !== 0);
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
