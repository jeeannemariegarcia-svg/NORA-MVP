
/* NORA MVP - Location Finder */
/* All inventory information is simulated */

// Sample SAIT building locations
const noraLocations = [
  {
    name: "Stan Grad Centre",
    products: "Pads and tampons",
    stock: "Available"
  },
  {
    name: "Senator Burns Building",
    products: "Pads and tampons",
    stock: "Low stock"
  }
];

// Connect to HTML
const locationList = document.getElementById("location-list");
const searchInput = document.getElementById("location-search");

// Display location cards
function displayLocations(searchTerm = "") {
  if (!locationList) return;

  locationList.innerHTML = "";

  const filteredLocations = noraLocations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  filteredLocations.forEach(location => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = location.name;

    const products = document.createElement("p");
    products.textContent = location.products;

    const stock = document.createElement("p");
    stock.textContent = "Status: " + location.stock;

    if (location.stock === "Available") {
      stock.className = "status-available";
    } else {
      stock.className = "status-low";
    }

    card.append(title, products, stock);
    locationList.appendChild(card);
  });

  if (filteredLocations.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No matching locations found.";
    locationList.appendChild(message);
  }
}

// Activate search
if (searchInput) {
  searchInput.addEventListener("input", () => {
    displayLocations(searchInput.value.trim());
  });
}

// Show locations when page loads
displayLocations();
