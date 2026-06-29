import "dotenv/config";
import express from "express";
import cors from "cors";

import { authRouter } from "./routes/auth.js";
import { customersRouter } from "./routes/customers.js";
import { productsRouter } from "./routes/products.js";
import { salesRouter } from "./routes/sales.js";
import { reportsRouter } from "./routes/reports.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "gym-stock-api" }));

app.use("/api/auth", authRouter);
app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/reports", reportsRouter);

// Uniform JSON 404 + error handling.
app.use((req, res) => res.status(404).json({ error: "Not found." }));
app.use((err, req, res, _next) => {
  console.error(err);
  if (err?.code === "P2002") return res.status(409).json({ error: "That record already exists." });
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`gym-stock API listening on http://localhost:${PORT}`));
