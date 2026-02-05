import express from "express";
import cors from "cors";
import { animals } from "./animals.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Prehistoric animals is running!");
});

app.get("/animals", (req, res) => {
  res.json(animals);
});

app.get("/animals/:name", (req, res) => {
  const name = req.params.name.toLowerCase();
  const animal = animals.find(a => a.name.toLowerCase() === name);

  if (!animal) {
    return res.status(404).json({ error: "Animal not found" });
  }

  res.json(animal);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forcing shutdown...");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown); 