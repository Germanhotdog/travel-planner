import NextAuth, { User, Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { createClient, Row } from '@libsql/client';

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
        const db = createClient({
          url: process.env.TURSO_DATABASE_URL as string,
          authToken: process.env.TURSO_AUTH_TOKEN,
        });

        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('Missing credentials:', { email: credentials?.email });
            return null;
          }

          const userResult = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [credentials.email],
          });
          const user = userResult.rows[0] as Row & DBUser | undefined;

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