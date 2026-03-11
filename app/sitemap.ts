import { MetadataRoute } from 'next'
import { getCanonicalUrl } from '@/app/seoConfig'

export default function sitemap(): MetadataRoute.Sitemap {
    const currentDate = process.env.NEXT_PUBLIC_SITEMAP_LASTMOD
        ? new Date(process.env.NEXT_PUBLIC_SITEMAP_LASTMOD)
        : new Date('2026-02-07T00:00:00.000Z')
    
    return [
        {
            url: getCanonicalUrl('/'),
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: getCanonicalUrl('/ai-marketing-platform'),
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: getCanonicalUrl('/ai-video-ads-generator'),
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: getCanonicalUrl('/marketing-for-small-business'),
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: getCanonicalUrl('/showcase'),
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: getCanonicalUrl('/how-it-works'),
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: getCanonicalUrl('/about'),
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: getCanonicalUrl('/privacy'),
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
        {
            url: getCanonicalUrl('/terms'),
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
    ]
}
