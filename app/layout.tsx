import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Space_Grotesk, Syne } from 'next/font/google'
import './globals.css'
import ToastProvider from '@/components/Toast'
import { DEFAULT_SOCIAL_IMAGE, SITE_URL } from '@/app/seoConfig'

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

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

const siteUrl = SITE_URL
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'c6ippGeHmi8FWQsc-ClDfZ-ZZnks_pLQWB9EKIu6BrA'
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
const yandexVerification = process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-RFRC5MQFSL'

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Predi AI | Your #1 AI Chief Marketing Officer',
        template: '%s | Predi AI'
    },
    description: 'Your #1 AI Chief Marketing Officer. All you need is a link and a logo. Predi does the rest in seconds. From empty marketing calendar to high-converting on-brand campaigns created by your AI Agent.',
    keywords: [
        'AI marketing',
        'AI content generator',
        'UGC creator',
        'AI video generator',
        'marketing automation',
        'social media AI',
        'TikTok ads',
        'Instagram Reels',
        'performance marketing',
        'AI advertising',
        'content creation AI',
        'marketing OS',
        'Gemini AI',
        'AI for marketers',
        'automated content creation',
        'brand marketing AI'
    ],
    authors: [{ name: 'Predi AI' }],
    creator: 'Predi AI',
    publisher: 'Predi AI',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: siteUrl,
        siteName: 'Predi AI',
        title: 'Predi AI | Your #1 AI Chief Marketing Officer',
        description: 'All you need is a link and a logo. Predi does the rest in seconds. From empty marketing calendar to high-converting on-brand campaigns created by your AI Agent.',
        images: [
            {
                url: DEFAULT_SOCIAL_IMAGE,
                width: 1200,
                height: 630,
                alt: 'Predi AI - Marketing on Autopilot',
                type: 'image/jpeg',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Predi AI | Your #1 AI Chief Marketing Officer',
        description: 'All you need is a link and a logo. Predi does the rest in seconds. From empty marketing calendar to high-converting on-brand campaigns created by your AI Agent.',
        images: [DEFAULT_SOCIAL_IMAGE],
        creator: '@prediai',
        site: '@prediai',
    },
    alternates: {
        canonical: siteUrl,
    },
    verification: {
        google: googleVerification,
        yandex: yandexVerification,
        other: bingVerification ? { 'msvalidate.01': bingVerification } : undefined,
    },
    category: 'technology',
    classification: 'Business Software',
    other: {
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'black-translucent',
        'format-detection': 'telephone=no',
        'msapplication-TileColor': '#000000',
        'theme-color': '#000000',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Predi AI',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'The AI-native marketing OS that turns your brand assets into high-converting UGC, viral Reels, and performance ads for TikTok, Instagram, and beyond in seconds.',
        url: siteUrl,
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
        },
        featureList: [
            'AI-powered UGC generation',
            'Viral Reels creation',
            'Performance ad automation',
            'TikTok content optimization',
            'Instagram marketing automation',
            'Brand asset management',
            'AI video generation with Veo 3.1',
            'Gemini 3 Pro integration'
        ],
        screenshot: `${siteUrl}${DEFAULT_SOCIAL_IMAGE}`,
        softwareVersion: '2.0',
        author: {
            '@type': 'Organization',
            name: 'Predi AI',
            url: siteUrl,
        },
    }

    const organizationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Predi AI',
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        description: 'AI-native marketing automation platform',
        sameAs: [
            'https://twitter.com/prediai',
            'https://linkedin.com/company/prediai',
            'https://instagram.com/prediai'
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            availableLanguage: 'English',
        },
    }

    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href="/icon.svg" type="image/svg+xml" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="manifest" href="/manifest.json" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
                />
            </head>
            <body className={`${spaceGrotesk.variable} ${syne.variable} font-sans`}>
                <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
                <Script id="ga-config" strategy="afterInteractive">
                    {`
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${gaMeasurementId}');
                    `}
                </Script>
                <ToastProvider>{children}</ToastProvider>
            </body>
        </html>
    )
}
