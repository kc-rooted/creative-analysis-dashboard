import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConditionalNavigation } from "@/components/conditional-navigation";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ClientProvider } from "@/components/client-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rooted Intelligence",
  description: "AI-driven creative analysis pipeline for marketing campaigns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ClientProvider>
            <ConditionalNavigation />
            {children}
          </ClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
