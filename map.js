
/* =========================================
   NORA MVP — Interactive Campus Map
   Demonstration locations and inventory
========================================= */

// Initialize campus map
const campusMap = L.map("campus-map").setView(
  [51.064, -114.089],
  16
);

// OpenStreetMap background
L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }
).addTo(campusMap);

// Approximate demonstration building locations
const mapLocations = [
  {
    id: 1,
    name: "Stan Grad Centre",
    coordinates: [51.064, -114.089]
  },
  {
    id: 2,
    name: "Senator Burns Building",
    coordinates: [51.0645, -114.0875]
  }
];

// Store map markers
const markers = new Map();

// Read inventory from Admin Dashboard
function getMapInventory() {
  try {
    const saved = localStorage.getItem("noraBaskets");

    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Unable to load map inventory:", error);
    return [];
  }
}

// Determine stock status
function getMapStatus(stock, threshold = 10) {
  if (stock === 0) return "Out of stock";
  if (stock <= threshold) return "Low stock";
  return "Available";
}

// Determine marker colour
function getMarkerStatus(basket) {
  if (!basket) return "unknown";

  if (basket.stock === 0) {
    return "empty";
  }

  if (basket.stock <= (Number.isInteger(basket.threshold) ? basket.threshold : 10)) {
    return "low";
  }

  return "available";
}

// Create custom NORA marker
function createNoraIcon(markerStatus) {
  return L.divIcon({
    className: "",
    html: `<div class="nora-marker ${markerStatus}"></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });
}

// Update map markers from inventory
function updateMapMarkers() {
  const inventory = getMapInventory();

  // Remove old markers
  markers.forEach(marker => campusMap.removeLayer(marker));
  markers.clear();

  // Create updated markers
  mapLocations.forEach(location => {
    const basket = inventory.find(
      item => item.id === location.id
    );

    // Never show a deactivated basket as an available campus location.
    if (basket && basket.active === false) return;

    const status = basket
      ? getMapStatus(basket.stock, Number.isInteger(basket.threshold) ? basket.threshold : 10)
      : "No inventory data";

    const quantity = basket
      ? `${basket.stock} / ${basket.capacity}`
      : "Unavailable";

    // Select marker colour
    const markerStatus = getMarkerStatus(basket);

    // Create custom coloured marker
    const customIcon = createNoraIcon(markerStatus);

    const marker = L.marker(location.coordinates, {
      icon: customIcon
    }).addTo(campusMap);

    // Display inventory popup
    marker.bindPopup(`
      <div class="nora-map-popup">
        <strong>${location.name}</strong>
        <p>Status: ${status}</p>
        <p>Estimated Stock: ${quantity}</p>
        <small>Simulated demonstration data</small>
      </div>
    `);

    markers.set(location.id, marker);
  });
}

// Display initial markers
updateMapMarkers();

// Refresh inventory when returning to the page
window.addEventListener("pageshow", updateMapMarkers);

// Detect inventory changes from another tab
window.addEventListener("storage", event => {
  if (event.key === "noraBaskets") {
    updateMapMarkers();
  }
});


/* =========================================
   NORA — Search and Map Connection
========================================= */

// Connect to search bar
const mapSearchInput = document.getElementById("location-search");

// Focus map on selected building
function focusMapOnBuilding(searchTerm) {
  const search = searchTerm.toLowerCase().trim();

  // Return to campus overview
  if (search === "") {
    campusMap.setView([51.064, -114.089], 16);
    campusMap.closePopup();
    return;
  }

  // Find matching building
  const matchingLocation = mapLocations.find(location =>
    markers.has(location.id) && location.name.toLowerCase().includes(search)
  );

  if (!matchingLocation) {
    return;
  }

  // Zoom to building
  campusMap.setView(matchingLocation.coordinates, 18);

  // Open its inventory popup
  const matchingMarker = markers.get(matchingLocation.id);

  if (matchingMarker) {
    matchingMarker.openPopup();
  }
}

// Listen for building searches
if (mapSearchInput) {
  mapSearchInput.addEventListener("input", () => {
    focusMapOnBuilding(mapSearchInput.value);
  });
}
