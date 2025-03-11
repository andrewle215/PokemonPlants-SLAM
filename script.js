window.onload = () => {
    const scene = document.querySelector('a-scene');

    // Get current user location
    navigator.geolocation.getCurrentPosition(
        function (position) {
            // Load locations from CSV
            fetch('Test.csv')
                .then(response => response.text())
                .then(csvText => {
                    const places = parseCSV(csvText);
                    places.forEach(place => {
                        const latitude = 38.9825090;
                        const longitude =-76.9441840;

                        // Add place name
                        const placeText = document.createElement('a-link');
                        placeText.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);
                        placeText.setAttribute('title', place.name);
                        placeText.setAttribute('scale', '15 15 15');

                        placeText.addEventListener('loaded', () => {
                            window.dispatchEvent(new CustomEvent('gps-entity-place-loaded'));
                        });

                        scene.appendChild(placeText);
                    });
                })
                .catch(err => console.error('Error loading CSV', err));
        },
        err => console.error('Error in retrieving position', err),
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 27000,
        }
    );
};

function parseCSV(csvText) {
    const rows = csvText.split('\n').slice(1); // Skip header row
    return rows.map(row => {
        const [name, lat, lon] = row.split(',');
        return { name: name.trim(), lat: parseFloat(lat), lon: parseFloat(lon) };
    }).filter(place => !isNaN(place.lat) && !isNaN(place.lon));
}
