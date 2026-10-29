const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(express.json());

app.use(cors());
app.get("/", (req, res) => {
  res.send("Hello, Server is running!");
});

app.get("/api/products", (req, res) => {
  const products = [
    {
      id: 1,
      name: "Sepatu Nike",
      price: 500000,
      description: "This is a high-quality Nike shoe.",
    },
    {
      id: 2,
      name: "Sepatu Adidas",
      price: 400000,
      description: "This is a high-quality Adidas shoe.",
    },
  ];

  res.json(products);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
