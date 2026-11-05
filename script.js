
/* =====================================
   NORA MVP - Location Finder
   Simulated Data
===================================== */

// 1. Sample location data
const noraLocations = [
  {
    name: "Campus Building A",
    products: "Pads and tampons",
    stock: "Available"
  },
  {
    name: "Campus Building B",
    products: "Pads",
    stock: "Low stock"
  },
  {
    name: "Campus Building C",
    products: "Pads and tampons",
    stock: "Available"
  }
];

// 2. Connect JavaScript to HTML elements
const locationList = document.getElementById("location-list");
const searchInput = document.getElementById("location-search");

// 3. Display and filter locations
function displayLocations(searchTerm = "") {

  // Clear previously displayed cards
  locationList.innerHTML = "";

  // Find locations matching the search
  const filteredLocations = noraLocations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create a card for each matching location
  filteredLocations.forEach(location => {

    const card = document.createElement("div");
    card.className = "card";

    // Building name
    const title = document.createElement("h3");
    title.textContent = location.name;

    // Products offered
    const products = document.createElement("p");
    products.textContent = location.products;

    // Stock availability
    const stock = document.createElement("p");
    stock.textContent = "Status: " + location.stock;

    // Apply stock status styling
    if (location.stock === "Available") {
      stock.className = "status-available";
    } else if (location.stock === "Low stock") {
      stock.className = "status-low";
    }

    // Add content to the card
    card.append(title, products, stock);

    // Add the card to the website
    locationList.appendChild(card);
  });

  // Display a message if nothing matches
  if (filteredLocations.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No matching locations found.";
    locationList.appendChild(message);
  }
}

// 4. Listen for typing in the search bar
if (searchInput && locationList) {
  searchInput.addEventListener("input", () => {
    displayLocations(searchInput.value.trim());
  });

  // 5. Show all locations when page loads
  displayLocations();
} else {
  console.error("NORA: Search input or location list not found in HTML.");
}
