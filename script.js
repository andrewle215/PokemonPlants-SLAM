window.onload = () => {
    const scene = document.querySelector('a-scene');
    const userLocation = document.getElementById('user-location');
    const plantList = document.getElementById('plant-list');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            userLocation.textContent = `Lat: ${userLat.toFixed(6)}, Lon: ${userLon.toFixed(6)}`;
            console.log("User Location:", userLat, userLon);

            fetch('ABG_Database_101124wSID_cleaned_112824_wHornbake.csv')
                .then(response => response.text())
                .then(csvText => {
                    console.log("CSV Loaded Successfully!");
                    const places = parseCSV(csvText);
                    console.log("Parsed Places:", places);

                    places.forEach(place => {
                        // Add AR markers
                        const placeMarker = document.createElement('a-sphere');
                        placeMarker.setAttribute('gps-entity-place', `latitude: ${place.lat}; longitude: ${place.lon};`);
                        placeMarker.setAttribute('radius', '2');
                        placeMarker.setAttribute('color', 'red');

                        const placeLabel = document.createElement('a-text');
                        placeLabel.setAttribute('gps-entity-place', `latitude: ${place.lat}; longitude: ${place.lon};`);
                        placeLabel.setAttribute('value', place.name);
                        placeLabel.setAttribute('scale', '10 10 10');
                        placeLabel.setAttribute('align', 'center');

                        scene.appendChild(placeMarker);
                        scene.appendChild(placeLabel);

                        // Add to list in the UI
                        const listItem = document.createElement('li');
                        listItem.innerText = place.name;
                        plantList.appendChild(listItem);
                    });
                })
                .catch(err => console.error('Error loading CSV:', err));
        },
        (error) => {
            console.error("Geolocation error:", error.message);
            userLocation.textContent = "Location unavailable";
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 27000 }
    );
};

function parseCSV(csvText) {
    const rows = csvText.split('\n').slice(1); // Skip header row

    return rows
        .map(row => {
            const columns = row.split(',');

            // Ensure row has enough columns
            if (columns.length < 9) {
                console.warn("Skipping malformed row:", row);
                return null;
            }

            // Extract names and remove empty values
            const names = [columns[1], columns[2], columns[3]]
                .map(name => name ? name.trim() : "")
                .filter(name => name.length > 0)
                .join(" / "); // Join non-empty names with " / "

            const lat = parseFloat(columns[8]); // y -> latitude
            const lon = parseFloat(columns[7]); // x -> longitude

            // Validate extracted data
            if (!names || isNaN(lat) || isNaN(lon)) {
                console.warn("Invalid data in row:", row);
                return null;
            }

            return { name: names, lat, lon };
        })
        .filter(place => place !== null); // Remove invalid entries
}

