import type { Metadata } from "next";
import { DormProvider } from "@/context/DormContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dormy",
  description: "ระบบจัดการหอพัก",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <DormProvider>
          {children}
        </DormProvider>
      </body>
    </html>
  );
}
