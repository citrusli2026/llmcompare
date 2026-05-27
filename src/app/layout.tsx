import type { Metadata } from "next";
import { Rubik, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.llmcompare.cc"),
  title: {
    default: "模型图鉴 - 国内大模型数据一览",
    template: "%s - 模型图鉴",
  },
  description: "收集整理了国内大模型的智能评分、API 速度与官方定价数据，为开发者和研究者提供参考。",
  openGraph: {
    title: "模型图鉴 - 国内大模型数据一览",
    description: "收集整理了国内大模型的智能评分、API 速度与官方定价数据。",
    type: "website",
    locale: "zh_CN",
  },
  verification: {
    google: "Wf7Oa2cKQLQZ6rZkQnzemhakueMXBQtENt5vI6rofa8",
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem("theme");document.documentElement.classList.remove("light","dark");if(t==="light"){document.documentElement.classList.add("light");}else{document.documentElement.classList.add("dark");}}catch(e){document.documentElement.classList.add("dark");}})();`;

const localeScript = `(function(){try{var l=localStorage.getItem("llmcompare-locale");document.documentElement.lang=l==="en"?\"en\":\"zh-CN\";if(l&&l!==\"zh\"){document.documentElement.style.visibility=\"hidden\";}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${rubik.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript + themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "模型图鉴",
              description: "收集整理了国内大模型的智能评分、API 速度与官方定价数据，为开发者和研究者提供参考。",
              url: "https://www.llmcompare.cc",
            }),
          }}
        />
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
