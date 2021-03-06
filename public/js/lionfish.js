let chart;

// Icons
let LeafIcon = L.Icon.extend({
    options: {
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }
});
let userPositionIcon = new LeafIcon({ iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png' });

getUserPosition();

function getUserPosition() {
    if (navigator.geolocation) {
        return navigator.geolocation.getCurrentPosition(loadChart, showError);
    } else {
        showError();
    }
}

function loadChart(position, zoomLevel = 13) {
    // use zoom level 10 if geo is on
    let userLat = position.coords.latitude;
    let userLon = position.coords.longitude;
    chart = L.map('chart', {
        minZoom: 0,
        maxZoom: 20
    }).setView([userLat, userLon], zoomLevel);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}', {
    }).addTo(chart);
    L.marker([userLat, userLon], {icon: userPositionIcon}).addTo(chart).bindPopup('Start here').openPopup();
    getSightings().then(putSightingsOnChart);
    document.getElementById("locationMessage").setAttribute('class', 'w3-hide');
}

function showError(error) {
    console.log('Error');
    switch (error.code) {
        case error.PERMISSION_DENIED:
            console.log("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            console.log("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            console.log("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            console.log("An unknown error occurred.");
            break;
    }
    let position = { coords: { latitude: 27, longitude: -80 } };
    loadChart(position, 10); // if user doesn't have or allow geo, show default position and zoom
}

async function getSightings() {
    let response = await fetch('./sightings');
    let sightings = await response.json();
    return sightings;
}

function putSightingsOnChart(sightings) {
    let markers = L.markerClusterGroup({
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: false,
        removeOutsideVisibleBounds: true,
        disableClusteringAtZoom: 20
    });
    for (let i = 0; i < sightings.length; i++) {
        let marker = L.marker([sightings[i].Latitude, sightings[i].Longitude], { sightingId: sightings[i].sighting_id });
        marker.on('click', getSightingInfo);
        markers.addLayer(marker);
    }
    chart.addLayer(markers);
}

async function getSightingInfo() {
    let response = await fetch('./sighting?id=' + this.options.sightingId);
    let sighting = await response.json();
    let modalContent = `
        <p>Latitude: ${sighting.Latitude}</p>
        <p>Longitude: ${sighting.Longitude}</p>
        <p>Date: ${sighting.Year}/${sighting.Month}/${sighting.Day}</p>
        <p>Accuracy: ${sighting.Accuracy}</p>
    `;
    if (sighting.Comments.length != 0) {
        modalContent += `<p>Comments: ${sighting.Comments}</p>`;
    }

    console.log(sighting);
    document.getElementById('sightingModal').style.display = 'block';
    modalContent;
    document.getElementById('modalText').innerHTML = modalContent;
}

async function showClosestSightings() {
    let center = chart.getBounds().getCenter();
    let userLat = center.lat;
    let userLon = center.lng;

    let response = await fetch(`./nearestSighting?limitAmount=10&userLat=${userLat}&userLon=${userLon}`);
    let sightings = await response.json();

    // need to loop through here
    let tableContent = `
        <div>
            <h4>Closest 10 sightings to center of map:</h4>
            <table class="w3-table">
                <tr>
                    <th>Lat</th>
                    <th>Lon</th>
                    <th>Dist</th>
                </tr>
                `

    for (let i = 0; i < sightings.length; i++) {
        tableContent += `
            <tr>
                <td>${sightings[i].Latitude}</td>
                <td>${sightings[i].Longitude}</td>
                <td>${sightings[i].distance} nm</td>
            </tr>
        `;
    }

    tableContent += `
            </table>
        </div>
    `;

    document.getElementById('nearestSighting').style.display = 'block';
    document.getElementById('nearestSightingData').innerHTML = tableContent;
}

function showMobileNav() {
    var x = document.getElementById("demo");
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
    } else {
        x.className = x.className.replace(" w3-show", "");
    }
}