import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earthward Forge - Create & Export Game Rooms",
  description: "A powerful room editor for creating and editing game rooms with tile maps and object layers.",
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
