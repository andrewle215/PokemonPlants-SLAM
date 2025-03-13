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
            
            const placeMarker = document.createElement('a-sphere');
            placeMarker.setAttribute('gps-entity-place', `latitude: ${userLat}; longitude: ${userLon};`);
            placeMarker.setAttribute('radius', '2');
            placeMarker.setAttribute('color', 'red');

            const placeLabel = document.createElement('a-text');
            placeLabel.setAttribute('gps-entity-place', `latitude: ${userLat}; longitude: ${userLon};`);
            placeLabel.setAttribute('value', "Current User");
            placeLabel.setAttribute('scale', '10 10 10');
            placeLabel.setAttribute('align', 'center');

            scene.appendChild(placeMarker);
            scene.appendChild(placeLabel);

            // fetch('ABG_Database_101124wSID_cleaned_112824_wHornbake.csv')
            //     .then(response => response.text())
            //     .then(csvText => {
            //         console.log("CSV Loaded Successfully!");
                    // let places = parseCSV(csvText);

                    // Filter & sort plants by distance
                    // places = places
                    //     .map(place => ({
                    //         ...place,
                    //         distance: getDistance(userLat, userLon, place.lat, place.lon)
                    //     }))
                    //     .filter(place => place.distance <= 5) // Only within 5 meters
                    //     .sort((a, b) => a.distance - b.distance) // Sort nearest first
                    //     .slice(0, 5); // Pick the closest 5

                    // console.log("Nearest Plants:", places);

                    // places.forEach(place => {
                    //     // Add AR markers
                    //     const placeMarker = document.createElement('a-sphere');
                    //     placeMarker.setAttribute('gps-entity-place', `latitude: ${place.lat}; longitude: ${place.lon};`);
                    //     placeMarker.setAttribute('radius', '2');
                    //     placeMarker.setAttribute('color', 'red');

                    //     const placeLabel = document.createElement('a-text');
                    //     placeLabel.setAttribute('gps-entity-place', `latitude: ${place.lat}; longitude: ${place.lon};`);
                    //     placeLabel.setAttribute('value', place.name);
                    //     placeLabel.setAttribute('scale', '10 10 10');
                    //     placeLabel.setAttribute('align', 'center');

                    //     scene.appendChild(placeMarker);
                    //     scene.appendChild(placeLabel);

                    //     // Add to list in UI
                    //     const listItem = document.createElement('li');
                    //     listItem.innerText = `${place.name} (${place.distance.toFixed(2)}m) ${place.lat},${place.lon}`;
                    //     plantList.appendChild(listItem);
                    // });
                // })
                // .catch(err => console.error('Error loading CSV:', err));
        },
        (error) => {
            console.error("Geolocation error:", error.message);
            userLocation.textContent = "Location unavailable";
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 27000 }
    );
};

// Parses CSV and extracts plant data
function parseCSV(csvText) {
    const rows = csvText.split('\n').slice(1); // Skip header row

    return rows
        .map(row => {
            const columns = row.split(',');

            if (columns.length < 9) return null;

            // const names = [columns[1], columns[2], columns[3]]
            //     .map(name => name ? name.trim() : "")
            //     .filter(name => name.length > 0)
            //     .join(" / ");
            const name = columns[0]?.trim(); // s_id

            const lat = parseFloat(columns[8]); // y -> latitude
            const lon = parseFloat(columns[7]); // x -> longitude

            return name && !isNaN(lat) && !isNaN(lon) ? { name: name, lat:lat, lon:lon } : null;
        })
        .filter(place => place !== null);
}

// Haversine formula to calculate distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius of Earth in meters
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
