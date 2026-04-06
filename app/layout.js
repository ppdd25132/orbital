import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Orbital — All your accounts. One inbox.",
  description: "AI-powered communication hub for professionals managing multiple clients.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0f1117]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
