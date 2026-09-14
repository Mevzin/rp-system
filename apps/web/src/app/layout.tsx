import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "sonner";
import { LOGO_IMAGE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Criminals System · Painel de Gestão RP",
    template: "%s · Criminals System",
  },
  description:
    "Sistema oficial de gerenciamento para a organização Criminals RP — farm, metas, ranking, comprovações, integração com Discord e auditoria.",
  applicationName: "Criminals System",
  authors: [{ name: "Criminals RP" }],
  keywords: [
    "criminals rp",
    "fivem",
    "painel rp",
    "sistema rp",
    "farm",
    "metas",
    "ranking",
    "discord",
    "gestão",
    "gta rp",
  ],
  icons: {
    icon: [
      {
        url: LOGO_IMAGE_URL,
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: [LOGO_IMAGE_URL],
    apple: [
      {
        url: LOGO_IMAGE_URL,
        type: "image/png",
        sizes: "512x512",
      },
    ],
  },
  openGraph: {
    title: "Criminals System",
    description:
      "Sistema oficial de gerenciamento para a organização Criminals RP.",
    url: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
    siteName: "Criminals System",
    images: [
      {
        url: LOGO_IMAGE_URL,
        width: 512,
        height: 512,
        alt: "Logo Criminals System",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Criminals System · Painel de Gestão RP",
    description:
      "Sistema oficial de gerenciamento para a organização Criminals RP.",
    images: [LOGO_IMAGE_URL],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body suppressHydrationWarning>
        <QueryProvider>{children}</QueryProvider>
        <Toaster
          theme="dark"
          richColors
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
            },
          }}
        />
      </body>
    </html>
  );
}
