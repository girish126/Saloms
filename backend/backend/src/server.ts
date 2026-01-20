import dotenv from "dotenv";
dotenv.config();

import app from "./app";                 
import { testConnection } from "./config/db";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await testConnection();
  } catch (err) {
    console.error("DB connection test failed:", err);
  }
});
