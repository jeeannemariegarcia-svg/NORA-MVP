
/* =========================================
   NORA MVP - Student Location Finder
   Shared Simulated Inventory
========================================= */

// Default demonstration inventory
const defaultBaskets = [
  {
    id: 1,
    name: "Stan Grad Centre",
    products: "Pads and tampons",
    stock: 32,
    capacity: 50
  },
  {
    id: 2,
    name: "Senator Burns Building",
    products: "Pads and tampons",
    stock: 8,
    capacity: 50
  }
];

// Connect JavaScript to HTML
const locationList = document.getElementById("location-list");
const searchInput = document.getElementById("location-search");

// Read inventory saved by the Admin Dashboard
function getBaskets() {
  const saved = localStorage.getItem("noraBaskets");

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed.filter(basket => basket.active !== false);
      }
    } catch (error) {
      console.error("Unable to read saved NORA inventory:", error);
    }
  }

  return defaultBaskets;
}

// Calculate availability automatically
function getStockStatus(stock, threshold = 10) {
  if (stock === 0) {
    return "Out of stock";
  }

  if (stock <= threshold) {
    return "Low stock";
  }

  return "Available";
}

// Display location cards
function displayLocations(searchTerm = "") {
  if (!locationList) return;

  locationList.innerHTML = "";

  const baskets = getBaskets();
  const search = searchTerm.toLowerCase().trim();

  const filteredLocations = baskets.filter(basket =>
    basket.name.toLowerCase().includes(search)
  );

  filteredLocations.forEach(basket => {
    const card = document.createElement("div");
    card.className = "card";

    // Building name
    const title = document.createElement("h3");
    title.textContent = basket.name;

    // Product types
    const products = document.createElement("p");
    products.textContent =
      basket.products || "Pads and tampons";

    // Calculate current stock status
    const currentStatus = getStockStatus(basket.stock, Number.isInteger(basket.threshold) ? basket.threshold : 10);

    const status = document.createElement("p");
    status.textContent = "Status: " + currentStatus;

    status.className =
      currentStatus === "Available"
        ? "status-available"
        : "status-low";

    // Estimated product quantity
    const quantity = document.createElement("p");
    quantity.textContent =
      `Estimated availability: ${basket.stock} products`;

    // Add content to the card
    card.append(title, products, status, quantity);

    // Display card
    locationList.appendChild(card);
  });

  // No matching locations
  if (filteredLocations.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No matching locations found.";
    locationList.appendChild(message);
  }
}

// Search functionality
if (searchInput) {
  searchInput.addEventListener("input", () => {
    displayLocations(searchInput.value);
  });
}

// Refresh inventory when returning to the page
window.addEventListener("pageshow", () => {
  displayLocations(searchInput ? searchInput.value : "");
});

// Detect changes from another browser tab
window.addEventListener("storage", event => {
  if (event.key === "noraBaskets") {
    displayLocations(searchInput ? searchInput.value : "");
  }
});

// Display locations when the page first loads
displayLocations();
