import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-cinzel',
});

export const metadata: Metadata = {
  title: "PLAY or PASS?",
  description: "A card game by mattduff36",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cinzel.variable} font-sans`}>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `
            // Set viewport height CSS custom property for mobile safari
            (function() {
              function setViewportHeight() {
                let vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', vh + 'px');
                document.documentElement.style.setProperty('--dynamic-vh', vh + 'px');
              }
              
              // Set initial value
              setViewportHeight();
              
              // Update on resize
              window.addEventListener('resize', setViewportHeight);
              window.addEventListener('orientationchange', function() {
                setTimeout(setViewportHeight, 100);
              });
            })();
          `
        }} />
      </body>
    </html>
  );
} 