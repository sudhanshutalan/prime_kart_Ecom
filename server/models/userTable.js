import database from "../db/db.js";

export async function createUserTable() {
  try {
    const query = `
    CREATE TABLE IF NOT EXISTS users(
    id UUID DEFAULT gen_random_UUID() PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK(char_length(name)>=3),
    password TEXT NOT NULL,
    role VARCHAR(10) DEFAULT 'User CHECK (role IN('USER',ADMIN)),
    avatar JSONB DEFAULT NULL,
    reset_password_token TEXT DEFAULT NULL,
    reset_password_expire TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `;
    await database.query(query);
  } catch (error) {
    console.error("Error creating user table:", error);
    process.exit(1);
  }
}
