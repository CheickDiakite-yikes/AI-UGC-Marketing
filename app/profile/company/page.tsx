import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/app/actions/userActions';
import { getProfileLibrary, uploadProfileAssetAction, createProfileProductAction } from '@/app/actions/profileLibraryActions';

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

export default async function CompanyPage() {
  const profile = await getUserProfile();
  if (!profile) {
    redirect('/login');
  }

  const library = await getProfileLibrary();
  const initials = getInitials(profile.name, profile.email);
  const assets = library?.assets ?? [];
  const products = library?.products ?? [];

  const logoAssets = assets.filter(asset => asset.type === 'logo');
  const avatarAssets = assets.filter(asset => asset.type === 'avatar');
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
            <h2 className="font-display font-black text-xl">Brand Identity</h2>
            <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
              {logoAssets.length} Logo{logoAssets.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-4">
            {logoAssets.length === 0 ? (
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No logos uploaded yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {logoAssets.map(asset => (
                  <div key={asset.id} className="border-4 border-black bg-white p-2">
                    {asset.previewUrl ? (
                      <img src={asset.previewUrl} alt={asset.name} className="w-full h-24 object-contain" />
                    ) : (
                      <div className="w-full h-24 border-2 border-black bg-gray-200 flex items-center justify-center text-[9px] font-bold">
                        LOGO
                      </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mt-2 truncate">{asset.name}</p>
                  </div>
                ))}
              </div>
            )}
            <form action={uploadProfileAssetAction} encType="multipart/form-data" className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="assetType" value="logo" />
              <input type="file" name="file" accept="image/*" className="text-xs font-bold" required />
              <button type="submit" className="bg-neo-lime border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                Upload Logo
              </button>
            </form>
          </div>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl">Avatar / Spokesperson</h2>
            <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
              {avatarAssets.length} Avatar{avatarAssets.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-4">
            {avatarAssets.length === 0 ? (
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No avatars uploaded yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {avatarAssets.map(asset => (
                  <div key={asset.id} className="border-4 border-black bg-white p-2">
                    {asset.previewUrl ? (
                      <img src={asset.previewUrl} alt={asset.name} className="w-full h-24 object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-24 border-2 border-black bg-gray-200 flex items-center justify-center text-[9px] font-bold rounded-full">
                        AVTR
                      </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mt-2 truncate text-center">{asset.name}</p>
                  </div>
                ))}
              </div>
            )}
            <form action={uploadProfileAssetAction} encType="multipart/form-data" className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="assetType" value="avatar" />
              <input type="file" name="file" accept="image/*" className="text-xs font-bold" required />
              <button type="submit" className="bg-neo-cyan border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                Upload Avatar
              </button>
            </form>
          </div>
        </section>

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl">Products</h2>
            <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
              {products.length} Product{products.length !== 1 ? 's' : ''}
            </span>
          </div>
          {products.length === 0 ? (
            <div className="border-2 border-dashed border-black/30 p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">No products added yet</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {products.map(product => (
                <div key={product.id} className="border-2 border-black p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{product.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {product.productType?.replace('_', ' ')} • {product.assets?.length || 0} asset{(product.assets?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="bg-neo-lime border-2 border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                    {product.productType?.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          )}
          <form action={createProfileProductAction} className="flex flex-wrap gap-3 items-end border-t-2 border-black/20 pt-4 mt-4">
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block mb-1">Product Name</label>
              <input
                type="text"
                name="name"
                placeholder="New Product"
                required
                className="w-full border-2 border-black p-2 text-sm font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
              />
            </div>
            <div className="min-w-[120px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block mb-1">Type</label>
              <select
                name="productType"
                className="w-full border-2 border-black p-2 text-sm font-bold bg-gray-50 focus:outline-none"
              >
                <option value="physical_product">Physical Product</option>
                <option value="software">Software</option>
                <option value="service">Service</option>
                <option value="digital_product">Digital Product</option>
                <option value="hardware">Hardware</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-neo-pink border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
            >
              Add Product
            </button>
          </form>
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
