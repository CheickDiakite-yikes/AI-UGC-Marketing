import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getFavoritesByBoardAction } from '@/app/actions/favoriteActions';
import { getProfileLibrary, uploadProfileAssetAction, deleteProfileAssetAction, createProfileProductAction, deleteProfileProductAction, addProfileProductAssetAction } from '@/app/actions/profileLibraryActions';
import { getUserProfile, updateProfileBasics, updateUserPassword, updateUserProfile } from '@/app/actions/userActions';

type ProfilePageProps = {
  searchParams?: {
    updated?: string;
    error?: string;
  };
};

type Banner = {
  tone: 'success' | 'error';
  message: string;
} | null;

const getBanner = (searchParams?: ProfilePageProps['searchParams']): Banner => {
  const error = searchParams?.error;
  const updated = searchParams?.updated;

  const errorMessages: Record<string, string> = {
    missing_name: 'Please enter a name before saving your profile.',
    missing_password_fields: 'Please fill out all password fields.',
    password_mismatch: 'New password and confirmation do not match.',
    weak_password: 'New password must be at least 8 characters long.',
    invalid_current_password: 'Current password is incorrect.',
    missing_password: 'Password data is missing for this account.',
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
  };

  if (error) {
    return {
      tone: 'error',
      message: errorMessages[error] || 'Something went wrong. Please try again.',
    };
  }

  const updatedMessages: Record<string, string> = {
    profile: 'Profile updated successfully.',
    password: 'Password updated successfully.',
    basics: 'Brand basics saved.',
    library: 'Library updated.',
    product: 'Product catalog updated.',
    product_assets: 'Product assets updated.',
  };

  if (updated) {
    return {
      tone: 'success',
      message: updatedMessages[updated] || 'Changes saved.',
    };
  }

  return null;
};

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

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const profile = await getUserProfile();
  if (!profile) {
    redirect('/login');
  }

  const library = await getProfileLibrary();
  const favoritesByBoard = await getFavoritesByBoardAction();

  const banner = getBanner(searchParams);
  const initials = getInitials(profile.name, profile.email);
  const assets = library?.assets ?? [];
  const products = library?.products ?? [];
  const nonProductAssets = assets.filter(asset => asset.category !== 'product');
  const logoAssets = nonProductAssets.filter(asset => asset.type === 'logo');
  const deckAssets = nonProductAssets.filter(asset => asset.type === 'pdf');
  const avatarAssets = nonProductAssets.filter(asset => asset.type === 'avatar');
  const imageAssets = nonProductAssets.filter(asset => asset.type === 'image');

  return (
    <div className="min-h-screen bg-neo-yellow text-black">
      <header className="sticky top-0 z-20 border-b-4 border-black bg-neo-yellow/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-display font-black text-lg border-2 border-black">
              P
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Profile</p>
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

      <main className="max-w-6xl mx-auto px-6 py-10">
        {banner && (
          <div
            className={`mb-6 border-2 border-black px-4 py-3 font-bold text-sm ${
              banner.tone === 'success' ? 'bg-neo-lime text-black' : 'bg-neo-pink text-black'
            }`}
          >
            {banner.message}
          </div>
        )}

        <section className="bg-white border-4 border-black shadow-neo p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-20 h-20 rounded-full border-4 border-black bg-neo-lime flex items-center justify-center font-display font-black text-2xl overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-display font-black">Account Profile</h1>
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
              Profile Hub
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-white border-4 border-black shadow-neo p-6">
            <h2 className="font-display font-black text-xl mb-4">Account Details</h2>
            <form action={updateUserProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={profile.name || ''}
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Company</label>
                <input
                  type="text"
                  name="company"
                  defaultValue={profile.company || ''}
                  placeholder="Predi AI"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Role</label>
                <input
                  type="text"
                  name="jobTitle"
                  defaultValue={profile.jobTitle || ''}
                  placeholder="Marketing Lead"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Email (Read Only)</label>
                <input
                  type="email"
                  defaultValue={profile.email || ''}
                  disabled
                  className="w-full border-2 border-black p-3 font-bold bg-gray-100 text-gray-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white border-2 border-black py-3 font-bold uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-all"
              >
                Update Profile
              </button>
            </form>
          </section>

          <section className="bg-white border-4 border-black shadow-neo p-6">
            <h2 className="font-display font-black text-xl mb-4">Security</h2>
            <form action={updateUserPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-cyan/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-cyan/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-cyan/10"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white border-2 border-black py-3 font-bold uppercase tracking-widest hover:bg-neo-cyan hover:text-black transition-all"
              >
                Update Password
              </button>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                Use at least 8 characters.
              </p>
            </form>
          </section>
        </div>

        <section className="bg-white border-4 border-black shadow-neo p-6 mt-8">
          <h2 className="font-display font-black text-xl mb-4">Brand Basics</h2>
          <form action={updateProfileBasics} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Website</label>
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
                defaultValue={profile.overview || ''}
                placeholder="Describe your company in a few sentences."
                className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-lime/20"
              />
            </div>
            <button
              type="submit"
              className="bg-black text-white border-2 border-black px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-lime hover:text-black transition-all"
            >
              Save Brand Basics
            </button>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              These fields can be imported into new boards.
            </p>
          </form>
        </section>

        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          <section className="bg-white border-4 border-black shadow-neo p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-black text-xl">Favorites</h2>
              <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                {favoritesByBoard.length} Boards
              </span>
            </div>
            {favoritesByBoard.length === 0 ? (
              <div className="mt-4 border-2 border-dashed border-black/30 p-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                No favorites yet
              </div>
            ) : (
              <div className="space-y-4">
                {favoritesByBoard.map(board => (
                  <div key={board.boardId} className="border-2 border-black bg-gray-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold truncate">{board.boardName}</h3>
                      <span className="text-[10px] uppercase font-bold text-gray-500">{board.items.length} items</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {board.items.map(item => (
                        <div key={item.id} className="border-2 border-black bg-white overflow-hidden">
                          {item.previewUrl ? (
                            item.type === 'video' ? (
                              <video
                                src={item.previewUrl}
                                className="w-full h-24 object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img src={item.previewUrl} alt={item.title} className="w-full h-24 object-cover" />
                            )
                          ) : (
                            <div className="h-24 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              No preview
                            </div>
                          )}
                          <div className="border-t-2 border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest truncate">
                            {item.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border-4 border-black shadow-neo p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-black text-xl">Subscriptions and Billing</h2>
              <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                Stripe Soon
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Manage plans, payment methods, and cancellations here. Stripe integration is planned for this section.
            </p>
            <div className="mt-4 border-2 border-black p-4 text-xs font-bold uppercase tracking-widest text-gray-500">
              Billing controls coming soon
            </div>
          </section>
        </div>

        <section className="bg-white border-4 border-black shadow-neo p-6 mt-8">
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

        <section className="bg-white border-4 border-black shadow-neo p-6 mt-8">
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
      </main>
    </div>
  );
}
