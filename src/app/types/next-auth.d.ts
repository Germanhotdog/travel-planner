import { Session } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    accessToken?: string;
  }
}

