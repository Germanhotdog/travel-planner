'use server';

import bcrypt from 'bcrypt';
import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { createClient} from '@libsql/client';

export async function registerUser(formData: FormData) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL as string,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await db.execute({
      sql: `
        INSERT INTO users (id, email, name, password)
        VALUES (?, ?, ?, ?)
      `,
      args: [id, email, name, hashedPassword],
    });
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error('Failed to register user');
  }

  redirect('/auth/login');
}