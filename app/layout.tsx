import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthorCard, BrandMark, Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { ThemeProvider } from "@/components/shell/theme-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "HR Analytics · Site Tambang", template: "%s · HR Analytics" },
  description: "Dashboard absensi, lembur, dan turnover site tambang dengan data quality log. Proyek portofolio dengan data dummy.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efebfa" },
    { media: "(prefers-color-scheme: dark)", color: "#121016" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" suppressHydrationWarning className={jakarta.variable}>
      <body className="min-h-dvh bg-page font-sans text-text antialiased">
        <ThemeProvider>
          <div className="mx-auto flex max-w-content gap-6 p-4 md:p-6">
            <Sidebar />
            <main className="min-w-0 flex-1">
              <MobileNav brand={<BrandMark />} author={<AuthorCard />} />
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
