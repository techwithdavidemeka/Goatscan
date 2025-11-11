import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/lib/ui/theme";
import { SearchProvider } from "@/lib/ui/search-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Goatscan - Solana Trader Leaderboard",
  description: "Track and rank the top Solana traders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-white text-gray-900 dark:bg-gray-900 dark:text-white`}>
        <ThemeProvider>
          <SearchProvider>
            <Navbar />
            {children}
          </SearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

