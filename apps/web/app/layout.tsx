import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kokeba Studio",
  description: "Kokeba — children's books for every market.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..600;1,400..600&family=Noto+Sans+Ethiopic:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
