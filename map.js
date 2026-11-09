
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

  const dynamicLocations = inventory.filter(b => Array.isArray(b.coordinates) && b.coordinates.length === 2 && b.coordinates.every(n => typeof n === "number" && Number.isFinite(n)) && !mapLocations.some(loc => loc.id === b.id)).map(b => ({id:b.id,name:b.name,coordinates:b.coordinates}));
  const visibleLocations = [...mapLocations.map(loc => { const b = inventory.find(item => item.id === loc.id); return b && Array.isArray(b.coordinates) && b.coordinates.length === 2 && b.coordinates.every(n => Number.isFinite(n)) ? {...loc, coordinates:b.coordinates} : loc; }), ...dynamicLocations];
  // Create updated markers
  visibleLocations.forEach(location => {
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

    // DOM-based popup avoids injecting mutable building names as HTML.
    const popup=document.createElement("div");
    popup.className="nora-map-popup";
    const heading=document.createElement("strong");heading.textContent=location.name;
    const statusLine=document.createElement("p");statusLine.textContent="Demo status: "+status;
    const quantityLine=document.createElement("p");quantityLine.textContent="Estimated products: "+quantity;
    const warning=document.createElement("small");
    warning.textContent="Proposed building, not a verified washroom or stocked location.";
    const select=document.createElement("button");
    select.type="button";select.className="nora-map-card-link";
    select.textContent="View building card";
    select.addEventListener("click",()=>document.dispatchEvent(
      new CustomEvent("nora-map-location-selected",{detail:{id:location.id}})));
    popup.append(heading,statusLine,quantityLine,warning,select);
    marker.bindPopup(popup);
    marker.on("click",()=>document.dispatchEvent(
      new CustomEvent("nora-map-location-selected",{detail:{id:location.id}})));

    markers.set(location.id, marker);
  });
}

// Card selection and map pins stay connected in both directions.
document.addEventListener("nora-location-selected",event=>{
  const id=event.detail?.id;
  if(id===undefined||id===null){campusMap.closePopup();return;}
  const matching=markers.get(id);
  if(!matching)return;
  campusMap.setView(matching.getLatLng(),18);
  matching.openPopup();
  if(event.detail?.scroll)document.getElementById("campus-map")?.scrollIntoView({behavior:"smooth",block:"center"});
});

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
  const inventory = getMapInventory();
  const dynamicLocations = inventory.filter(b => Array.isArray(b.coordinates) && b.coordinates.length === 2 && b.coordinates.every(n => typeof n === "number" && Number.isFinite(n))).map(b => ({id:b.id,name:b.name,coordinates:b.coordinates}));
  const matchingLocation = [...mapLocations.map(loc => { const b = inventory.find(item => item.id === loc.id); return b && Array.isArray(b.coordinates) && b.coordinates.length === 2 && b.coordinates.every(n => Number.isFinite(n)) ? {...loc, coordinates:b.coordinates} : loc; }), ...dynamicLocations].find(location =>
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
