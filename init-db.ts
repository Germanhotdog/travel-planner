import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('./database.db', { verbose: console.log });

try {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password TEXT NOT NULL
    )
  `);

  // Create plans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES users(id)
    )
  `);

  // Create activities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      destination TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      startTime TEXT,
      endTime TEXT,
      activities TEXT,
      ownerId TEXT NOT NULL,
      planId TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES users(id),
      FOREIGN KEY (planId) REFERENCES plans(id)
    )
  `);

  // Create plan_shares table for collaboration
  db.exec(`
    CREATE TABLE IF NOT EXISTS plan_shares (
      planId TEXT,
      userId TEXT,
      PRIMARY KEY (planId, userId),
      FOREIGN KEY (planId) REFERENCES plans(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Insert a test user
  const testUser = {
    id: '1',
    email: 'jsckyjacky32@gmail.com',
    name: 'Jacky1423',
    password: bcrypt.hashSync('password123', 10),
  };

  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, password)
    VALUES (?, ?, ?, ?)
  `).run(testUser.id, testUser.email, testUser.name, testUser.password);

  console.log('Database initialized successfully.');
} catch (err) {
  console.error('Database initialization error:', err);
  throw err;
} finally {
  db.close();
}