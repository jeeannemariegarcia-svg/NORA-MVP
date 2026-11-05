
const locationList = document.getElementById("location-list");
const searchInput = document.getElementById("location-search");

function displayLocations(searchTerm = "") {
  locationList.innerHTML = "";

  const filteredLocations = locations.filter(location =>
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

    card.append(title, products, stock);
    locationList.appendChild(card);
  });

  if (filteredLocations.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No matching locations found.";
    locationList.appendChild(message);
  }
}

searchInput.addEventListener("input", () => {
  displayLocations(searchInput.value.trim());
});

displayLocations();
