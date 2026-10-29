import "./globals.css";
import { Inter } from "next/font/google";
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
export const metadata = { title: "CallCheck: mystery-shop your own phone line" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={sans.variable}><body className="font-sans">{children}</body></html>;
}
