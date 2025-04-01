window.onload = () => {
  let userMarkerAdded = false;

  const scene = document.querySelector('a-scene');
  const userLocation = document.getElementById('user-location');
  const camera = document.querySelector('[gps-new-camera]');
  const plantList = document.getElementById('plant-list');
  const headingDisplay = document.getElementById('heading');
  const calibrateBtn = document.getElementById('calibrate-btn');

  // 1) Check for Geolocation support
  if (!navigator.geolocation) {
    userLocation.textContent = "Geolocation is not supported by your browser.";
    return;
  }

  // 2) Calibrate heading when user clicks the button
  calibrateBtn.addEventListener('click', () => {
    // currentHeading: the phone's current rotation.y from A-Frame
    const rotation = camera.getAttribute('rotation');
    const currentHeading = rotation.y; // 0° = north, 90° = east, etc.

    // We'll assume user is facing "true north," i.e. 0 degrees
    const desiredHeading = 0;
    const offsetNeeded = desiredHeading - currentHeading;

    // Get existing gps-new-camera attributes
    // const currentGpsCam = camera.getAttribute('gps-new-camera');

    // Apply the offset
    camera.setAttribute('gps-new-camera', 'rotationOffset', offsetNeeded);


    console.log("Calibration offset applied:", offsetNeeded);
    alert(`Calibration complete. Offset set to ${offsetNeeded.toFixed(2)}°`);
  });

  // 3) Track heading in real time (to display in #heading)
  scene.addEventListener('loaded', () => {
    scene.addEventListener('frame', () => {
      const rotation = camera.getAttribute('rotation');
      const heading = rotation.y;
      headingDisplay.textContent = `Heading: ${Math.round(heading)}°`;
    });
  });

  // 4) Listen for GPS position updates
  camera.addEventListener('gps-camera-update-position', (e) => {
    if (!e.detail.position) {
      console.warn("No position data received.");
      return;
    }

    const userLat = e.detail.position.latitude;
    const userLon = e.detail.position.longitude;
    console.log(`User Location: ${userLat}, ${userLon}`);
    userLocation.textContent = `Lat: ${userLat}, Lon: ${userLon}`;

    // Add a red marker at the user's current location (once)
    if (!userMarkerAdded) {
      const userMarker = document.createElement("a-box");
      userMarker.setAttribute("scale", "1 1 1");
      userMarker.setAttribute("material", "color: red");
      userMarker.setAttribute("gps-new-entity-place", `latitude: ${userLat}; longitude: ${userLon}`);
      scene.appendChild(userMarker);
      userMarkerAdded = true;
    }

    // 5) Load CSV data, filter, and place nearest plants
    fetch("../ABG.csv")
      .then(response => {
        if (!response.ok) throw new Error("Failed to load CSV file.");
        return response.text();
      })
      .then(csvText => {
        console.log("CSV Loaded Successfully!");
        let plants = parseCSV(csvText);

        // Calculate distance from user, filter and sort
        plants = plants
          .map(plant => ({
            ...plant,
            distance: getDistance(userLat, userLon, plant.lat, plant.lon)
          }))
          .filter(plant => plant.distance <= 10) // within 10m
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10); // top 10 nearest

        console.log("Nearest Plants:", plants);

        // Clear out old items
        plantList.innerHTML = "";

        // Create markers for each plant
        plants.forEach(plant => {
          const plantMarker = document.createElement("a-box");
          plantMarker.setAttribute("scale", "1 1 1");
          plantMarker.setAttribute("material", "color: blue");
          plantMarker.setAttribute("gps-new-entity-place", `latitude: ${plant.lat}; longitude: ${plant.lon}`);
          plantMarker.setAttribute("position", "0 1 0");
          scene.appendChild(plantMarker);

          // Add to list in the info panel
          const listItem = document.createElement("li");
          listItem.innerText = `${
              plant.cname1 || "N/A"
            } ${
              plant.cname2 || ""
            } ${
              plant.cname3 || ""
            } - Genus: ${
              plant.genus || "N/A"
            }, Species: ${
              plant.species || "N/A"
            }, Cultivar: ${
              plant.cultivar || "N/A"
            } (${
              plant.distance.toFixed(2)
            }m)`;
          plantList.appendChild(listItem);
        });
      })
      .catch(err => console.error("Error loading CSV:", err));
  });
};

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
