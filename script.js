window.onload = () => {
    let userMarkerAdded = false;
    const scene = document.querySelector("a-scene");
    const userLocation = document.getElementById('user-location');
    const camera = document.querySelector("[gps-new-camera]");
    const plantList = document.getElementById('plant-list');

    if (!navigator.geolocation) {
        userLocation.textContent = "Geolocation is not supported by your browser.";
        return;
    }

    camera.addEventListener("gps-camera-update-position", (e) => {
        if (!e.detail.position) {
            console.warn("No position data received.");
            return;
        }
        
        const userLat = e.detail.position.latitude;
        const userLon = e.detail.position.longitude;
        console.log(`User Location: ${userLat}, ${userLon}`);
        userLocation.textContent = `Lat: ${userLat}, Lon: ${userLon}`;

        if (!userMarkerAdded) {
            const userMarker = document.createElement("a-box");
            userMarker.setAttribute("scale", "1 1 1");
            userMarker.setAttribute("material", "color: red");
            userMarker.setAttribute("gps-new-entity-place", `latitude: ${userLat}; longitude: ${userLon}`);
            scene.appendChild(userMarker);
            userMarkerAdded = true;
        }

        fetch("ABG_Database_101124wSID_cleaned_112824_wHornbake.csv")
            .then(response => {
                if (!response.ok) throw new Error("Failed to load CSV file.");
                return response.text();
            })
            .then(csvText => {
                console.log("CSV Loaded Successfully!");
                let plants = parseCSV(csvText);
                
                plants = plants
                    .map(plant => ({
                        ...plant,
                        distance: getDistance(userLat, userLon, plant.lat, plant.lon)
                    }))
                    .filter(plant => plant.distance <= 10)
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 10);

                console.log("Nearest Plants:", plants);

                plantList.innerHTML = "";
                plants.forEach(plant => {
                    const plantMarker = document.createElement("a-box");
                    plantMarker.setAttribute("scale", "1 1 1");
                    plantMarker.setAttribute("material", "color: blue");
                    plantMarker.setAttribute("gps-new-entity-place", `latitude: ${plant.lat}; longitude: ${plant.lon}`);
                    scene.appendChild(plantMarker);
                    
                    const listItem = document.createElement('li');
                    listItem.innerText = `${plant.cname1 || "N/A"} ${plant.cname2 || ""} ${plant.cname3 || ""} - Genus: ${plant.genus || "N/A"}, Species: ${plant.species || "N/A"}, Cultivar: ${plant.cultivar || "N/A"} (${plant.distance.toFixed(2)}m)`;
                    plantList.appendChild(listItem);
                });
            })
            .catch(err => console.error("Error loading CSV:", err));
    });
};
// Function to parse CSV text into an array of plant objects
function parseCSV(csvText) {
    const rows = csvText.split("\n").slice(1); // Skip header row

    return rows
        .map(row => {
            const columns = row.split(",");

            // Handle missing columns by concatenating empty strings
            while (columns.length < 9) {
                columns.push(""); // Add empty strings for missing cells
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
        .filter(plant => plant.s_id && plant.lat !== 0 && plant.lon !== 0); // Remove invalid entries
}

// Function to calculate distance between two GPS points (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}