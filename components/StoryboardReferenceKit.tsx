import React, { useRef, useState } from 'react';
import type { ProjectAsset, VideoReferenceMode, VideoReferenceRole, VideoReferenceSelection } from '../types';

const ROLE_SLOTS: Array<{ role: VideoReferenceRole; label: string; hint: string }> = [
  { role: 'avatar', label: 'Avatar / Person', hint: 'Use a consistent face or creator.' },
  { role: 'item', label: 'Item / Outfit / Product', hint: 'Phone, outfit, or product anchor.' },
  { role: 'setting', label: 'Setting / Location', hint: 'Background or environment reference.' }
];

const getAssetPreview = (asset: ProjectAsset): string | null => {
  if (!asset.content) return null;
  if (asset.content.startsWith('data:') || asset.content.startsWith('http') || asset.content.startsWith('/api/')) {
    return asset.content;
  }
  const mimeType = asset.mimeType || 'image/png';
  return `data:${mimeType};base64,${asset.content}`;
};

const formatAssetLabel = (asset: ProjectAsset): string => `${asset.name} (${asset.type})`;

interface StoryboardReferenceKitProps {
  storyboardId: string;
  assets: ProjectAsset[];
  referenceSelections?: VideoReferenceSelection[] | null;
  referenceMode?: VideoReferenceMode | null;
  disabled?: boolean;
  onChange: (storyboardId: string, selections: VideoReferenceSelection[], mode: VideoReferenceMode) => void;
  onUploadReference?: (file: File, role: VideoReferenceRole, options?: { applyAvatarIdentity?: boolean }) => Promise<string | null>;
}

const StoryboardReferenceKit: React.FC<StoryboardReferenceKitProps> = ({
  storyboardId,
  assets,
  referenceSelections,
  referenceMode,
  disabled,
  onChange,
  onUploadReference
}) => {
  const mode: VideoReferenceMode = referenceMode || 'hybrid';
  const aiFillEnabled = mode !== 'manual';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadRole, setUploadRole] = useState<VideoReferenceRole | null>(null);
  const [uploadingRole, setUploadingRole] = useState<VideoReferenceRole | null>(null);
  const [useAvatarIdentity, setUseAvatarIdentity] = useState(false);
  const selections = Array.isArray(referenceSelections) ? referenceSelections : [];
  const selectionMap = new Map<VideoReferenceRole, string>();
  const unassignedSelections: VideoReferenceSelection[] = [];

  selections.forEach(selection => {
    if (!selection?.assetId) return;
    if (selection.role) {
      selectionMap.set(selection.role, selection.assetId);
    } else {
      unassignedSelections.push(selection);
    }
  });

  if (unassignedSelections.length > 0) {
    const openSlots = ROLE_SLOTS.map(slot => slot.role).filter(role => !selectionMap.has(role));
    unassignedSelections.forEach((selection, index) => {
      const role = openSlots[index];
      if (role) selectionMap.set(role, selection.assetId);
    });
  }

  const imageAssets = assets.filter(asset => (asset.type === 'image' || asset.type === 'avatar') && asset.content);

  const updateSelections = (role: VideoReferenceRole, assetId: string) => {
    const nextSelections: VideoReferenceSelection[] = ROLE_SLOTS.map(slot => {
      const nextAssetId = slot.role === role ? assetId : (selectionMap.get(slot.role) || '');
      if (!nextAssetId) return null;
      return { assetId: nextAssetId, role: slot.role };
    }).filter(Boolean) as VideoReferenceSelection[];
    const nextMode: VideoReferenceMode = mode === 'auto' ? 'hybrid' : mode;
    onChange(storyboardId, nextSelections, nextMode);
  };

  const handleModeToggle = (enabled: boolean) => {
    const nextMode: VideoReferenceMode = enabled ? 'hybrid' : 'manual';
    onChange(storyboardId, selections, nextMode);
  };

  const clearRole = (role: VideoReferenceRole) => {
    updateSelections(role, '');
  };

  const handleUploadClick = (role: VideoReferenceRole) => {
    if (!onUploadReference || disabled) return;
    setUploadRole(role);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadRole || !onUploadReference) return;
    setUploadingRole(uploadRole);
    try {
      const assetId = await onUploadReference(file, uploadRole, {
        applyAvatarIdentity: uploadRole === 'avatar' && useAvatarIdentity
      });
      if (assetId) {
        updateSelections(uploadRole, assetId);
      }
    } finally {
      setUploadingRole(null);
      event.target.value = '';
      setUploadRole(null);
    }
  };

  return (
    <div className="w-full border-2 border-black rounded-xl bg-white/90 p-3 shadow-neo-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Reference Kit</div>
          <p className="text-xs font-bold text-gray-700">
            Up to 3 reference images per scene. Order: avatar → item → setting.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 self-start sm:self-auto">
          <input
            type="checkbox"
            checked={aiFillEnabled}
            onChange={(e) => handleModeToggle(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 border-2 border-black accent-neo-cyan"
          />
          AI fill missing
        </label>
      </div>

      <div className="mt-3 grid gap-2 sm:gap-3">
        {ROLE_SLOTS.map(slot => {
          const selectedId = selectionMap.get(slot.role) || '';
          const selectedAsset = selectedId ? imageAssets.find(asset => asset.id === selectedId) : undefined;
          const previewSrc = selectedAsset ? getAssetPreview(selectedAsset) : null;
          const isUploading = uploadingRole === slot.role;
          return (
            <div key={slot.role} className="flex flex-row gap-2 sm:gap-3 border-2 border-black bg-white p-2 rounded-lg shadow-neo-sm items-start sm:items-center">
              <div className="w-10 h-10 sm:w-14 sm:h-14 border-2 border-black bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {previewSrc ? (
                  <img src={previewSrc} alt={selectedAsset?.name || slot.label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase">{slot.role}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-gray-500">{slot.label}</div>
                <div className="text-[9px] sm:text-[10px] text-gray-500 hidden sm:block">{slot.hint}</div>
                <div className="mt-1 sm:mt-2 flex flex-wrap items-center gap-1 sm:gap-2">
                  <select
                    value={selectedId}
                    onChange={(e) => updateSelections(slot.role, e.target.value)}
                    disabled={disabled}
                    className="flex-1 min-w-0 sm:w-auto sm:flex-1 sm:min-w-[160px] border-2 border-black bg-white text-[10px] sm:text-xs font-bold px-1 sm:px-2 py-1"
                  >
                    <option value="">Auto</option>
                    {imageAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {formatAssetLabel(asset)}
                      </option>
                    ))}
                  </select>
                  {onUploadReference && (
                    <button
                      type="button"
                      onClick={() => handleUploadClick(slot.role)}
                      disabled={disabled || isUploading}
                      className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest border-2 border-black px-1.5 sm:px-2 py-1 bg-neo-cyan hover:bg-neo-pink hover:text-black transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {isUploading ? '...' : 'Upload'}
                    </button>
                  )}
                  {selectedId ? (
                    <button
                      type="button"
                      onClick={() => clearRole(slot.role)}
                      disabled={disabled}
                      className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest border-2 border-black px-1.5 sm:px-2 py-1 bg-white hover:bg-black hover:text-white transition-all whitespace-nowrap"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                {slot.role === 'avatar' && onUploadReference && (
                  <label className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-gray-500">
                    <input
                      type="checkbox"
                      checked={useAvatarIdentity}
                      onChange={(e) => setUseAvatarIdentity(e.target.checked)}
                      disabled={disabled}
                      className="h-3 w-3 border-2 border-black accent-neo-pink"
                    />
                    Use as avatar identity
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {onUploadReference && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </div>
  );
};

export default StoryboardReferenceKit;
