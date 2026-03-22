import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "ReceAI Daytime Core",
  description:
    "Unified SaaS revenue builder for daytime charters, transfers, and invoicing.",
  openGraph: {
    title: "ReceAI Daytime Core",
    description:
      "Unified SaaS revenue builder for daytime charters, transfers, and invoicing.",
    type: "website",
    url: "https://receai.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReceAI Daytime Core",
    description:
      "Unified SaaS revenue builder for daytime charters, transfers, and invoicing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
