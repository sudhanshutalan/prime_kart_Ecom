import pkg from "pg";

const { Client } = pkg;

const database = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

try {
  await database.connect();
  console.log("connected to databse successfully");
} catch (error) {
  console.log("Database connection error", error);
  process.exit(1);
}

export default database;
