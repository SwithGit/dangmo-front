import type { Metadata } from "next";
import "./globals.css";
import { GA_MEASUREMENT_ID } from "../lib/analytics";
import { AnalyticsPageTracker } from "./analytics-page-tracker";

export const metadata: Metadata = {
  metadataBase: new URL("https://dangmo.kr"),
  title: "당모 | 당신의 사업공모",
  description: "지원사업 탐색부터 맞춤 추천, 신청 준비와 마감 관리까지 연결하는 AI 공고 비서",
  applicationName: "당모",
  authors: [{ name: "Team. DM", url: "https://dangmo.kr" }],
  creator: "Team. DM",
  publisher: "Team. DM",
  category: "business",
  keywords: ["당모", "사업공모", "지원사업", "정부지원사업", "창업지원사업", "사업계획서", "사업비 편성", "AI 공고 추천"],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  icons: {
    icon: [{ url: "/dangmo-icon.png", type: "image/png", sizes: "1254x1254" }],
    shortcut: "/dangmo-icon.png",
    apple: [{ url: "/dangmo-icon.png", type: "image/png", sizes: "1254x1254" }],
  },
  openGraph: {
    type: "website",
    url: "https://dangmo.kr",
    siteName: "당모",
    locale: "ko_KR",
    title: "당모 | 당신의 사업공모",
    description: "지원사업 탐색부터 맞춤 추천, 신청 준비와 마감 관리까지 연결하는 AI 공고 비서",
  },
  twitter: {
    card: "summary",
    title: "당모 | 당신의 사업공모",
    description: "지원사업 탐색부터 신청 준비까지 연결하는 AI 공고 비서",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://dangmo.kr/#organization", name: "Team. DM", url: "https://dangmo.kr", logo: "https://dangmo.kr/dangmo-icon.png", email: "sseung.chip@gmail.com" },
      { "@type": "WebSite", "@id": "https://dangmo.kr/#website", url: "https://dangmo.kr", name: "당모 | 당신의 사업공모", description: "지원사업 탐색부터 맞춤 추천, 신청 준비와 마감 관리까지 연결하는 AI 공고 비서", inLanguage: "ko-KR", publisher: { "@id": "https://dangmo.kr/#organization" } },
      { "@type": "SoftwareApplication", name: "당모", url: "https://dangmo.kr", applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "ko-KR", description: "지원사업 공고 탐색, 맞춤 추천, 사업비 편성, 서류작성 AI와 마감 알림을 제공하는 웹서비스", provider: { "@id": "https://dangmo.kr/#organization" } },
    ],
  };
  return (
    <html lang="ko">
      <head>
        {GA_MEASUREMENT_ID ? <><script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          id="dangmo-ga4"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});`,
          }}
        /></> : null}
      </head>
      <body>
        <AnalyticsPageTracker />
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
