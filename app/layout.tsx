import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Syne } from 'next/font/google'
import './globals.css'

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app'

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Predi AI | AI Marketing Generator & Automation OS',
        template: '%s | Predi AI'
    },
    description: 'The AI-native marketing OS that turns your brand assets into high-converting UGC, viral Reels, and performance ads for TikTok, Instagram, and beyond in seconds. Powered by Gemini 3 Pro.',
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
        title: 'Predi AI | AI Marketing Generator & Automation OS',
        description: 'The AI-native marketing OS that turns your brand assets into high-converting UGC, viral Reels, and performance ads in seconds.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Predi AI - Marketing on Autopilot',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Predi AI | AI Marketing Generator & Automation OS',
        description: 'The AI-native marketing OS that turns your brand assets into high-converting UGC, viral Reels, and performance ads in seconds.',
        images: ['/og-image.png'],
        creator: '@prediai',
        site: '@prediai',
    },
    alternates: {
        canonical: siteUrl,
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
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            ratingCount: '10000',
            bestRating: '5',
            worstRating: '1',
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
        screenshot: `${siteUrl}/og-image.png`,
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

    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: 'What is Predi AI?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Predi AI is an AI-native marketing OS that automatically generates high-converting UGC, viral Reels, and performance ads for platforms like TikTok and Instagram using advanced AI models like Gemini 3 Pro and Veo 3.1.'
                }
            },
            {
                '@type': 'Question',
                name: 'How does Predi AI create marketing content?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Predi AI uses your brand assets, company information, and campaign briefs to automatically generate optimized marketing content including images, videos, carousels, and ad copy tailored for each platform.'
                }
            },
            {
                '@type': 'Question',
                name: 'What platforms does Predi AI support?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Predi AI generates content optimized for TikTok, Instagram Reels, Facebook, YouTube Shorts, and other major social media and advertising platforms.'
                }
            },
            {
                '@type': 'Question',
                name: 'Is Predi AI free to use?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes, Predi AI offers a free tier that allows you to start creating AI-powered marketing content immediately. Premium features are available for power users.'
                }
            }
        ]
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
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
                />
            </head>
            <body className={`${spaceGrotesk.variable} ${syne.variable} font-sans`}>{children}</body>
        </html>
    )
}
