import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Mono, Russo_One } from "next/font/google";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  variable: "--font-chakra-petch",
  weight: ["300", "400", "500", "600", "700"],
});

const russoOne = Russo_One({
  subsets: ["latin"],
  variable: "--font-russo-one",
  weight: "400",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  description:
    "Fantasy-style FTC Worlds game with official divisions, private leagues, and FTC scoring sync.",
  title: "FTC Fantasy Worlds 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${chakraPetch.variable} ${russoOne.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
