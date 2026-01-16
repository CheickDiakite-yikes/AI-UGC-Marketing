import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProfileImportSelection, ProfileLibrary } from '../types';
import { getProfileLibrary } from '../app/actions/profileLibraryActions';

interface Props {
  onCreate: (name: string, imports: ProfileImportSelection) => void;
  onCancel: () => void;
}

const NewBoardModal: React.FC<Props> = ({ onCreate, onCancel }) => {
  const [name, setName] = useState('');
  const [library, setLibrary] = useState<ProfileLibrary | null>(null);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [includeWebsite, setIncludeWebsite] = useState(false);
  const [includeOverview, setIncludeOverview] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadLibrary = async () => {
      try {
        const result = await getProfileLibrary();
        if (isMounted) {
          setLibrary(result);
        }
      } catch (error) {
        console.error('Failed to load profile library', error);
      } finally {
        if (isMounted) {
          setIsLibraryLoading(false);
        }
      }
    };

    loadLibrary();

    return () => {
      isMounted = false;
    };
  }, []);

  const profileAssets = useMemo(() => {
    if (!library?.assets) return [];
    return library.assets.filter(asset => asset.category !== 'product');
  }, [library?.assets]);

  const groupedAssets = useMemo(() => {
    return {
      logos: profileAssets.filter(asset => asset.type === 'logo'),
      avatars: profileAssets.filter(asset => asset.type === 'avatar'),
      decks: profileAssets.filter(asset => asset.type === 'pdf'),
      images: profileAssets.filter(asset => asset.type === 'image'),
      links: profileAssets.filter(asset => asset.type === 'link'),
      texts: profileAssets.filter(asset => asset.type === 'text'),
    };
  }, [profileAssets]);

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), {
        includeWebsite,
        includeOverview,
        assetIds: selectedAssetIds,
        productIds: selectedProductIds
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-neo-lg w-full max-w-md animate-fade-in-up">
        <div className="bg-neo-pink border-b-4 border-black p-4">
          <h2 className="font-display font-bold text-xl">Start New Campaign</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wide">Project / Campaign Name</label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Launch 2025"
              className="w-full bg-gray-50 border-2 border-black p-3 font-medium focus:outline-none focus:shadow-neo-sm transition-shadow"
            />
          </div>

          <div className="border-2 border-black bg-gray-50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-700">Import From Profile</p>
                <p className="text-[11px] text-gray-500">Optional assets and products from your profile library.</p>
              </div>
              <Link
                href="/profile"
                className="text-[10px] font-bold uppercase tracking-widest underline decoration-2 decoration-neo-lime hover:text-neo-pink"
              >
                Manage Profile
              </Link>
            </div>

            {isLibraryLoading && (
              <div className="text-xs font-bold text-gray-500">Loading profile library...</div>
            )}

            {!isLibraryLoading && (!library || (!library.profile.websiteUrl && !library.profile.overview && library.assets.length === 0 && library.products.length === 0)) && (
              <div className="text-xs font-bold text-gray-400">No profile assets yet.</div>
            )}

            {!isLibraryLoading && library && (library.profile.websiteUrl || library.profile.overview) && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Core Info</p>
                {library.profile.websiteUrl && (
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={includeWebsite}
                      onChange={() => setIncludeWebsite(prev => !prev)}
                      className="h-4 w-4 border-2 border-black"
                    />
                    Include website link
                  </label>
                )}
                {library.profile.overview && (
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={includeOverview}
                      onChange={() => setIncludeOverview(prev => !prev)}
                      className="h-4 w-4 border-2 border-black"
                    />
                    Include overview paragraph
                  </label>
                )}
              </div>
            )}

            {!isLibraryLoading && library && profileAssets.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Assets</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {Object.entries(groupedAssets).map(([groupKey, assets]) => {
                    if (assets.length === 0) return null;
                    return (
                      <div key={groupKey} className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          {groupKey.replace('_', ' ')}
                        </p>
                        {assets.map(asset => (
                          <label key={asset.id} className="flex items-center gap-2 text-xs font-bold">
                            <input
                              type="checkbox"
                              checked={selectedAssetIds.includes(asset.id)}
                              onChange={() => toggleAsset(asset.id)}
                              className="h-4 w-4 border-2 border-black"
                            />
                            <span className="truncate">{asset.name}</span>
                            <span className="ml-auto text-[10px] uppercase text-gray-400">{asset.type}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isLibraryLoading && library && library.products.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Products</p>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {library.products.map(product => (
                    <label key={product.id} className="flex items-center gap-2 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        className="h-4 w-4 border-2 border-black"
                      />
                      <span className="truncate">{product.name}</span>
                      <span className="ml-auto text-[10px] uppercase text-gray-400">{product.assets?.length || 0} assets</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-4 py-2 font-bold text-gray-500 hover:text-black hover:underline"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!name.trim()}
              className="bg-neo-black text-white border-2 border-black shadow-neo px-6 py-2 font-bold hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
            >
              Create Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBoardModal;
