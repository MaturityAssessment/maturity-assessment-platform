import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context";

export const metadata: Metadata = {
  title: "Maturity Assessment",
  description: "Platform for assessing the maturity of multiple domains",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:block focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <main id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
