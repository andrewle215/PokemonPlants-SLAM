window.onload = () => {
  let userMarker = null;

  const scene = document.querySelector('a-scene');
  const userLocation = document.getElementById('user-location');
  const camera = document.querySelector('[gps-new-camera]');
  const plantList = document.getElementById('plant-list');
  const headingDisplay = document.getElementById('heading');
  const selectedPlantInfo = document.getElementById('selected-plant-info');

  let blueMarkers = [];

  if (!navigator.geolocation) {
    userLocation.textContent = "Geolocation is not supported by your browser.";
    return;
  }

  // Heading tracker
  scene.addEventListener('loaded', () => {
    scene.addEventListener('frame', () => {
      const rotation = camera.getAttribute('rotation');
      const heading = rotation.y;
      headingDisplay.textContent = `Heading: ${Math.round(heading)}°`;
    });
  });

  // Live GPS updates
  camera.addEventListener('gps-camera-update-position', (e) => {
    if (!e.detail.position) return;

    const userLat = e.detail.position.latitude;
    const userLon = e.detail.position.longitude;
    console.log(`📍 New location: ${userLat}, ${userLon}`);
    userLocation.textContent = `Lat: ${userLat}, Lon: ${userLon}`;

    // 🔴 Update or create red user marker
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

    // 🔁 Re-filter and re-add blue markers
    fetch("./ABG.csv")
      .then(response => {
        if (!response.ok) throw new Error("Failed to load CSV");
        return response.text();
      })
      .then(csvText => {
        let plants = parseCSV(csvText);

        plants = plants
          .map(plant => ({
            ...plant,
            distance: getDistance(userLat, userLon, plant.lat, plant.lon)
          }))
          .filter(plant => plant.distance <= 3)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);

        console.log("🔵 Closest plants:", plants);
        plantList.innerHTML = "";

        plants.forEach(plant => {
          const plantMarker = document.createElement("a-box");
          plantMarker.setAttribute("scale", "1 1 1");
          plantMarker.setAttribute("material", "color: blue");
          plantMarker.setAttribute("gps-new-entity-place", `latitude: ${plant.lat}; longitude: ${plant.lon}`);
          plantMarker.setAttribute("position", "0 1 0");

          plantMarker.setAttribute("class", "clickable");
          plantMarker.setAttribute("event-set__enter", "_event: mouseenter; material.color: yellow");
          plantMarker.setAttribute("event-set__leave", "_event: mouseleave; material.color: blue");

          plantMarker.addEventListener("click", () => {
            const info = `
              🌱 <strong>${plant.cname1 || "Unknown"}</strong><br>
              Genus: ${plant.genus || "N/A"}<br>
              Species: ${plant.species || "N/A"}<br>
              Distance: ${plant.distance.toFixed(1)} meters
            `;
            selectedPlantInfo.innerHTML = info;
          });

          scene.appendChild(plantMarker);
          blueMarkers.push(plantMarker);

          const listItem = document.createElement("li");
          listItem.innerText = `${plant.cname1 || "N/A"} ${plant.cname2 || ""} ${plant.cname3 || ""} - Genus: ${plant.genus || "N/A"}, Species: ${plant.species || "N/A"}, Cultivar: ${plant.cultivar || "N/A"} (${plant.distance.toFixed(2)}m)`;
          plantList.appendChild(listItem);
        });
      })
      .catch(err => console.error("Error loading CSV:", err));
  });
};

// CSV parsing
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
    .filter(plant => plant.s_id && plant.lat !== 0 && plant.lon !== 0);
}

// Distance formula
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
