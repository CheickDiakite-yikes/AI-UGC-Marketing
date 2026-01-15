'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Product, ProductAsset, ProjectAsset, ProductAssetRole, ProductType, ProductVisualSpec, ProductCopySpec } from '../types';

type ProductInput = Omit<Product, 'id' | 'boardId' | 'assets' | 'createdAt'>;
type ProductAssetInput = Omit<ProductAsset, 'id' | 'productId' | 'createdAt'>;
type ProductAnalysisResult = {
  name?: string;
  description?: string;
  category?: string;
  productType?: ProductType;
  platforms?: string[];
  digitalSubtype?: string;
  keyFeatures?: string[];
  variants?: string[];
  complianceNotes?: string;
  visualSpec?: ProductVisualSpec;
  copySpec?: ProductCopySpec;
  assetAssignments?: ProductAssetInput[];
};

type ProductAnalysisResponse = {
  analysis?: ProductAnalysisResult;
  error?: string;
  traceId?: string;
};

interface ProductModalProps {
  product?: Product | null;
  assets: ProjectAsset[];
  onUploadProductImages: (files: File[]) => Promise<ProjectAsset[]>;
  onAnalyzeProductImages: (assetIds: string[]) => Promise<ProductAnalysisResponse | null>;
  onSave: (product: ProductInput, assignments: ProductAssetInput[]) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'physical_product', label: 'Physical Product' },
  { value: 'software', label: 'Software / SaaS' },
  { value: 'service', label: 'Service' },
  { value: 'digital_product', label: 'Digital Product' },
  { value: 'hardware', label: 'Hardware' },
];

const ROLE_OPTIONS: { value: ProductAssetRole; label: string }[] = [
  { value: 'product_shot', label: 'Product Shot' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'mockup', label: 'Mockup' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'ui', label: 'UI Detail' },
  { value: 'in_use', label: 'In Use' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'hero', label: 'Hero' },
  { value: 'logo', label: 'Logo' },
  { value: 'other', label: 'Other' },
];

const PLATFORM_OPTIONS = [
  { value: 'web', label: 'Web App' },
  { value: 'ios', label: 'iOS App' },
  { value: 'android', label: 'Android App' },
  { value: 'desktop', label: 'Desktop App' },
  { value: 'api', label: 'API' },
  { value: 'extension', label: 'Browser Extension' },
  { value: 'other', label: 'Other' },
];

const DIGITAL_SUBTYPE_OPTIONS = [
  { value: 'SaaS', label: 'SaaS' },
  { value: 'mobile_app', label: 'Mobile App' },
  { value: 'course', label: 'Course' },
  { value: 'coin_token', label: 'Coin / Token' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'community', label: 'Community' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'template', label: 'Template' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'AI_tool', label: 'AI Tool' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_ROLE_BY_TYPE: Record<ProductType, ProductAssetRole> = {
  physical_product: 'product_shot',
  software: 'screenshot',
  service: 'in_use',
  digital_product: 'screenshot',
  hardware: 'product_shot',
};

const parseList = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildPreviewSrc = (asset: ProjectAsset): string => {
  if (!asset.content) return '';
  if (asset.content.startsWith('data:') || asset.content.startsWith('http') || asset.content.startsWith('/api/')) {
    return asset.content;
  }
  const mime = asset.mimeType || 'image/png';
  return `data:${mime};base64,${asset.content}`;
};

const ProductModal: React.FC<ProductModalProps> = ({ product, assets, onUploadProductImages, onAnalyzeProductImages, onSave, onDelete, onClose }) => {
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [name, setName] = useState(product?.name || '');
  const [productType, setProductType] = useState<ProductType>(product?.productType || 'physical_product');
  const [category, setCategory] = useState(product?.category || '');
  const [platforms, setPlatforms] = useState<string[]>(product?.platforms || []);
  const [digitalSubtype, setDigitalSubtype] = useState(product?.digitalSubtype || '');
  const [description, setDescription] = useState(product?.description || '');
  const [keyFeatures, setKeyFeatures] = useState((product?.keyFeatures || []).join('\n'));
  const [variants, setVariants] = useState((product?.variants || []).join('\n'));
  const [complianceNotes, setComplianceNotes] = useState(product?.complianceNotes || '');
  const [visualSpec, setVisualSpec] = useState<ProductVisualSpec>(product?.visualSpec || {});
  const [copySpec, setCopySpec] = useState<ProductCopySpec>(product?.copySpec || {});
  const [error, setError] = useState('');

  const initialAssignments = useMemo(() => {
    const mapping: Record<string, ProductAssetInput> = {};
    (product?.assets || []).forEach((pa) => {
      mapping[pa.assetId] = {
        assetId: pa.assetId,
        role: pa.role,
        isPrimary: !!pa.isPrimary,
        variant: pa.variant || '',
        notes: pa.notes || '',
        tags: pa.tags || []
      };
    });
    return mapping;
  }, [product]);

  const [assignments, setAssignments] = useState<Record<string, ProductAssetInput>>(initialAssignments);

  useEffect(() => {
    setAnalysisStatus('idle');
    setAnalysisMessage('');
    setName(product?.name || '');
    setProductType(product?.productType || 'physical_product');
    setCategory(product?.category || '');
    setPlatforms(product?.platforms || []);
    setDigitalSubtype(product?.digitalSubtype || '');
    setDescription(product?.description || '');
    setKeyFeatures((product?.keyFeatures || []).join('\n'));
    setVariants((product?.variants || []).join('\n'));
    setComplianceNotes(product?.complianceNotes || '');
    setVisualSpec(product?.visualSpec || {});
    setCopySpec(product?.copySpec || {});
    setAssignments(initialAssignments);
    setError('');
  }, [product, initialAssignments]);

  const imageAssets = assets.filter((asset) => asset.type === 'image' || asset.type === 'logo');
  const selectedAssetIds = Object.keys(assignments);
  const allowedProductTypes = new Set(PRODUCT_TYPES.map((type) => type.value));
  const allowedRoles = new Set(ROLE_OPTIONS.map((role) => role.value));

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAnalysisStatus('analyzing');
    setAnalysisMessage('Uploading product images...');
    try {
      const uploadedAssets = await onUploadProductImages(Array.from(files));
      const newAssetIds = uploadedAssets.map((asset) => asset.id);
      setAssignments((prev) => {
        const updated = { ...prev };
        uploadedAssets.forEach((asset) => {
          if (!updated[asset.id]) {
            updated[asset.id] = {
              assetId: asset.id,
              role: DEFAULT_ROLE_BY_TYPE[productType],
              isPrimary: false,
              variant: '',
              notes: '',
              tags: []
            };
          }
        });
        return updated;
      });
      setAnalysisMessage('Analyzing images to auto-fill product details...');
      await runAnalysis(Array.from(new Set([...selectedAssetIds, ...newAssetIds])));
    } catch (uploadError) {
      setAnalysisStatus('error');
      setAnalysisMessage('Upload failed. Please try again.');
    }
  };

  const runAnalysis = async (assetIdsOverride?: string[]) => {
    const assetIds = assetIdsOverride || selectedAssetIds;
    if (assetIds.length === 0) {
      setAnalysisStatus('error');
      setAnalysisMessage('Add at least one product image to analyze.');
      return;
    }
    try {
      setAnalysisStatus('analyzing');
      const response = await onAnalyzeProductImages(assetIds);
      if (!response || !response.analysis) {
        setAnalysisStatus('error');
        const errorMessage = response?.error ? `${response.error}${response.traceId ? ` (Trace ${response.traceId})` : ''}` : 'Unable to analyze product images.';
        setAnalysisMessage(errorMessage);
        return;
      }
      const result = response.analysis;

      if (result.name) setName(result.name);
      if (result.description) setDescription(result.description);
      if (result.category) setCategory(result.category);
      if (result.productType && allowedProductTypes.has(result.productType)) setProductType(result.productType);
      if (result.platforms && result.platforms.length > 0) setPlatforms(result.platforms);
      if (result.digitalSubtype) setDigitalSubtype(result.digitalSubtype);
      if (result.keyFeatures && result.keyFeatures.length > 0) setKeyFeatures(result.keyFeatures.join('\n'));
      if (result.variants && result.variants.length > 0) setVariants(result.variants.join('\n'));
      if (result.complianceNotes) setComplianceNotes(result.complianceNotes);
      if (result.visualSpec) setVisualSpec(result.visualSpec);
      if (result.copySpec) setCopySpec(result.copySpec);

      if (result.assetAssignments && result.assetAssignments.length > 0) {
        setAssignments((prev) => {
          const updated = { ...prev };
          result.assetAssignments.forEach((assignment) => {
            const normalizedRole = allowedRoles.has(assignment.role) ? assignment.role : 'other';
            updated[assignment.assetId] = {
              assetId: assignment.assetId,
              role: normalizedRole,
              isPrimary: assignment.isPrimary || false,
              variant: assignment.variant || '',
              notes: assignment.notes || '',
              tags: assignment.tags || []
            };
          });
          return updated;
        });
      }

      setAnalysisStatus('done');
      setAnalysisMessage('Auto-fill complete. Review and edit as needed.');
    } catch (analysisError) {
      setAnalysisStatus('error');
      setAnalysisMessage('Analysis failed. Please try again.');
    }
  };

  const toggleAsset = (asset: ProjectAsset) => {
    setAssignments((prev) => {
      if (prev[asset.id]) {
        const updated = { ...prev };
        delete updated[asset.id];
        return updated;
      }

      const suggestedRoleRaw = asset.metadata?.autoTags?.role as ProductAssetRole | undefined;
      const allowedRoles = new Set(ROLE_OPTIONS.map((role) => role.value));
      const suggestedRole = suggestedRoleRaw && allowedRoles.has(suggestedRoleRaw) ? suggestedRoleRaw : undefined;
      const suggestedVariant = asset.metadata?.autoTags?.variant || '';
      return {
        ...prev,
        [asset.id]: {
          assetId: asset.id,
          role: suggestedRole || DEFAULT_ROLE_BY_TYPE[productType],
          isPrimary: false,
          variant: suggestedVariant,
          notes: '',
          tags: []
        }
      };
    });
  };

  const setPrimary = (assetId: string, isPrimary: boolean) => {
    setAssignments((prev) => {
      const updated: Record<string, ProductAssetInput> = {};
      Object.entries(prev).forEach(([id, assignment]) => {
        updated[id] = {
          ...assignment,
          isPrimary: id === assetId ? isPrimary : false
        };
      });
      return updated;
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    const productPayload: ProductInput = {
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      productType,
      platforms: platforms.length > 0 ? platforms : null,
      digitalSubtype: digitalSubtype.trim() || null,
      keyFeatures: parseList(keyFeatures),
      variants: parseList(variants),
      complianceNotes: complianceNotes.trim() || null,
      visualSpec,
      copySpec
    };

    const assignmentList = Object.values(assignments);
    onSave(productPayload, assignmentList);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-neo w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-neo-yellow border-b-4 border-black p-4 flex items-center justify-between">
          <div>
            <h2 className="font-black text-xl">{product ? 'Manage Product' : 'Add Product'}</h2>
            <p className="text-xs font-bold text-gray-600 uppercase">Product context + ingredient assets</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white border-2 border-black flex items-center justify-center font-black hover:bg-red-400 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="border-2 border-black p-3 bg-neo-lime/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm uppercase tracking-widest text-gray-600">Step 1: Upload Product Images</h3>
              <span className="text-[10px] text-gray-500 font-bold">{selectedAssetIds.length} selected</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Upload product photos (front, back, sides, packaging, screenshots). We will auto-analyze and fill the details for you.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="text-xs font-bold border-2 border-black px-3 py-2 bg-white hover:bg-black hover:text-white cursor-pointer">
                Upload Images
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUploadImages(e.target.files)}
                />
              </label>
              <button
                onClick={() => runAnalysis()}
                className="text-xs font-bold border-2 border-black px-3 py-2 bg-neo-pink hover:bg-black hover:text-white"
                disabled={analysisStatus === 'analyzing'}
              >
                {analysisStatus === 'analyzing' ? 'Analyzing...' : 'Analyze & Autofill'}
              </button>
            </div>
            {analysisMessage && (
              <p className={`mt-2 text-xs font-bold ${analysisStatus === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
                {analysisMessage}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Product Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-2 border-black p-2 text-sm"
                placeholder="e.g. Soul Organic Nail Detox"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border-2 border-black p-2 text-sm"
                placeholder="CPG, Wellness, SaaS, etc."
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Product Type</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value as ProductType)}
              className="w-full border-2 border-black p-2 text-sm"
            >
              {PRODUCT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Platforms (optional)</label>
              <div className="flex flex-wrap gap-2 border-2 border-black p-2">
                {PLATFORM_OPTIONS.map((platform) => (
                  <label key={platform.value} className="flex items-center gap-1 text-[10px] font-bold uppercase">
                    <input
                      type="checkbox"
                      checked={platforms.includes(platform.value)}
                      onChange={(e) => {
                        setPlatforms((prev) => {
                          if (e.target.checked) return [...new Set([...prev, platform.value])];
                          return prev.filter((item) => item !== platform.value);
                        });
                      }}
                    />
                    {platform.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Digital Subtype (optional)</label>
              <select
                value={digitalSubtype}
                onChange={(e) => setDigitalSubtype(e.target.value)}
                className="w-full border-2 border-black p-2 text-sm"
              >
                <option value="">Select subtype</option>
                {DIGITAL_SUBTYPE_OPTIONS.map((subtype) => (
                  <option key={subtype.value} value={subtype.value}>{subtype.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-2 border-black p-2 text-sm min-h-[90px]"
              placeholder="Short product description for the AI context."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Key Features (one per line)</label>
              <textarea
                value={keyFeatures}
                onChange={(e) => setKeyFeatures(e.target.value)}
                className="w-full border-2 border-black p-2 text-sm min-h-[90px]"
                placeholder="Feature 1\nFeature 2\nFeature 3"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Variants (one per line)</label>
              <textarea
                value={variants}
                onChange={(e) => setVariants(e.target.value)}
                className="w-full border-2 border-black p-2 text-sm min-h-[90px]"
                placeholder="Size 12oz\nSize 20oz"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Compliance Notes</label>
            <textarea
              value={complianceNotes}
              onChange={(e) => setComplianceNotes(e.target.value)}
              className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
              placeholder="Claims or language to avoid."
            />
          </div>

          <div className="border-t-2 border-black pt-4 space-y-4">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest text-gray-600">Identity Pack (Optional)</h3>
              <p className="text-[10px] text-gray-500">Use these to lock visual and copy consistency across campaigns.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Dominant Colors</label>
                <textarea
                  value={(visualSpec.dominantColors || []).join('\n')}
                  onChange={(e) => setVisualSpec((prev) => ({ ...prev, dominantColors: parseList(e.target.value) }))}
                  className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                  placeholder="Color 1\nColor 2"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Materials</label>
                <textarea
                  value={(visualSpec.materials || []).join('\n')}
                  onChange={(e) => setVisualSpec((prev) => ({ ...prev, materials: parseList(e.target.value) }))}
                  className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                  placeholder="Glass\nMatte plastic"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Form Factor</label>
                <input
                  value={visualSpec.formFactor || ''}
                  onChange={(e) => setVisualSpec((prev) => ({ ...prev, formFactor: e.target.value }))}
                  className="w-full border-2 border-black p-2 text-sm"
                  placeholder="Short cylinder bottle"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Packaging Geometry</label>
                <input
                  value={visualSpec.packagingGeometry || ''}
                  onChange={(e) => setVisualSpec((prev) => ({ ...prev, packagingGeometry: e.target.value }))}
                  className="w-full border-2 border-black p-2 text-sm"
                  placeholder="Rectangular box with rounded corners"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Label / UI Text (Exact)</label>
              <textarea
                value={(visualSpec.labelText || []).join('\n')}
                onChange={(e) => setVisualSpec((prev) => ({ ...prev, labelText: parseList(e.target.value) }))}
                className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                placeholder="Exact words from packaging or UI"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Logo Placement</label>
              <input
                value={visualSpec.logoPlacement || ''}
                onChange={(e) => setVisualSpec((prev) => ({ ...prev, logoPlacement: e.target.value }))}
                className="w-full border-2 border-black p-2 text-sm"
                placeholder="Center label, upper-left, etc."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Distinctive Markers</label>
                <textarea
                  value={(visualSpec.distinctiveMarkers || []).join('\n')}
                  onChange={(e) => setVisualSpec((prev) => ({ ...prev, distinctiveMarkers: parseList(e.target.value) }))}
                  className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                  placeholder="Diagonal logo stripe\nGold cap"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Do Not Change</label>
                <textarea
                  value={(visualSpec.doNotChange || []).join('\n')}
                  onChange={(e) => setVisualSpec((prev) => ({ ...prev, doNotChange: parseList(e.target.value) }))}
                  className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                  placeholder="Logo placement\nPrimary color blocks"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Usage Contexts</label>
              <textarea
                value={(visualSpec.usageContexts || []).join('\n')}
                onChange={(e) => setVisualSpec((prev) => ({ ...prev, usageContexts: parseList(e.target.value) }))}
                className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                placeholder="Bathroom vanity\nGym locker"
              />
            </div>

            <div className="border-t-2 border-dashed border-black pt-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Canonical Product Name</label>
                  <input
                    value={copySpec.canonicalName || ''}
                    onChange={(e) => setCopySpec((prev) => ({ ...prev, canonicalName: e.target.value }))}
                    className="w-full border-2 border-black p-2 text-sm"
                    placeholder="Exact product name"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Tagline</label>
                  <input
                    value={copySpec.tagline || ''}
                    onChange={(e) => setCopySpec((prev) => ({ ...prev, tagline: e.target.value }))}
                    className="w-full border-2 border-black p-2 text-sm"
                    placeholder="Short brand promise"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Allowed Claims</label>
                  <textarea
                    value={(copySpec.allowedClaims || []).join('\n')}
                    onChange={(e) => setCopySpec((prev) => ({ ...prev, allowedClaims: parseList(e.target.value) }))}
                    className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                    placeholder="Claim 1\nClaim 2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Disallowed Claims</label>
                  <textarea
                    value={(copySpec.disallowedClaims || []).join('\n')}
                    onChange={(e) => setCopySpec((prev) => ({ ...prev, disallowedClaims: parseList(e.target.value) }))}
                    className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                    placeholder="Avoid this claim"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Proof Points</label>
                  <textarea
                    value={(copySpec.proofPoints || []).join('\n')}
                    onChange={(e) => setCopySpec((prev) => ({ ...prev, proofPoints: parseList(e.target.value) }))}
                    className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                    placeholder="Clinical study\nCustomer reviews"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Tone Directives</label>
                  <textarea
                    value={(copySpec.toneDirectives || []).join('\n')}
                    onChange={(e) => setCopySpec((prev) => ({ ...prev, toneDirectives: parseList(e.target.value) }))}
                    className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                    placeholder="Calm, clinical\nConfident, minimal"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Required Phrases</label>
                <textarea
                  value={(copySpec.requiredPhrases || []).join('\n')}
                  onChange={(e) => setCopySpec((prev) => ({ ...prev, requiredPhrases: parseList(e.target.value) }))}
                  className="w-full border-2 border-black p-2 text-sm min-h-[70px]"
                  placeholder="Must include phrase"
                />
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm uppercase tracking-widest text-gray-600">Step 2: Review Asset Roles</h3>
              <span className="text-[10px] text-gray-400 font-bold">{Object.keys(assignments).length} selected</span>
            </div>

            {imageAssets.length === 0 ? (
              <p className="text-xs text-gray-500">Upload product images or screenshots to assign them here.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {imageAssets.map((asset) => {
                  const assignment = assignments[asset.id];
                  const autoTags = asset.metadata?.autoTags;
                  return (
                    <div key={asset.id} className={`border-2 border-black p-2 bg-white ${assignment ? 'shadow-neo-sm' : ''}`}>
                      <div className="flex gap-2 items-start">
                        <div className="w-16 h-16 border-2 border-black bg-gray-100 flex-shrink-0 overflow-hidden">
                          {buildPreviewSrc(asset) ? (
                            <img src={buildPreviewSrc(asset)} alt={asset.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">IMG</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold truncate">{asset.name}</p>
                          <p className="text-[10px] uppercase text-gray-500 font-bold">{asset.type}</p>
                          {autoTags?.role && (
                            <p className="text-[10px] text-neo-cyan font-bold mt-1">
                              Suggested: {autoTags.role.replace('_', ' ')} {typeof autoTags.confidence === 'number' ? `(${autoTags.confidence.toFixed(2)})` : ''}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleAsset(asset)}
                          className={`text-[10px] font-bold border-2 border-black px-2 py-1 ${assignment ? 'bg-black text-white' : 'bg-white'}`}
                        >
                          {assignment ? 'Remove' : 'Add'}
                        </button>
                      </div>

                      {assignment && (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <select
                              value={assignment.role}
                              onChange={(e) => setAssignments((prev) => ({
                                ...prev,
                                [asset.id]: { ...prev[asset.id], role: e.target.value as ProductAssetRole }
                              }))}
                              className="flex-1 border-2 border-black p-1 text-xs"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                              ))}
                            </select>
                            <label className="flex items-center gap-1 text-[10px] font-bold">
                              <input
                                type="checkbox"
                                checked={assignment.isPrimary || false}
                                onChange={(e) => setPrimary(asset.id, e.target.checked)}
                              />
                              Primary
                            </label>
                          </div>
                          <input
                            value={assignment.variant || ''}
                            onChange={(e) => setAssignments((prev) => ({
                              ...prev,
                              [asset.id]: { ...prev[asset.id], variant: e.target.value }
                            }))}
                            placeholder="Variant (optional)"
                            className="w-full border-2 border-black p-1 text-xs"
                          />
                          <input
                            value={assignment.notes || ''}
                            onChange={(e) => setAssignments((prev) => ({
                              ...prev,
                              [asset.id]: { ...prev[asset.id], notes: e.target.value }
                            }))}
                            placeholder="Notes (front label, back, side, etc.)"
                            className="w-full border-2 border-black p-1 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
        </div>

        <div className="p-3 bg-gray-100 border-t-2 border-black flex items-center justify-between">
          {product && onDelete ? (
            <button
              onClick={onDelete}
              className="text-xs font-bold text-red-600 border-2 border-black px-3 py-2 bg-white hover:bg-red-50"
            >
              Delete Product
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="border-2 border-black px-4 py-2 text-sm font-bold hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || analysisStatus === 'analyzing'}
              className="bg-neo-pink border-2 border-black px-4 py-2 text-sm font-bold hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
