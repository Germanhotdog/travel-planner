import NextAuth, { User, Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

// Define interface for SQLite user
interface DBUser {
  id: string;
  email: string;
  name: string | null;
  password: string;
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        let db;
        try {
          db = new Database('./database.db', { readonly: true });
          if (!credentials?.email || !credentials?.password) {
            console.error('Missing credentials:', { email: credentials?.email });
            return null;
          }

          const user = db
            .prepare('SELECT * FROM users WHERE email = ?')
            .get(credentials.email) as DBUser | undefined;

          if (!user) {
            console.error('User not found:', credentials.email);
            return null;
          }

          if (!(await bcrypt.compare(credentials.password, user.password))) {
            console.error('Invalid password for:', credentials.email);
            return null;
          }

          return { id: user.id, name: user.name, email: user.email };
        } catch (err) {
          console.error('Authorize error:', err);
          return null;
        } finally {
          if (db) {
            try {
              db.close();
            } catch (closeErr) {
              console.error('Error closing database:', closeErr);
            }
          }
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);