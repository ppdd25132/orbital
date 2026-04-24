import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { auditLog, upsertConnectedAccount } from '@/lib/orbital-store';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: store tokens from the OAuth account
      if (account) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
        token.expires_at = account.expires_at;
        if (token.email && account.access_token) {
          await upsertConnectedAccount(token.email, {
            email: token.email,
            name: token.name || token.email,
            access_token: account.access_token,
            refresh_token: account.refresh_token || null,
            token_expiry: account.expires_at || null,
          })
            .then((saved) =>
              auditLog({
                userEmail: token.email,
                action: 'primary_gmail_token_saved',
                targetType: 'connected_account',
                targetId: saved.id,
                metadata: { accountEmail: token.email },
              })
            )
            .catch(() => {});
        }
        return token;
      }

      // Token still valid (with 60s buffer) — return as-is
      if (token.expires_at && Date.now() < token.expires_at * 1000 - 60_000) {
        return token;
      }

      // Access token expired — refresh it
      if (!token.refresh_token) {
        return { ...token, error: 'RefreshAccessTokenError' };
      }

      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: token.refresh_token,
          }),
        });

        const refreshed = await response.json();

        if (!response.ok) {
          console.error('Token refresh failed:', refreshed);
          return { ...token, error: 'RefreshAccessTokenError' };
        }

        return {
          ...token,
          access_token: refreshed.access_token,
          // Google only returns a new refresh_token if it rotated; keep the old one otherwise
          refresh_token: refreshed.refresh_token ?? token.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
          error: undefined,
        };
      } catch (err) {
        console.error('Error refreshing access token:', err);
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },
    async session({ session, token }) {
      session.hasGmailAccess = Boolean(token.access_token);
      session.expires_at = token.expires_at;
      session.error = token.error;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
