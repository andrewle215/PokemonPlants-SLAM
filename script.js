window.onload = () => {
    const scene = document.querySelector('a-scene');
    const userLocation = document.getElementById('user-location');
    const plantList = document.getElementById('plant-list');

    // Smoothed position variables
    let smoothedLat = 0;
    let smoothedLon = 0;

    // Previous position for heading calculation
    let prevLat = 0;
    let prevLon = 0;

    // Function to handle smooth position updates
    function handleSmoothPosition(position) {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        // Smooth position update logic (e.g., simple moving average)
        smoothedLat = smoothedLat * 0.9 + userLat * 0.1;
        smoothedLon = smoothedLon * 0.9 + userLon * 0.1;

        // Calculate heading based on smoothed position
        const heading = calculateHeading(prevLat, prevLon, smoothedLat, smoothedLon);

        // Update AR markers with smoothed position and heading
        updateARMarkers(smoothedLat, smoothedLon, heading);

        // Update UI with user's current location
        userLocation.textContent = `Lat: ${smoothedLat.toFixed(6)}, Lon: ${smoothedLon.toFixed(6)}`;

        // Update previous position for next calculation
        prevLat = userLat;
        prevLon = userLon;
    }

    // Function to calculate heading (bearing) between two GPS points
    function calculateHeading(lat1, lon1, lat2, lon2) {
        // Calculate bearing using trigonometry
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        let bearing = Math.atan2(y, x);
        bearing = (bearing * 180) / Math.PI; // Convert radians to degrees

        return (bearing + 360) % 360; // Normalize to 0-360 degrees
    }

    // Function to update AR markers with smoothed position and heading
    function updateARMarkers(lat, lon, heading) {
        // Update AR markers in your scene based on smoothed position and heading
        const userDot = document.getElementById('user-dot');
        userDot.setAttribute('gps-entity-place', `latitude: ${lat}; longitude: ${lon};`);
        userDot.setAttribute('rotation', `0 ${heading} 0`);

        // Example: Clear previous plant markers (optional)
        plantList.innerHTML = "";

        // Example: Display some placeholder plants based on user's location
        const plants = generateDummyPlants(lat, lon); // Replace with actual fetch logic

        plants.forEach((plant, index) => {
            const plantMarker = document.createElement('a-entity');
            plantMarker.setAttribute('geometry', 'primitive: sphere; radius: 0.1');
            plantMarker.setAttribute('material', 'color: green');
            plantMarker.setAttribute('gps-entity-place', `latitude: ${plant.lat}; longitude: ${plant.lon};`);
            scene.appendChild(plantMarker);

            // Update plant list in UI
            const listItem = document.createElement('li');
            listItem.innerText = `${plant.name} - Distance: ${plant.distance.toFixed(2)}m`;
            plantList.appendChild(listItem);
        });
    }

    // Example function to generate dummy plants for testing
    function generateDummyPlants(userLat, userLon) {
        const dummyPlants = [
            { name: 'Plant A', lat: userLat + 0.0005, lon: userLon + 0.0005, distance: 50 },
            { name: 'Plant B', lat: userLat - 0.0005, lon: userLon - 0.0005, distance: 70 },
            { name: 'Plant C', lat: userLat + 0.001, lon: userLon - 0.001, distance: 100 }
            // Add more dummy data as needed
        ];
        return dummyPlants;
    }

    // Example usage with watchPosition
    const watchId = navigator.geolocation.watchPosition(
        handleSmoothPosition,
        (error) => {
            console.error("Geolocation error:", error.message);
            // Handle error gracefully
            userLocation.textContent = "Location unavailable";
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 27000
        }
    );
};
