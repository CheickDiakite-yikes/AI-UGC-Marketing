import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getFavoritesByBoardAction } from '@/app/actions/favoriteActions';
import { getOnboardingStateAction, dismissOnboardingAction, resumeOnboardingAction, completeOnboardingAction, resetOnboardingAction } from '@/app/actions/boardActions';
import { getProfileLibrary, uploadProfileAssetAction, deleteProfileAssetAction, createProfileProductAction, deleteProfileProductAction, addProfileProductAssetAction } from '@/app/actions/profileLibraryActions';
import { getUserProfile, updateProfileBasics, updateUserPassword, updateUserProfile } from '@/app/actions/userActions';
import { getSubscriptionStateAction } from '@/app/actions/subscriptionActions';
import BillingControls from '@/components/BillingControls';

type ProfilePageProps = {
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
  const onboardingState = await getOnboardingStateAction();
  const subscriptionState = await getSubscriptionStateAction();
  const favoriteItems = favoritesByBoard.flatMap(board => board.items.map(item => ({
    ...item,
    boardId: board.boardId,
    boardName: board.boardName,
  })));

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
  const surfaceClass = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]';
  const surfaceMutedClass = 'rounded-2xl border border-white/60 bg-white/50 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.1)]';
  const pillClass = 'rounded-full bg-white/70 border border-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600';
  const inputClass = 'w-full rounded-lg border border-black/10 bg-white/80 p-3 text-sm font-semibold text-gray-800 placeholder-gray-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-black/10';
  const inputMutedClass = 'w-full rounded-lg border border-black/10 bg-gray-100 p-3 text-sm font-semibold text-gray-500';
  const buttonPrimary = 'rounded-lg bg-black text-white border border-black px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-gray-900 transition-all';
  const buttonGhost = 'rounded-lg bg-white/70 text-gray-700 border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-white transition-all';
  const buttonQuiet = 'rounded-lg bg-white/60 text-gray-700 border border-white/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest hover:bg-white transition-all';

  return (
    <div className="min-h-screen bg-[#F7F6F0] text-gray-900 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 w-72 h-72 bg-amber-100/60 blur-3xl"></div>
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-rose-100/50 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-100/40 blur-3xl"></div>
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:36px_36px]"></div>
      </div>
      <header className="relative z-20 sticky top-0 border-b border-white/60 bg-white/70 backdrop-blur">
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
            className="rounded-full bg-white/80 border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:bg-white transition-all"
          >
            Back to Workspace
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {banner && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
              banner.tone === 'success' ? 'border-emerald-200 bg-emerald-100 text-emerald-900' : 'border-rose-200 bg-rose-100 text-rose-900'
            }`}
          >
            {banner.message}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/profile"
            className="rounded-full bg-black text-white border border-black px-4 py-2 text-xs font-semibold uppercase tracking-widest"
          >
            Profile
          </Link>
          <Link
            href="/profile/dashboard"
            className="rounded-full bg-white/80 text-gray-700 border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-white transition-all"
          >
            Dashboard
          </Link>
        </div>

        <section className={`${surfaceClass} p-6 md:p-8 mb-8`}>
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-20 h-20 rounded-full border border-white/80 bg-white/80 flex items-center justify-center font-display font-black text-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-display font-black">Account Profile</h1>
              <p className="text-sm font-semibold text-gray-600 mt-1">{profile.email || 'Email not set'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={pillClass}>
                  {profile.company || 'Add company'}
                </span>
                <span className={pillClass}>
                  {profile.jobTitle || 'Add role'}
                </span>
              </div>
            </div>
            <div className={pillClass}>
              Profile Hub
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className={`${surfaceClass} p-6`}>
            <h2 className="font-display font-black text-xl mb-4">Account Details</h2>
            <form action={updateUserProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={profile.name || ''}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Company</label>
                <input
                  type="text"
                  name="company"
                  defaultValue={profile.company || ''}
                  placeholder="Predi AI"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Role</label>
                <input
                  type="text"
                  name="jobTitle"
                  defaultValue={profile.jobTitle || ''}
                  placeholder="Marketing Lead"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Email (Read Only)</label>
                <input
                  type="email"
                  defaultValue={profile.email || ''}
                  disabled
                  className={inputMutedClass}
                />
              </div>
              <button
                type="submit"
                className={`${buttonPrimary} w-full`}
              >
                Update Profile
              </button>
            </form>
          </section>

          <section className={`${surfaceClass} p-6`}>
            <h2 className="font-display font-black text-xl mb-4">Security</h2>
            <form action={updateUserPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                  className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className={`${buttonPrimary} w-full`}
              >
                Update Password
              </button>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                Use at least 8 characters.
              </p>
            </form>
          </section>
        </div>

        <section className={`${surfaceClass} p-6 mt-8`}>
          <h2 className="font-display font-black text-xl mb-4">Brand Basics</h2>
          <form action={updateProfileBasics} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Website</label>
              <input
                type="url"
                name="websiteUrl"
                defaultValue={profile.websiteUrl || ''}
                placeholder="https://yourcompany.com"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Overview Paragraph</label>
              <textarea
                name="overview"
                rows={4}
                defaultValue={profile.overview || ''}
                placeholder="Describe your company in a few sentences."
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className={buttonPrimary}
            >
              Save Brand Basics
            </button>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              These fields can be imported into new boards.
            </p>
          </form>
        </section>

        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          <section className={`${surfaceClass} p-6`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-black text-xl">Favorites</h2>
              <span className={pillClass}>
                {favoriteItems.length} Items
              </span>
            </div>
            {favoriteItems.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-black/20 p-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
                No favorites yet
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {favoriteItems.map(item => (
                  <div key={`${item.boardId}-${item.id}`} className="rounded-xl border border-white/70 bg-white/60 overflow-hidden">
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
                      <div className="h-24 flex items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        No preview
                      </div>
                    )}
                    <div className="border-t border-white/70 px-2 py-1">
                      <div className="text-[10px] font-semibold uppercase tracking-widest truncate">{item.title}</div>
                      <div className="text-[9px] uppercase tracking-widest text-gray-500 truncate">
                        {item.boardName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`${surfaceClass} p-6`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-black text-xl">Subscriptions and Billing</h2>
              <span className={pillClass}>
                Live
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Manage plans, payment methods, and add-on credits.
            </p>
            <div className="mt-4 rounded-xl border border-white/70 bg-white/60 p-4">
              <BillingControls
                planTier={subscriptionState.planTier}
                creditBalance={subscriptionState.creditBalance}
                subscriptionStatus={subscriptionState.subscriptionStatus}
              />
            </div>
          </section>
        </div>

        <section className={`${surfaceClass} p-6 mt-8`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-black text-xl">Onboarding Tutorial</h2>
            <span className={pillClass}>
              {onboardingState.completed ? 'Complete' : (onboardingState.dismissed ? 'Paused' : 'Active')}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Control the guided setup checklist. You can pause it or restart any time.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {!onboardingState.completed && !onboardingState.dismissed && (
              <>
                <form action={dismissOnboardingAction}>
                  <button
                    type="submit"
                    className={buttonQuiet}
                  >
                    Later
                  </button>
                </form>
                <form action={completeOnboardingAction}>
                  <button
                    type="submit"
                    className={buttonGhost}
                  >
                    Skip Tutorial
                  </button>
                </form>
              </>
            )}
            {!onboardingState.completed && onboardingState.dismissed && (
              <form action={resumeOnboardingAction}>
                <button
                  type="submit"
                  className={buttonGhost}
                >
                  Resume Tutorial
                </button>
              </form>
            )}
            {onboardingState.completed && (
              <form action={resetOnboardingAction}>
                <button
                  type="submit"
                  className={buttonGhost}
                >
                  Restart Tutorial
                </button>
              </form>
            )}
          </div>
        </section>

        <section className={`${surfaceClass} p-6 mt-8`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl">Asset Library</h2>
            <span className={pillClass}>
              Source of Truth
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Upload assets once and pull them into new boards during creation.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className={`${surfaceMutedClass} p-4 space-y-3`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Company Decks</p>
                <p className="text-[11px] text-gray-600">PDF decks and one-pagers.</p>
              </div>
              <form action={uploadProfileAssetAction} encType="multipart/form-data" className="space-y-2">
                <input type="hidden" name="assetType" value="pdf" />
                <input type="hidden" name="category" value="company_deck" />
                <input type="file" name="file" accept="application/pdf,.pdf" className="text-xs font-bold" required />
                <button type="submit" className={`${buttonPrimary} w-full`}>
                  Upload Deck
                </button>
              </form>
              <div className="space-y-2">
                {deckAssets.length === 0 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">No decks yet</p>
                ) : (
                  deckAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 p-2">
                      <div className="w-10 h-10 border border-black/10 bg-white/80 flex items-center justify-center text-[9px] font-bold">
                        PDF
                      </div>
                      <span className="text-xs font-bold truncate">{asset.name}</span>
                      <form action={deleteProfileAssetAction} className="ml-auto">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <button className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`${surfaceMutedClass} p-4 space-y-3`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Logos</p>
                <p className="text-[11px] text-gray-600">Primary and alternate logos.</p>
              </div>
              <form action={uploadProfileAssetAction} encType="multipart/form-data" className="space-y-2">
                <input type="hidden" name="assetType" value="logo" />
                <input type="hidden" name="category" value="logo" />
                <input type="file" name="file" accept="image/*" className="text-xs font-bold" required />
                <button type="submit" className={`${buttonPrimary} w-full`}>
                  Upload Logo
                </button>
              </form>
              <div className="space-y-2">
                {logoAssets.length === 0 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">No logos yet</p>
                ) : (
                  logoAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 p-2">
                      {asset.previewUrl ? (
                        <img src={asset.previewUrl} alt={asset.name} className="w-10 h-10 border border-black/10 object-cover rounded-lg" />
                      ) : (
                        <div className="w-10 h-10 border border-black/10 bg-white/80 flex items-center justify-center text-[9px] font-bold rounded-lg">
                          LOGO
                        </div>
                      )}
                      <span className="text-xs font-bold truncate">{asset.name}</span>
                      <form action={deleteProfileAssetAction} className="ml-auto">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <button className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`${surfaceMutedClass} p-4 space-y-3`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Brand Images</p>
                <p className="text-[11px] text-gray-600">Approved imagery for campaigns.</p>
              </div>
              <form action={uploadProfileAssetAction} encType="multipart/form-data" className="space-y-2">
                <input type="hidden" name="assetType" value="image" />
                <input type="hidden" name="category" value="brand_image" />
                <input type="file" name="file" accept="image/*" className="text-xs font-bold" required />
                <button type="submit" className={`${buttonPrimary} w-full`}>
                  Upload Image
                </button>
              </form>
              <div className="space-y-2">
                {imageAssets.length === 0 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">No brand images yet</p>
                ) : (
                  imageAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 p-2">
                      {asset.previewUrl ? (
                        <img src={asset.previewUrl} alt={asset.name} className="w-10 h-10 border border-black/10 object-cover rounded-lg" />
                      ) : (
                        <div className="w-10 h-10 border border-black/10 bg-white/80 flex items-center justify-center text-[9px] font-bold rounded-lg">
                          IMG
                        </div>
                      )}
                      <span className="text-xs font-bold truncate">{asset.name}</span>
                      <form action={deleteProfileAssetAction} className="ml-auto">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <button className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`${surfaceMutedClass} p-4 space-y-3`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Avatar Library</p>
                <p className="text-[11px] text-gray-600">Spokespeople and persona shots.</p>
              </div>
              <form action={uploadProfileAssetAction} encType="multipart/form-data" className="space-y-2">
                <input type="hidden" name="assetType" value="avatar" />
                <input type="hidden" name="category" value="avatar" />
                <input type="file" name="file" accept="image/*" className="text-xs font-bold" required />
                <button type="submit" className={`${buttonPrimary} w-full`}>
                  Upload Avatar
                </button>
              </form>
              <div className="space-y-2">
                {avatarAssets.length === 0 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">No avatars yet</p>
                ) : (
                  avatarAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 p-2">
                      {asset.previewUrl ? (
                        <img src={asset.previewUrl} alt={asset.name} className="w-10 h-10 border border-black/10 object-cover rounded-lg" />
                      ) : (
                        <div className="w-10 h-10 border border-black/10 bg-white/80 flex items-center justify-center text-[9px] font-bold rounded-lg">
                          AVTR
                        </div>
                      )}
                      <span className="text-xs font-bold truncate">{asset.name}</span>
                      <form action={deleteProfileAssetAction} className="ml-auto">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <button className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700">
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

        <section className={`${surfaceClass} p-6 mt-8`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl">Product Catalog</h2>
            <span className={pillClass}>
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
                className={`mt-2 ${inputClass}`}
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-widest">Type</label>
              <select
                name="productType"
                className={`mt-2 ${inputClass}`}
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
                className={`mt-2 ${inputClass}`}
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                className={buttonPrimary}
              >
                Add Product
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/20 p-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
                No products yet
              </div>
            ) : (
              products.map(product => (
                <div key={product.id} className={`${surfaceMutedClass} p-4`}>
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
                      <button className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700">
                        Delete Product
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(product.assets || []).length === 0 ? (
                      <div className="col-span-full text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        No product assets yet
                      </div>
                    ) : (
                      (product.assets || []).map(asset => (
                        <div key={asset.id} className="rounded-xl border border-white/70 bg-white/70 overflow-hidden">
                          {asset.previewUrl ? (
                            <img src={asset.previewUrl} alt={product.name} className="w-full h-20 object-cover" />
                          ) : (
                            <div className="h-20 flex items-center justify-center text-[9px] font-bold">IMG</div>
                          )}
                          <div className="border-t border-white/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest flex items-center justify-between">
                            <span className="truncate">{asset.role.replace('_', ' ')}</span>
                            <form action={deleteProfileAssetAction}>
                              <input type="hidden" name="assetId" value={asset.assetId} />
                              <button className="text-[9px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700">
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
                          className={`mt-1 ${inputClass}`}
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
                      className={buttonPrimary}
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
