import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clarion AI — AI Life & Admin Copilot",
  description:
    "Privacy-first administrative AI copilot that translates complex notices, bills, contracts, and deadlines into human-verified action plans.",
  keywords: ["AI Admin Copilot", "Privacy First AI", "Document Analysis", "Deadline Tracker", "Bill Assistant"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
