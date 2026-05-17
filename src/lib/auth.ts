import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { getDb, query, run, saveDb } from './db';
import { nanoid } from 'nanoid';

function validateEnvVars() {
  const missing: string[] = [];
  
  if (!process.env.GITHUB_CLIENT_ID) missing.push('GITHUB_CLIENT_ID');
  if (!process.env.GITHUB_CLIENT_SECRET) missing.push('GITHUB_CLIENT_SECRET');
  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please set these variables in your .env.local file or environment configuration.'
    );
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      validateEnvVars();
      if (!account || !user.email) return false;

      await getDb();

      const existing = query('SELECT * FROM users WHERE provider_id = ? AND provider = ?', [
        account.providerAccountId,
        account.provider,
      ]);

      if (existing.length === 0) {
        const id = nanoid();
        run(
          'INSERT INTO users (id, email, name, avatar, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            user.email,
            user.name || null,
            user.image || null,
            account.provider,
            account.providerAccountId,
            Date.now(),
          ]
        );
        saveDb();
      }

      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        try {
          await getDb();
          const dbUser = query('SELECT id FROM users WHERE provider_id = ? AND provider = ?', [
            account.providerAccountId,
            account.provider,
          ]);
          if (dbUser.length > 0) {
            token.userId = dbUser[0].id;
          } else {
            console.warn('User not found in database during JWT callback:', account.provider, account.providerAccountId);
          }
        } catch (err) {
          console.error('Database error during JWT callback:', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.userId = token.userId as string;
      }
      return session;
    },
  },
});
