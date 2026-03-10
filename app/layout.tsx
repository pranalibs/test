import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Customer Management",
  description: "Customer & device management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
