const DEFAULT_SITE_URL = 'https://prediai.replit.app';
export const DEFAULT_SOCIAL_IMAGE = '/og-image.jpeg';

const normalizeSiteUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
};

const deriveSiteUrl = () => {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.REPLIT_DEV_DOMAIN,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeSiteUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return DEFAULT_SITE_URL;
};

export const SITE_URL = deriveSiteUrl();

export const getCanonicalUrl = (path = '/') => {
  if (!path || path === '/') {
    return SITE_URL;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};
