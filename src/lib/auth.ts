import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { getDb, query, run, saveDb } from './db';
import { nanoid } from 'nanoid';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blockos-fallback-session-secret-key-32chars',
  providers: [
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? [GitHub({
      clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })] : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [Google({
      clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })] : []),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      await getDb();

      const existing = query('SELECT * FROM users WHERE provider_id = ? AND provider = ?', [
        account.providerAccountId,
        account.provider,
      ]);

      if (existing.length === 0) {
        const id = nanoid();
        run(
          "INSERT INTO users (id, email, name, avatar, provider, provider_id, created_at, account_mode) VALUES (?, ?, ?, ?, ?, ?, ?, 'personal')",
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
