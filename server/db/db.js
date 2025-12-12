import pkg from "pg";

const { Client } = pkg;

const database = new Client({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "primekart_db",
  password: process.env.DB_PASS || "password",
  port: process.env.DB_PORT || 5432,
});

try {
  await database.connect();
  console.log("connected to databse successfully");
} catch (error) {
  console.log("Database connection error", error);
  process.exit(1);
}

export default database;
