window.onload = () => {
  let userMarkerAdded = false;
  let lastLat, lastLon; // Track last position for distance checks
  const UPDATE_DISTANCE = 2; // Update after moving 2 meters

  const scene = document.querySelector('a-scene');
  const userLocation = document.getElementById('user-location');
  const camera = document.querySelector('[gps-new-camera]');
  const plantList = document.getElementById('plant-list');
  const headingDisplay = document.getElementById('heading');

  if (!navigator.geolocation) {
    userLocation.textContent = "Geolocation is not supported by your browser.";
    return;
  }

  scene.addEventListener('loaded', () => {
    scene.addEventListener('frame', () => {
      const rotation = camera.getAttribute('rotation');
      const heading = rotation.y;
      headingDisplay.textContent = `Heading: ${Math.round(heading)}°`;
    });
  });

  camera.addEventListener('gps-camera-update-position', (e) => {
    if (!e.detail.position) {
      console.warn("No position data received.");
      return;
    }

    const userLat = e.detail.position.latitude;
    const userLon = e.detail.position.longitude;
    userLocation.textContent = `Lat: ${userLat}, Lon: ${userLon}`;

    // Add user marker once
    if (!userMarkerAdded) {
      const userMarker = document.createElement("a-box");
      userMarker.setAttribute("scale", "1 1 1");
      userMarker.setAttribute("material", "color: red");
      userMarker.setAttribute("gps-new-entity-place", `latitude: ${userLat}; longitude: ${userLon}`);
      scene.appendChild(userMarker);
      userMarkerAdded = true;
    }

    // Calculate distance moved since last update
    const distanceMoved = lastLat && lastLon 
      ? getDistance(lastLat, lastLon, userLat, userLon)
      : Infinity;

    // Only update plants if moved beyond threshold or first load
    if (distanceMoved >= UPDATE_DISTANCE) {
      lastLat = userLat;
      lastLon = userLon;

      fetch("./ABG.csv")
        .then(response => {
          if (!response.ok) throw new Error("Failed to load CSV file.");
          return response.text();
        })
        .then(csvText => {
          // Remove existing plant markers
          const oldMarkers = scene.querySelectorAll('.clickable');
          oldMarkers.forEach(marker => scene.removeChild(marker));

          let plants = parseCSV(csvText)
            .map(plant => ({
              ...plant,
              distance: getDistance(userLat, userLon, plant.lat, plant.lon)
            }))
            .filter(plant => plant.distance <= 10)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10);

          plantList.innerHTML = ""; // Clear plant list

          plants.forEach(plant => {
            const plantMarker = document.createElement("a-box");
            plantMarker.setAttribute("class", "clickable");
            plantMarker.setAttribute("gps-new-entity-place", `latitude: ${plant.lat}; longitude: ${plant.lon}`);
            plantMarker.setAttribute("material", "color: blue");
            plantMarker.setAttribute("scale", "1 1 1");
            // ... rest of marker setup ...

            scene.appendChild(plantMarker);
          });
        })
        .catch(err => console.error("Error loading CSV:", err));
    }
  });
};

// Keep existing parseCSV and getDistance functions unchanged

// ---------------------------------------------------------
// Helper: Parse CSV text into array of plant objects
function parseCSV(csvText) {
  // Remove the header row by slicing at index 1
  const rows = csvText.split("\n").slice(1);

  return rows
    .map(row => {
      const columns = row.split(",");

      // Handle missing columns: push empty strings so we have at least 9
      while (columns.length < 9) {
        columns.push("");
      }

      return {
        s_id: columns[0]?.trim(),
        cname1: columns[1]?.trim() || "Unknown",
        cname2: columns[2]?.trim() || "",
        cname3: columns[3]?.trim() || "",
        genus: columns[4]?.trim() || "Unknown",
        species: columns[5]?.trim() || "",
        cultivar: columns[6]?.trim() || "",
        lon: parseFloat(columns[7]) || 0, // Default to 0 if missing
        lat: parseFloat(columns[8]) || 0  // Default to 0 if missing
      };
    })
    // Filter out invalid entries (missing lat/lon or s_id)
    .filter(plant => plant.s_id && plant.lat !== 0 && plant.lon !== 0);
}

// ---------------------------------------------------------
// Helper: Calculate distance between two GPS points (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
}
