import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Only allow sign-in if the email ends with @rootedsolutions.co
      if (account?.provider === "google") {
        return profile?.email?.endsWith("@rootedsolutions.co") ?? false
      }
      return true
    },
    async session({ session, token }) {
      // Add user id to session
      if (token?.sub && session?.user) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user, account, profile }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (user) {
        token.id = user.id
      }
      return token
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig