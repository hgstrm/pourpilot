import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "xBloom Recipe Maker",
  description: "Snap a bean bag, get an AI pour-over recipe, push it to xBloom.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "xBloom Recipes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f0e0c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
