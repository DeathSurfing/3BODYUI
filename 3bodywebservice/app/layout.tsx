import "./globals.css"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
})

export const metadata: Metadata = {
  title: "3-BODY PAYMENT PROTOCOL"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${mono.variable} bg-black text-white overflow-hidden`}
      >
        {children}
      </body>
    </html>
  )
}
