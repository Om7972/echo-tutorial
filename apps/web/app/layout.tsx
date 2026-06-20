import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { LogsPanel } from "@/components/logs-panel"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <ClerkProvider>
          <Providers>
            {children}
          </Providers>
        </ClerkProvider>

        {/* Dev-only in-app logs viewer — removed from production builds */}
        {process.env.NODE_ENV !== "production" && <LogsPanel />}
      </body>
    </html>
  )
}
