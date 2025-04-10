window.onload = () => {
  // Set up the camera offset
  const camera = document.querySelector('[gps-new-camera]');
  const offset = parseFloat(localStorage.getItem('calibrationOffset') || '0');
  camera.setAttribute('gps-new-camera', {
    gpsMinDistance: 3,
    rotate: true,
    rotationOffset: offset,
  });

  // Force a layout resize after a short delay
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    console.log('🔁 Forced layout resize');
  }, 500);

  let userMarker = null;
  // Use an object keyed by unique identifier for plant markers
  let plantMarkers = {};

  const scene = document.querySelector('a-scene');
  const userLocation = document.getElementById('user-location');
  const headingDisplay = document.getElementById('heading');
  const plantList = document.getElementById('plant-list');
  const selectedPlantInfo = document.getElementById('selected-plant-info');
  const debugInfo = document.getElementById('debug-info');

  const calibrationOffset = parseFloat(localStorage.getItem('calibrationOffset') || '0');
  debugInfo.textContent = `Offset loaded: ${calibrationOffset}°`;

  // Throttle marker updates to avoid jitter and excessive DOM operations.
  let lastMarkerUpdate = 0;
  const updateInterval = 3000; // update markers every 3 seconds

  // Track heading continuously
  scene.addEventListener('loaded', () => {
    scene.addEventListener('frame', () => {
      const rotation = camera.getAttribute('rotation');
      headingDisplay.textContent = `Heading: ${Math.round(rotation.y)}°, Pitch: ${Math.round(rotation.x)}°`;
    });
  });

  camera.addEventListener('gps-camera-update-position', (e) => {
    const userLat = e.detail.position.latitude;
    const userLon = e.detail.position.longitude;
    userLocation.textContent = `Lat: ${userLat}, Lon: ${userLon}`;

    // Update or create the red user marker.
    if (!userMarker) {
      userMarker = document.createElement('a-box');
      userMarker.setAttribute('scale', '1 1 1');
      userMarker.setAttribute('material', 'color: red');
      scene.appendChild(userMarker);
    }
    userMarker.setAttribute('gps-new-entity-place', `latitude: ${userLat}; longitude: ${userLon}`);

    // Throttle the update of plant markers.
    const now = Date.now();
    if (now - lastMarkerUpdate > updateInterval) {
      lastMarkerUpdate = now;
      updatePlantMarkers(userLat, userLon);
    }
  });

  function updatePlantMarkers(userLat, userLon) {
    fetch('./ABG.csv')
      .then((response) => response.text())
      .then((csvText) => {
        // Parse the CSV and compute distances.
        const plants = parseCSV(csvText)
          .map((p) => ({
            ...p,
            distance: getDistance(userLat, userLon, p.lat, p.lon),
          }))
          .filter((p) => p.distance <= 10) // only show plants within 10 meters
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);

        // Update the plant list (debug/auxiliary info)
        plantList.innerHTML = '';
        plants.forEach((plant) => {
          const listItem = document.createElement('li');
          listItem.innerText = `Height ${plant.height}, ${plant.cname1 || 'N/A'} - Genus: ${plant.genus}, Species: ${plant.species} (${plant.distance.toFixed(
            1
          )}m)`;
          plantList.appendChild(listItem);
        });

        // Create or update markers for each plant.
        plants.forEach((plant) => {
          // Calculate adjusted height for correct vertical positioning
          const heightScale = getAdjustedHeight(plant.height);
          const yPos = heightScale / 2;

          // Update marker if it already exists; otherwise, create it.
          if (plantMarkers[plant.s_id]) {
            plantMarkers[plant.s_id].setAttribute('gps-new-entity-place', `latitude: ${plant.lat}; longitude: ${plant.lon}`);
          } else {
            const marker = document.createElement('a-entity');
            marker.setAttribute('gltf-model', getIconByHeight(plant.height));
            marker.setAttribute('scale', '2 2 2');
            marker.setAttribute('position', `0 ${yPos} 0`);
            marker.setAttribute('look-at', '[gps-new-camera]');
            marker.setAttribute('gps-new-entity-place', `latitude: ${plant.lat}; longitude: ${plant.lon}`);
            marker.setAttribute('class', 'clickable');

            marker.addEventListener('click', () => {
              selectedPlantInfo.innerHTML = `
                🌱 <strong>${plant.cname1 || 'Unknown'}</strong><br>
                Genus: ${plant.genus || 'N/A'}<br>
                Species: ${plant.species || 'N/A'}<br>
                Distance: ${plant.distance.toFixed(1)} meters<br>
                Height: ${plant.height || 'N/A'}
              `;
            });

            scene.appendChild(marker);
            plantMarkers[plant.s_id] = marker;
          }
        });

        // Remove markers that are no longer in the dataset.
        for (const id in plantMarkers) {
          if (!plants.find((plant) => plant.s_id === id)) {
            scene.removeChild(plantMarkers[id]);
            delete plantMarkers[id];
          }
        }
      })
      .catch((err) => console.error('CSV load error:', err));
  }

  // --- Helpers ---

  function parseCSV(csvText) {
    const rows = csvText.split('\n').slice(1);
    return rows
      .map((row) => {
        const columns = row.split(',');
        // Ensure we have enough columns
        while (columns.length < 10) columns.push('');
        return {
          s_id: columns[0]?.trim(),
          cname1: columns[1]?.trim() || 'Unknown',
          cname2: columns[2]?.trim() || '',
          cname3: columns[3]?.trim() || '',
          genus: columns[4]?.trim() || 'Unknown',
          species: columns[5]?.trim() || '',
          cultivar: columns[6]?.trim() || '',
          lon: parseFloat(columns[7]) || 0,
          lat: parseFloat(columns[8]) || 0,
          height: parseFloat(columns[9]) || 1,
        };
      })
      .filter((p) => p.s_id && p.lat !== 0 && p.lon !== 0);
  }

  function getAdjustedHeight(h) {
    const mapping = {
      0.5: 0.2,
      1: 0.3,
      1.5: 0.45,
      2: 0.6,
      2.5: 0.8,
      3: 1.1,
      4.5: 1.5,
    };
    const rounded = Math.round(h * 10) / 10;
    return mapping[rounded] || 0.4;
  }

  // Use the Haversine formula for distance between two points.
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // Return image URL based on common plant names
  function getIconByHeight(h) {
  // Instead of returning an image URL, return a model URL or id
  if (h <= 1) {
    // For small plants, you might choose a simple shrub model
    return './models/Shrub.glb';
  } else if (h > 1 && h <= 1.5) {
    return './models/Bush.glb';
  } else if (h > 1.5 && h < 3) {
    return './models/Grass.glb';
  } else if (h >= 3 && h <= 4.5) {
    return './models/Tree.glb';
  } else {
    return './models/tree_large_model.gltf';
  }
}

};
