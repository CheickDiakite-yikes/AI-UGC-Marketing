import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserProfile, updateProfileBasics, updateBrandContext, addBrandColor, removeBrandColor, addBrandFont, removeBrandFont, addBrandFeel, removeBrandFeel, addSocialLink, removeSocialLink, updateBrandLogo } from '@/app/actions/userActions';
import { getProfileLibrary, uploadProfileAssetAction, deleteProfileAssetAction, createProfileProductAction, deleteProfileProductAction, addProfileProductAssetAction } from '@/app/actions/profileLibraryActions';

const getInitials = (name?: string | null, email?: string | null) => {
  const safeName = name?.trim();
  if (safeName) {
    const parts = safeName.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('');
    return initials || '?';
  }
  if (email && email.length > 0) {
    return email[0].toUpperCase();
  }
  return '?';
};

const PRODUCT_TYPES = [
  { value: 'physical_product', label: 'Physical Product' },
  { value: 'software', label: 'Software' },
  { value: 'service', label: 'Service' },
  { value: 'digital_product', label: 'Digital Product' },
  { value: 'hardware', label: 'Hardware' },
];

const PRODUCT_ASSET_ROLES = [
  { value: 'hero', label: 'Hero' },
  { value: 'product_shot', label: 'Product Shot' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'mockup', label: 'Mockup' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'in_use', label: 'In Use' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'logo', label: 'Logo' },
  { value: 'ui', label: 'UI' },
  { value: 'other', label: 'Other' },
];

type CompanyPageProps = {
  searchParams?: Promise<{
    updated?: string;
    error?: string;
  }>;
};

type Banner = {
  tone: 'success' | 'error';
  message: string;
} | null;

const getBanner = (searchParamsData?: { updated?: string; error?: string }): Banner => {
  const error = searchParamsData?.error;
  const updated = searchParamsData?.updated;

  const errorMessages: Record<string, string> = {
    invalid_website: 'Website URL must include http:// or https://.',
    missing_file: 'Please choose a file to upload.',
    invalid_pdf: 'Please upload a valid PDF file.',
    invalid_image: 'Please upload a supported image file.',
    upload_failed: 'Upload failed. Please try again.',
    missing_asset: 'Asset could not be found.',
    asset_not_found: 'Asset could not be found.',
    missing_product_name: 'Please add a product name.',
    missing_product: 'Select a product before continuing.',
    product_not_found: 'Product could not be found.',
    invalid_product_asset: 'Product assets must be image files.',
    invalid_color: 'Please enter a valid color.',
    invalid_font: 'Please enter a valid font name.',
    invalid_social_link: 'Please enter both platform and URL.',
  };

  if (error) {
    return {
      tone: 'error',
      message: errorMessages[error] || 'Something went wrong. Please try again.',
    };
  }

  const updatedMessages: Record<string, string> = {
    basics: 'Brand basics saved.',
    library: 'Library updated.',
    product: 'Product catalog updated.',
    product_assets: 'Product assets updated.',
    brand_context: 'Brand context saved.',
  };

  if (updated) {
    return {
      tone: 'success',
      message: updatedMessages[updated] || 'Changes saved.',
    };
  }

  return null;
};

export default async function CompanyPage({ searchParams }: CompanyPageProps) {
  const profile = await getUserProfile();
  if (!profile) {
    redirect('/login');
  }

  const library = await getProfileLibrary();
  const searchParamsData = searchParams ? await searchParams : undefined;
  const banner = getBanner(searchParamsData);
  const initials = getInitials(profile.name, profile.email);
  const assets = library?.assets ?? [];
  const products = library?.products ?? [];

  const nonProductAssets = assets.filter(asset => asset.category !== 'product');
  const logoAssets = nonProductAssets.filter(asset => asset.type === 'logo');
  const deckAssets = nonProductAssets.filter(asset => asset.type === 'pdf');
  const avatarAssets = nonProductAssets.filter(asset => asset.type === 'avatar');
  const imageAssets = nonProductAssets.filter(asset => asset.type === 'image');
  const docAssets = assets.filter(asset => asset.type === 'pdf' || asset.type === 'text' || asset.type === 'link');

  return (
    <div className="min-h-screen bg-neo-yellow text-black">
      <header className="sticky top-0 z-20 border-b-4 border-black bg-neo-yellow/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-display font-black text-lg border-2 border-black">
              P
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Company</p>
              <p className="font-display font-black text-lg leading-none">Predi AI</p>
            </div>
          </div>
          <Link
            href="/"
            className="bg-white border-2 border-black shadow-neo-sm px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
          >
            Back to Workspace
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {banner && (
          <div
            className={`border-2 border-black px-4 py-3 font-bold text-sm ${
              banner.tone === 'success' ? 'bg-neo-lime text-black' : 'bg-neo-pink text-black'
            }`}
          >
            {banner.message}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href="/profile"
            className="bg-white text-black border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-yellow transition-all"
          >
            Profile
          </Link>
          <Link
            href="/profile/dashboard"
            className="bg-white text-black border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-yellow transition-all"
          >
            Dashboard
          </Link>
          <Link
            href="/profile/company"
            className="bg-black text-white border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest"
          >
            Company
          </Link>
        </div>

        <section className="bg-white border-4 border-black shadow-neo p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-20 h-20 rounded-full border-4 border-black bg-neo-lime flex items-center justify-center font-display font-black text-2xl overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-display font-black">Company Hub</h1>
              <p className="text-sm font-bold text-gray-600 mt-1">{profile.email || 'Email not set'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="bg-neo-lime border-2 border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                  {profile.company || 'Add company'}
                </span>
                <span className="bg-neo-pink border-2 border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                  {profile.jobTitle || 'Add role'}
                </span>
              </div>
            </div>
            <div className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-2 border-black">
              Company Hub
            </div>
          </div>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl">Brand Basics</h2>
            {profile.brandContext?.autoDetected && (
              <span className="bg-neo-lime border-2 border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 bg-black rounded-full" />
                Auto-detected
              </span>
            )}
          </div>

          <div className="mb-6 pb-6 border-b-2 border-dashed border-gray-300">
            <label className="text-xs font-bold uppercase tracking-widest block mb-3">
              Brand Logo
            </label>
            <div className="flex items-start gap-4">
              <div className="w-[100px] h-[100px] border-3 border-black bg-gray-50 flex items-center justify-center overflow-hidden">
                {profile.brandContext?.logoUrl ? (
                  <img 
                    src={profile.brandContext.logoUrl} 
                    alt="Brand Logo" 
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <span className="text-2xl">📷</span>
                    <p className="text-[8px] text-gray-500 mt-1">No logo</p>
                  </div>
                )}
              </div>
              <form action={updateBrandLogo} className="flex flex-col gap-2">
                <input
                  type="file"
                  name="logo"
                  accept="image/*"
                  className="text-xs file:mr-2 file:py-2 file:px-3 file:border-2 file:border-black file:bg-neo-pink file:text-black file:font-bold file:uppercase file:tracking-widest file:text-xs file:cursor-pointer hover:file:bg-black hover:file:text-white"
                />
                <button
                  type="submit"
                  className="bg-neo-pink border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all w-fit"
                >
                  Upload Logo
                </button>
                <p className="text-[10px] text-gray-500">
                  Logo colors will be extracted automatically
                </p>
              </form>
            </div>
          </div>

          <form action={updateBrandContext} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  Company Name
                  {profile.brandContext?.autoDetected && profile.brandContext?.companyName && (
                    <span className="text-[9px] bg-neo-lime/50 px-1">auto</span>
                  )}
                </label>
                <input
                  type="text"
                  name="company"
                  defaultValue={profile.company || profile.brandContext?.companyName || ''}
                  placeholder="Your company name"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  Tagline
                  {profile.brandContext?.autoDetected && profile.brandContext?.tagline && (
                    <span className="text-[9px] bg-neo-lime/50 px-1">auto</span>
                  )}
                </label>
                <input
                  type="text"
                  name="tagline"
                  defaultValue={profile.brandContext?.tagline || ''}
                  placeholder="Your catchy tagline"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  Industry
                  {profile.brandContext?.autoDetected && profile.brandContext?.industry && (
                    <span className="text-[9px] bg-neo-lime/50 px-1">auto</span>
                  )}
                </label>
                <input
                  type="text"
                  name="industry"
                  defaultValue={profile.brandContext?.industry || ''}
                  placeholder="e.g., SaaS, E-commerce, Healthcare"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  Target Audience
                  {profile.brandContext?.autoDetected && profile.brandContext?.targetAudience && (
                    <span className="text-[9px] bg-neo-lime/50 px-1">auto</span>
                  )}
                </label>
                <input
                  type="text"
                  name="targetAudience"
                  defaultValue={profile.brandContext?.targetAudience || ''}
                  placeholder="Who are your ideal customers?"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  Contact Email
                  {profile.brandContext?.autoDetected && profile.brandContext?.contactEmail && (
                    <span className="text-[9px] bg-neo-lime/50 px-1">auto</span>
                  )}
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  defaultValue={profile.brandContext?.contactEmail || ''}
                  placeholder="hello@company.com"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  Founded Year
                  {profile.brandContext?.autoDetected && profile.brandContext?.foundedYear && (
                    <span className="text-[9px] bg-neo-lime/50 px-1">auto</span>
                  )}
                </label>
                <input
                  type="text"
                  name="foundedYear"
                  defaultValue={profile.brandContext?.foundedYear || ''}
                  placeholder="e.g., 2020"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  Team Size
                  {profile.brandContext?.autoDetected && profile.brandContext?.teamSize && (
                    <span className="text-[9px] bg-neo-lime/50 px-1">auto</span>
                  )}
                </label>
                <input
                  type="text"
                  name="teamSize"
                  defaultValue={profile.brandContext?.teamSize || ''}
                  placeholder="e.g., 1-10, 50+"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                Mission Statement
                {profile.brandContext?.autoDetected && profile.brandContext?.missionStatement && (
                  <span className="text-[9px] bg-neo-lime/50 px-1">auto</span>
                )}
              </label>
              <textarea
                name="missionStatement"
                rows={3}
                defaultValue={profile.brandContext?.missionStatement || ''}
                placeholder="What drives your company? What's your purpose?"
                className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
              />
            </div>

            <button
              type="submit"
              className="bg-black text-white border-2 border-black px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-lime hover:text-black transition-all"
            >
              Save Brand Context
            </button>
          </form>

          <div className="border-t-2 border-black mt-6 pt-6">
            <form action={updateProfileBasics} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Website URL</label>
                <input
                  type="url"
                  name="websiteUrl"
                  defaultValue={profile.websiteUrl || ''}
                  placeholder="https://yourcompany.com"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Overview Paragraph</label>
                <textarea
                  name="overview"
                  rows={4}
                  defaultValue={profile.overview || profile.brandContext?.description || ''}
                  placeholder="Describe your company in a few sentences."
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
                />
              </div>
              <button
                type="submit"
                className="bg-white text-black border-2 border-black px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-lime transition-all"
              >
                Save Website & Overview
              </button>
            </form>
          </div>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <h2 className="font-display font-black text-xl mb-4">Brand Colors</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {(profile.brandContext?.brandColors || []).length === 0 ? (
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No brand colors set</p>
            ) : (
              (profile.brandContext?.brandColors || []).map((color, idx) => (
                <div key={idx} className="flex items-center gap-2 border-2 border-black bg-gray-50 px-3 py-2">
                  <div
                    className="w-6 h-6 border-2 border-black"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-bold uppercase">{color}</span>
                  <form action={removeBrandColor}>
                    <input type="hidden" name="color" value={color} />
                    <button type="submit" className="text-red-500 hover:text-black text-xs font-bold">×</button>
                  </form>
                </div>
              ))
            )}
          </div>
          <form action={addBrandColor} className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Add Color (hex)</label>
              <input
                type="text"
                name="color"
                placeholder="#FF5500"
                className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/20"
              />
            </div>
            <button
              type="submit"
              className="bg-black text-white border-2 border-black px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-all"
            >
              Add
            </button>
          </form>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <h2 className="font-display font-black text-xl mb-4">Brand Fonts</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {(profile.brandContext?.fonts || []).length === 0 ? (
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No brand fonts set</p>
            ) : (
              (profile.brandContext?.fonts || []).map((font, idx) => (
                <div key={idx} className="flex items-center gap-2 border-2 border-black bg-gray-50 px-3 py-2">
                  <span className="text-xs font-bold">{font}</span>
                  <form action={removeBrandFont}>
                    <input type="hidden" name="font" value={font} />
                    <button type="submit" className="text-red-500 hover:text-black text-xs font-bold">×</button>
                  </form>
                </div>
              ))
            )}
          </div>
          <form action={addBrandFont} className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Add Font</label>
              <input
                type="text"
                name="font"
                placeholder="Montserrat"
                className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/20"
              />
            </div>
            <button
              type="submit"
              className="bg-black text-white border-2 border-black px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-all"
            >
              Add
            </button>
          </form>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <h2 className="font-display font-black text-xl mb-4">Brand Feel</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {(profile.brandContext?.brandFeel || []).length === 0 ? (
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No brand feel set</p>
            ) : (
              (profile.brandContext?.brandFeel || []).map((feel, idx) => (
                <div key={idx} className="flex items-center gap-2 border-2 border-black bg-neo-lime px-3 py-2">
                  <span className="text-xs font-bold">{feel}</span>
                  <form action={removeBrandFeel}>
                    <input type="hidden" name="feel" value={feel} />
                    <button type="submit" className="text-red-500 hover:text-black text-xs font-bold">×</button>
                  </form>
                </div>
              ))
            )}
          </div>
          <form action={addBrandFeel} className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Add Descriptor</label>
              <input
                type="text"
                name="feel"
                placeholder="e.g., modern, professional, elegant"
                className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
              />
            </div>
            <button
              type="submit"
              className="bg-neo-lime border-2 border-black px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
            >
              Add
            </button>
          </form>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <h2 className="font-display font-black text-xl mb-4">Social Links</h2>
          <div className="space-y-2 mb-4">
            {(profile.brandContext?.socialLinks || []).length === 0 ? (
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No social links set</p>
            ) : (
              (profile.brandContext?.socialLinks || []).map((link, idx) => (
                <div key={idx} className="flex items-center gap-3 border-2 border-black bg-gray-50 px-3 py-2">
                  <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase">{link.platform}</span>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline truncate flex-1">
                    {link.url}
                  </a>
                  <form action={removeSocialLink}>
                    <input type="hidden" name="index" value={idx} />
                    <button type="submit" className="text-red-500 hover:text-black text-xs font-bold">Remove</button>
                  </form>
                </div>
              ))
            )}
          </div>
          <form action={addSocialLink} className="grid gap-2 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Platform</label>
              <select
                name="platform"
                className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-cyan/20"
              >
                <option value="Twitter">Twitter</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-xs font-bold uppercase tracking-widest">URL</label>
              <input
                type="url"
                name="url"
                placeholder="https://twitter.com/yourcompany"
                className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-cyan/20"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-black text-white border-2 border-black px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neo-cyan hover:text-black transition-all"
              >
                Add Link
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl">Brand Identity</h2>
            <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
              {logoAssets.length + avatarAssets.length} Assets
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border-2 border-black bg-gray-50 p-4 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Logos</p>
                <p className="text-[11px] text-gray-600">Primary and alternate logos.</p>
              </div>
              <form action={uploadProfileAssetAction} encType="multipart/form-data" className="space-y-2">
                <input type="hidden" name="assetType" value="logo" />
                <input type="hidden" name="category" value="logo" />
                <input type="file" name="file" accept="image/*" className="text-xs font-bold" required />
                <button type="submit" className="w-full bg-black text-white border-2 border-black py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-lime hover:text-black transition-all">
                  Upload Logo
                </button>
              </form>
              <div className="space-y-2">
                {logoAssets.length === 0 ? (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No logos yet</p>
                ) : (
                  logoAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-2 border-2 border-black bg-white p-2">
                      {asset.previewUrl ? (
                        <img src={asset.previewUrl} alt={asset.name} className="w-10 h-10 border-2 border-black object-cover" />
                      ) : (
                        <div className="w-10 h-10 border-2 border-black bg-gray-200 flex items-center justify-center text-[9px] font-bold">
                          LOGO
                        </div>
                      )}
                      <span className="text-xs font-bold truncate">{asset.name}</span>
                      <form action={deleteProfileAssetAction} className="ml-auto">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <button className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-black">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-2 border-black bg-gray-50 p-4 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Avatar Library</p>
                <p className="text-[11px] text-gray-600">Spokespeople and persona shots.</p>
              </div>
              <form action={uploadProfileAssetAction} encType="multipart/form-data" className="space-y-2">
                <input type="hidden" name="assetType" value="avatar" />
                <input type="hidden" name="category" value="avatar" />
                <input type="file" name="file" accept="image/*" className="text-xs font-bold" required />
                <button type="submit" className="w-full bg-black text-white border-2 border-black py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-lime hover:text-black transition-all">
                  Upload Avatar
                </button>
              </form>
              <div className="space-y-2">
                {avatarAssets.length === 0 ? (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No avatars yet</p>
                ) : (
                  avatarAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-2 border-2 border-black bg-white p-2">
                      {asset.previewUrl ? (
                        <img src={asset.previewUrl} alt={asset.name} className="w-10 h-10 border-2 border-black object-cover" />
                      ) : (
                        <div className="w-10 h-10 border-2 border-black bg-gray-200 flex items-center justify-center text-[9px] font-bold">
                          AVTR
                        </div>
                      )}
                      <span className="text-xs font-bold truncate">{asset.name}</span>
                      <form action={deleteProfileAssetAction} className="ml-auto">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <button className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-black">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl">Asset Library</h2>
            <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
              Source of Truth
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Upload assets once and pull them into new boards during creation.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border-2 border-black bg-gray-50 p-4 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Company Decks</p>
                <p className="text-[11px] text-gray-600">PDF decks and one-pagers.</p>
              </div>
              <form action={uploadProfileAssetAction} encType="multipart/form-data" className="space-y-2">
                <input type="hidden" name="assetType" value="pdf" />
                <input type="hidden" name="category" value="company_deck" />
                <input type="file" name="file" accept="application/pdf,.pdf" className="text-xs font-bold" required />
                <button type="submit" className="w-full bg-black text-white border-2 border-black py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-all">
                  Upload Deck
                </button>
              </form>
              <div className="space-y-2">
                {deckAssets.length === 0 ? (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No decks yet</p>
                ) : (
                  deckAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-2 border-2 border-black bg-white p-2">
                      <div className="w-10 h-10 border-2 border-black bg-gray-200 flex items-center justify-center text-[9px] font-bold">
                        PDF
                      </div>
                      <span className="text-xs font-bold truncate">{asset.name}</span>
                      <form action={deleteProfileAssetAction} className="ml-auto">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <button className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-black">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-2 border-black bg-gray-50 p-4 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Brand Images</p>
                <p className="text-[11px] text-gray-600">Approved imagery for campaigns.</p>
              </div>
              <form action={uploadProfileAssetAction} encType="multipart/form-data" className="space-y-2">
                <input type="hidden" name="assetType" value="image" />
                <input type="hidden" name="category" value="brand_image" />
                <input type="file" name="file" accept="image/*" className="text-xs font-bold" required />
                <button type="submit" className="w-full bg-black text-white border-2 border-black py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-cyan hover:text-black transition-all">
                  Upload Image
                </button>
              </form>
              <div className="space-y-2">
                {imageAssets.length === 0 ? (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No brand images yet</p>
                ) : (
                  imageAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-2 border-2 border-black bg-white p-2">
                      {asset.previewUrl ? (
                        <img src={asset.previewUrl} alt={asset.name} className="w-10 h-10 border-2 border-black object-cover" />
                      ) : (
                        <div className="w-10 h-10 border-2 border-black bg-gray-200 flex items-center justify-center text-[9px] font-bold">
                          IMG
                        </div>
                      )}
                      <span className="text-xs font-bold truncate">{asset.name}</span>
                      <form action={deleteProfileAssetAction} className="ml-auto">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <button className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-black">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl">Product Catalog</h2>
            <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
              Profile Products
            </span>
          </div>
          <form action={createProfileProductAction} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-widest">Product Name</label>
              <input
                name="name"
                required
                placeholder="New product name"
                className="mt-2 w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-widest">Type</label>
              <select
                name="productType"
                className="mt-2 w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
                defaultValue="physical_product"
              >
                {PRODUCT_TYPES.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold uppercase tracking-widest">Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Short product summary"
                className="mt-2 w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                className="bg-black text-white border-2 border-black px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-all"
              >
                Add Product
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            {products.length === 0 ? (
              <div className="border-2 border-dashed border-black/30 p-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                No products yet
              </div>
            ) : (
              products.map(product => (
                <div key={product.id} className="border-2 border-black bg-gray-50 p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{product.name}</h3>
                      <p className="text-[10px] uppercase font-bold text-gray-500">{product.productType.replace('_', ' ')}</p>
                      {product.description && (
                        <p className="text-xs text-gray-600 mt-2">{product.description}</p>
                      )}
                    </div>
                    <form action={deleteProfileProductAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <button className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-black">
                        Delete Product
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(product.assets || []).length === 0 ? (
                      <div className="col-span-full text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        No product assets yet
                      </div>
                    ) : (
                      (product.assets || []).map(asset => (
                        <div key={asset.id} className="border-2 border-black bg-white overflow-hidden">
                          {asset.previewUrl ? (
                            <img src={asset.previewUrl} alt={product.name} className="w-full h-20 object-cover" />
                          ) : (
                            <div className="h-20 flex items-center justify-center text-[9px] font-bold">IMG</div>
                          )}
                          <div className="border-t-2 border-black px-2 py-1 text-[9px] font-bold uppercase tracking-widest flex items-center justify-between">
                            <span className="truncate">{asset.role.replace('_', ' ')}</span>
                            <form action={deleteProfileAssetAction}>
                              <input type="hidden" name="assetId" value={asset.assetId} />
                              <button className="text-[9px] font-bold uppercase tracking-widest text-red-500 hover:text-black">
                                Remove
                              </button>
                            </form>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form action={addProfileProductAssetAction} encType="multipart/form-data" className="mt-4 space-y-2">
                    <input type="hidden" name="profileProductId" value={product.id} />
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="md:col-span-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest">Role</label>
                        <select
                          name="role"
                          className="mt-1 w-full border-2 border-black p-2 text-xs font-bold bg-white"
                          defaultValue="hero"
                        >
                          {PRODUCT_ASSET_ROLES.map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest">Product Image</label>
                        <input type="file" name="file" accept="image/*" className="mt-1 w-full text-xs font-bold" required />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="bg-black text-white border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-cyan hover:text-black transition-all"
                    >
                      Add Product Image
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl">Sources & Docs</h2>
            <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
              {docAssets.length} Doc{docAssets.length !== 1 ? 's' : ''}
            </span>
          </div>
          {docAssets.length === 0 ? (
            <div className="border-2 border-dashed border-black/30 p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docAssets.map(asset => (
                <div key={asset.id} className="border-2 border-black p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neo-lime border-2 border-black flex items-center justify-center text-[10px] font-bold uppercase">
                      {asset.type === 'pdf' ? 'PDF' : asset.type === 'text' ? 'TXT' : 'URL'}
                    </div>
                    <div>
                      <p className="font-bold text-sm truncate max-w-[200px] md:max-w-[400px]">{asset.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{asset.type}</p>
                    </div>
                  </div>
                  {asset.previewUrl && (
                    <a
                      href={asset.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border-2 border-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
