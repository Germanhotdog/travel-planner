'use server';

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export async function registerUser(formData: FormData) {
  const dbSourcePath = path.resolve(process.cwd(), 'database.db');
  const dbTempPath = '/tmp/database.db';
  if (!fs.existsSync(dbTempPath)) {
    fs.copyFileSync(dbSourcePath, dbTempPath);
  }

  const db = new Database(dbTempPath);

  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO users (id, email, name, password)
      VALUES (?, ?, ?, ?)
    `).run(id, email, name, hashedPassword);

  } catch (error) {
    console.error('Registration error:', error);
    throw new Error('Failed to register user');
  } finally {
    db.close();
  }

  redirect('/auth/login');
}