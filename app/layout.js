import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Orbital — All your email, one inbox.",
  description: "Modern email client for managing multiple Gmail accounts.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#0c0d10] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
