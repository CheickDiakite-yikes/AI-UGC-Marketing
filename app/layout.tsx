import type { Metadata } from 'next'
import { Space_Grotesk, Syne } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
})

const syne = Syne({
    subsets: ['latin'],
    variable: '--font-display',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'Predi AI | AI Marketing Generator & Automation OS',
    description: 'The autonomous marketing OS powered by Gemini 3 Pro and Veo 3.1.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={`${spaceGrotesk.variable} ${syne.variable} font-sans`}>{children}</body>
        </html>
    )
}
