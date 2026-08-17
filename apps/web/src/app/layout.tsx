import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal CRM",
  description: "AI-native commercial signal workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
