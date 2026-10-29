import "./globals.css";
import { Inter_Tight, Newsreader } from "next/font/google";
const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-sans" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", style: ["normal", "italic"], adjustFontFallback: false });
export const metadata = { title: "CallCheck: mystery-shop your own phone line" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${sans.variable} ${serif.variable}`}><body className="antialiased font-sans">{children}</body></html>;
}
