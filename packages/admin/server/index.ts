import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAdminApp } from "./app.js";

const port = Number(process.env.ADMIN_SERVER_PORT ?? 5501);
const serverUrl = process.env.ADMIN_SERVER_URL ?? "http://localhost:5500";

const app = express();

app.use(createAdminApp());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistDir = path.resolve(__dirname, "client");

app.use("/admin", express.static(clientDistDir));

app.get("/admin/*", (_req, res) => {
  res.sendFile(path.join(clientDistDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Admin API listening on ${serverUrl}`);
});
