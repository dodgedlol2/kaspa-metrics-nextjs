import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import DiscordProvider from 'next-auth/providers/discord';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        try {
          // Find user in database
          const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, password_hash, email_verified')
            .eq('email', credentials.email)
            .single();

          if (error || !user) {
            throw new Error('CredentialsSignin');
          }

          // Check if email is verified
          if (!user.email_verified) {
            throw new Error('EmailNotVerified');
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!isValid) {
            throw new Error('CredentialsSignin');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            email_verified: user.email_verified,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'discord') {
        try {
          // Check if user already exists
          const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('id, email_verified')
            .eq('email', user.email!)
            .single();

          if (selectError && selectError.code !== 'PGRST116') {
            console.error('Database error during sign in:', selectError);
            return false;
          }

          if (existingUser) {
            // Update existing user with social login info
            await supabase
              .from('users')
              .update({
                name: user.name || existingUser.name,
                image: user.image,
                email_verified: true, // Social logins are auto-verified
                updated_at: new Date().toISOString(),
              })
              .eq('email', user.email!);
          } else {
            // Create new user for social login
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                email: user.email!,
                name: user.name!,
                image: user.image,
                email_verified: true, // Social logins are auto-verified
                is_premium: false,
                subscription_status: 'free',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (insertError) {
              console.error('Error creating user:', insertError);
              return false;
            }
          }
        } catch (error) {
          console.error('Sign in error:', error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // Add user info to token on first sign in
      if (user) {
        token.id = user.id;
        token.email_verified = user.email_verified || (account?.provider === 'google' || account?.provider === 'discord');
      }

      // For existing tokens, fetch fresh email verification status
      if (token.email && !token.email_verified) {
        try {
          const { data: dbUser } = await supabase
            .from('users')
            .select('email_verified')
            .eq('email', token.email)
            .single();

          if (dbUser) {
            token.email_verified = dbUser.email_verified;
          }
        } catch (error) {
          console.error('Error fetching user verification status:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add additional user info to session
      if (token) {
        session.user.id = token.id as string;
        session.user.email_verified = token.email_verified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
