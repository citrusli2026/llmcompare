import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LLMCompare - 国内 AI 大模型对比",
  description: "面向国内 AI 爱好者的 LLM 大模型综合对比平台",
};

const themeScript = `(function(){try{var t=localStorage.getItem("theme");var c=t==="light"?"light":"dark";document.documentElement.classList.remove("light","dark");document.documentElement.classList.add(c);}catch(e){document.documentElement.classList.add("dark");}})();`;

const localeScript = `(function(){try{var l=localStorage.getItem("llmcompare-locale");if(l&&l!=="zh"){document.documentElement.style.visibility="hidden";}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript + themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <ThemeProvider>
            {children}
            <Analytics />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
