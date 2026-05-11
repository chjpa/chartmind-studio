import type { Metadata } from "next";
import { appBrand } from "@/lib/config/appBrand";
import "./globals.css";

export const metadata: Metadata = {
  title: appBrand.name,
  description: appBrand.description
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
