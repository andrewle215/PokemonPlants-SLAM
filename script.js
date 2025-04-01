window.onload = () => {
  let userMarkerAdded = false;
  let calibrationOffset = 0; // 🔧 New: store calibration offset locally

  const scene = document.querySelector('a-scene');
  const userLocation = document.getElementById('user-location');
  const camera = document.querySelector('[gps-new-camera]');
  const plantList = document.getElementById('plant-list');
  const headingDisplay = document.getElementById('heading');
  const calibrateBtn = document.getElementById('calibrate-btn');

  if (!navigator.geolocation) {
    userLocation.textContent = "Geolocation is not supported by your browser.";
    return;
  }

  // 🔧 New: Calibrate heading without modifying AR.js attributes
  calibrateBtn.addEventListener('click', () => {
    const rotation = camera.getAttribute('rotation');
    const currentHeading = rotation.y;

    // Assume user is facing north (0°), calculate offset
    calibrationOffset = (360 - currentHeading + 360) % 360;

    alert(`Calibrated! Heading offset set to ${Math.round(calibrationOffset)}°`);
    console.log("Calibration offset applied:", calibrationOffset);
  });

  // ✅ Live heading display using corrected heading
  scene.addEventListener('loaded', () => {
    scene.addEventListener('frame', () => {
      const rotation = camera.getAttribute('rotation');
      const correctedHeading = (rotation.y + calibrationOffset) % 360;

      headingDisplay.textContent = `Heading: ${Math.round(correctedHeading)}°`;

      // 🔧 Optional: you could use correctedHeading here to control marker filtering
    });
  });

  // ✅ Load plants on position update
  camera.addEventListener('gps-camera-update-position', (e) => {
    if (!e.detail.position) {
      console.warn("No position data received.");
      return;
    }

    const userLat = e.detail.position.latitude;
    const userLon = e.detail.position.longitude;
    console.log(`User Location: ${userLat}, ${userLon}`);
    userLocation.textContent = `Lat: ${userLat}, Lon: ${userLon}`;

    // 🔴 User red marker (once)
    if (!userMarkerAdded) {
      const userMarker = document.createElement("a-box");
      userMarker.setAttribute("scale", "1 1 1");
      userMarker.setAttribute("material", "color: red");
      userMarker.setAttribute("gps-new-entity-place", `latitude: ${userLat}; longitude: ${userLon}`);
      scene.appendChild(userMarker);
      userMarkerAdded = true;
    }

    // ✅ Load CSV and plant markers
    fetch("./ABG.csv") // 🔧 Make sure path matches your setup
      .then(response => {
        if (!response.ok) throw new Error("Failed to load CSV file.");
        return response.text();
      })
      .then(csvText => {
        console.log("CSV Loaded Successfully!");
        let plants = parseCSV(csvText);

        // Add distance to each plant
        plants = plants
          .map(plant => ({
            ...plant,
            distance: getDistance(userLat, userLon, plant.lat, plant.lon)
          }))
          .filter(plant => plant.distance <= 10) // Filter to nearby
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10); // Top 10 closest

        console.log("Nearest Plants:", plants);

        plantList.innerHTML = "";

        // 🔵 Create a marker for each nearby plant
        plants.forEach(plant => {
          const plantMarker = document.createElement("a-box");
          plantMarker.setAttribute("scale", "1 1 1");
          plantMarker.setAttribute("material", "color: blue");
          plantMarker.setAttribute("gps-new-entity-place", `latitude: ${plant.lat}; longitude: ${plant.lon}`);
          plantMarker.setAttribute("position", "0 1 0");
          scene.appendChild(plantMarker);

          const listItem = document.createElement("li");
          listItem.innerText = `${plant.cname1 || "N/A"} ${plant.cname2 || ""} ${
            plant.cname3 || ""
          } - Genus: ${plant.genus || "N/A"}, Species: ${plant.species || "N/A"}, Cultivar: ${
            plant.cultivar || "N/A"
          } (${plant.distance.toFixed(2)}m)`;
          plantList.appendChild(listItem);
        });
      })
      .catch(err => console.error("Error loading CSV:", err));
  });
};

// ---------------------------------------------------------
// Helper: Parse CSV text into array of plant objects
function parseCSV(csvText) {
  const rows = csvText.split("\n").slice(1); // skip header
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

// ---------------------------------------------------------
// Helper: Haversine distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
