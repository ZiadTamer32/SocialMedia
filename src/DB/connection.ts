import { connect } from "mongoose";
import { DB_URL } from "../config/app.config.js";

async function testDbConnection() {
  try {
    await connect(DB_URL);
    console.log("Database connected successfully");
  } catch (error: any) {
    console.error("Database connection failed:", error.message);
  }
}

export default testDbConnection;
