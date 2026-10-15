
const locations = [
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

const locationList =
  document.getElementById("location-list");

locations.forEach(location => {
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
