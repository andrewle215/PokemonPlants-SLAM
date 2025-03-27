window.onload = () => {
    const scene = document.querySelector('a-scene');
    const userLocation = document.getElementById('user-location');
    const plantList = document.getElementById('plant-list');

    let smoothedLat = 0;
    let smoothedLon = 0;
    let prevLat = 0;
    let prevLon = 0;
    let prevHeading = 0;

    function handleSmoothPosition(position) {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        smoothedLat = smoothedLat * 0.9 + userLat * 0.1;
        smoothedLon = smoothedLon * 0.9 + userLon * 0.1;

        const heading = calculateHeading(prevLat, prevLon, smoothedLat, smoothedLon);
        prevLat = smoothedLat;
        prevLon = smoothedLon;

        updateARMarkers(smoothedLat, smoothedLon, heading);
    }

    function calculateHeading(lat1, lon1, lat2, lon2) {
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        let bearing = Math.atan2(y, x);
        bearing = (bearing * 180) / Math.PI;

        return (bearing + 360) % 360;
    }

    function updateARMarkers(lat, lon, heading) {
        const userDot = document.getElementById('user-dot');
        userDot.setAttribute('gps-entity-place', `latitude: ${lat}; longitude: ${lon};`);
        userDot.setAttribute('rotation', `0 ${heading} 0`);

        fetch('ABG_Database_101124wSID_cleaned_112824_wHornbake.csv')
            .then(response => response.text())
            .then(csvText => {
                let places = parseCSV(csvText);

                places = places
                    .map(place => ({
                        ...place,
                        distance: getDistance(lat, lon, place.lat, place.lon)
                    }))
                    .filter(place => place.distance <= 10)
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 10);

                console.log("Nearest Plants:", places);

                // Remove existing markers
                scene.querySelectorAll('.plant-marker').forEach(marker => marker.parentNode.removeChild(marker));

                // Add new markers
                places.forEach(place => {
                    const placeMarker = document.createElement('a-entity');
                    placeMarker.setAttribute('geometry', 'primitive: sphere; radius: 0.1');
                    placeMarker.setAttribute('material', 'color: blue');
                    placeMarker.setAttribute('gps-entity-place', `latitude: ${place.lat}; longitude: ${place.lon};`);
                    placeMarker.setAttribute('rotation', `0 ${heading} 0`);
                    placeMarker.classList.add('plant-marker');

                    placeMarker.addEventListener('click', () => {
                        alert(`Plant Details:
                            s_id: ${place.s_id}
                            cname1: ${place.cname1 || "N/A"}
                            cname2: ${place.cname2 || "N/A"}
                            cname3: ${place.cname3 || "N/A"}
                            Genus: ${place.genus || "N/A"}
                            Species: ${place.species || "N/A"}
                            Cultivar: ${place.cultivar || "N/A"}`);
                    });

                    scene.appendChild(placeMarker);

                    const listItem = document.createElement('li');
                    listItem.innerText = `${place.cname1 || "N/A"} ${place.cname2 || "N/A"} ${place.cname3 || "N/A"} Genus: ${place.genus || "N/A"} Species: ${place.species || "N/A"} Cultivar: ${place.cultivar || "N/A"} (${place.distance.toFixed(2)}m) ${place.lat},${place.lon}`;
                    plantList.appendChild(listItem);
                });
            })
            .catch(err => console.error('Error loading CSV:', err));
    }

    function parseCSV(csvText) {
        const rows = csvText.split('\n').slice(1);

        return rows
            .map(row => {
                const columns = row.split(',');

                while (columns.length < 9) {
                    columns.push("");
                }

                return {
                    s_id: (columns[0] || "").trim(),
                    cname1: (columns[1] || "").trim(),
                    cname2: (columns[2] || "").trim(),
                    cname3: (columns[3] || "").trim(),
                    genus: (columns[4] || "").trim(),
                    species: (columns[5] || "").trim(),
                    cultivar: (columns[6] || "").trim(),
                    lon: parseFloat(columns[7]) || 0,
                    lat: parseFloat(columns[8]) || 0
                };
            })
            .filter(place => place.s_id && place.lat !== 0 && place.lon !== 0);
    }

    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const watchId = navigator.geolocation.watchPosition(
        handleSmoothPosition,
        (error) => {
            console.error("Geolocation error:", error.message);
            userLocation.textContent = "Location unavailable";
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 27000
        }
    );
};
