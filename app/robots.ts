import { MetadataRoute } from 'next'
import { SITE_URL } from '@/app/seoConfig'

export default function robots(): MetadataRoute.Robots {
    const siteUrl = SITE_URL
    
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/private/', '/login', '/signup', '/profile', '/profile/'],
            },
            {
                userAgent: 'GPTBot',
                allow: '/',
            },
            {
                userAgent: 'ChatGPT-User',
                allow: '/',
            },
            {
                userAgent: 'Google-Extended',
                allow: '/',
            },
            {
                userAgent: 'Anthropic-AI',
                allow: '/',
            },
            {
                userAgent: 'Claude-Web',
                allow: '/',
            },
            {
                userAgent: 'PerplexityBot',
                allow: '/',
            },
            {
                userAgent: 'Bytespider',
                allow: '/',
            },
            {
                userAgent: 'CCBot',
                allow: '/',
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    }
}
