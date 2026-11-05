
/* =========================================
   NORA MVP — Interactive Campus Map
   Demonstration locations and inventory
========================================= */

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

// Approximate building markers for MVP.
// Verify precise coordinates before deployment.
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

const markers = [];

function getMapInventory() {
  try {
    const saved = localStorage.getItem("noraBaskets");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Unable to load map inventory:", error);
    return [];
  }
}

function getMapStatus(stock) {
  if (stock === 0) return "Out of stock";
  if (stock <= 10) return "Low stock";
  return "Available";
}

function updateMapMarkers() {
  const inventory = getMapInventory();

  markers.forEach(marker => {
    campusMap.removeLayer(marker);
  });

  markers.length = 0;

  mapLocations.forEach(location => {
    const basket = inventory.find(
      item => item.id === location.id
    );

    const status = basket
      ? getMapStatus(basket.stock)
      : "No inventory data";

    const quantity = basket
      ? `${basket.stock} / ${basket.capacity}`
      : "Unavailable";

    const marker = L.marker(location.coordinates)
      .addTo(campusMap);

    // All popup content is from predefined demo data.
    marker.bindPopup(`
      <div class="nora-map-popup">
        <strong>${location.name}</strong>
        <p>Status: ${status}</p>
        <p>Estimated Stock: ${quantity}</p>
        <small>Simulated demonstration data</small>
      </div>
    `);

    markers.push(marker);
  });
}

// Draw the initial map markers
updateMapMarkers();

// Refresh after returning from the admin page
window.addEventListener("pageshow", updateMapMarkers);

// Update if inventory changes in another tab
window.addEventListener("storage", event => {
  if (event.key === "noraBaskets") {
    updateMapMarkers();
  }
});
