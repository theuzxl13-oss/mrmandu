import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Quicksand } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Sans única para todo o sistema (substituta de Neue Haas Grotesk)
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Serifa editorial — usada apenas em títulos de listas "arquivo" (serviços, barbeiros)
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
// Arredondada geométrica para o logotipo "mr.mandu"
const logo = Quicksand({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-logo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "MR.MANDU BARBERS — Barbearia Premium", template: "%s · MR.MANDU BARBERS" },
  description: "Agende seu horário na MR.MANDU BARBERS e tenha uma experiência de barbearia premium.",
};

export const viewport: Viewport = {
  themeColor: "#0e0e0e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable} ${logo.variable}`}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{ classNames: { toast: "!rounded-none !bg-background !border-border !text-foreground !shadow-none font-sans" } }}
        />
      </body>
    </html>
  );
}
