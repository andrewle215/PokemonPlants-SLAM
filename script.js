window.onload = () => {
    const scene = document.querySelector('a-scene');

    // Get current user location
    navigator.geolocation.getCurrentPosition(
        function (position) {
            // Load locations from CSV
            fetch('ABG_Database_101124wSID_cleaned_112824_wHornbake.csv')
                .then(response => response.text())
                .then(csvText => {
                    const places = parseCSV(csvText);
                    places.forEach(place => {
                        const latitude = place.lat;
                        const longitude = place.lon;

                        // Add place name
                        const placeText = document.createElement('a-link');
                        placeText.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);
                        placeText.setAttribute('title', place.name);
                        placeText.setAttribute('scale', '0.5 0.5 0.5');

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
        const [s_id, cname1, cname2, cname3, genus, species, cultivar, x, y, plantsOnHornbake] = row.split(',');

        // Combine names and format output
        const combinedName = [cname1, cname2, cname3].filter(name => name.trim()).join(' ');
        const displayName = `${combinedName} (${genus})`;

        return { name: displayName, lat: parseFloat(y), lon: parseFloat(x) }; // Assuming x=longitude, y=latitude
    }).filter(place => !isNaN(place.lat) && !isNaN(place.lon));
}
