import { describe, it, expect } from 'vitest';
import { buildSceneReferenceSelection } from '../services/videoReferenceSelection';

const ref = (id: string) => ({
  image: { imageBytes: id, mimeType: 'image/png' },
  referenceType: 'asset' as any
});

const asset = (id: string, role?: 'avatar' | 'item' | 'setting', type: 'image' | 'avatar' = 'image') => ({
  id,
  type,
  role,
  referenceImage: ref(id)
});

describe('Video Reference Selection', () => {
  it('prioritizes avatar role even when type is image', () => {
    const selection = buildSceneReferenceSelection({
      referenceAssets: [
        asset('avatar-img', 'avatar', 'image'),
        asset('item-img', 'item', 'image'),
        asset('setting-img', 'setting', 'image')
      ],
      maxReferences: 3
    });

    expect(selection.referenceImages[0].image.imageBytes).toBe('avatar-img');
    expect(selection.referenceImages).toHaveLength(3);
    expect(selection.usedAvatarReference).toBe(true);
    expect(selection.referenceLabels[0].assetId).toBe('avatar-img');
    expect(selection.referenceLabels[0].role).toBe('avatar');
  });

  it('falls back to continuity reference when no avatar asset', () => {
    const continuity = ref('continuity');
    const selection = buildSceneReferenceSelection({
      referenceAssets: [asset('item-img', 'item')],
      continuityReference: continuity,
      maxReferences: 2
    });

    expect(selection.referenceImages[0].image.imageBytes).toBe('continuity');
    expect(selection.usedContinuityReference).toBe(true);
    expect(selection.referenceLabels[0].kind).toBe('continuity');
  });

  it('does not include carryover when slots are full', () => {
    const carryover = ref('carry');
    const selection = buildSceneReferenceSelection({
      referenceAssets: [
        asset('avatar', 'avatar'),
        asset('item', 'item'),
        asset('setting', 'setting')
      ],
      carryoverReference: carryover,
      maxReferences: 3
    });

    const ids = selection.referenceImages.map(img => img.image.imageBytes);
    expect(ids).not.toContain('carry');
    expect(selection.usedCarryoverReference).toBe(false);
  });

  it('labels carryover when used', () => {
    const carryover = ref('carry');
    const selection = buildSceneReferenceSelection({
      referenceAssets: [asset('avatar', 'avatar')],
      carryoverReference: carryover,
      maxReferences: 2
    });
    const kinds = selection.referenceLabels.map(label => label.kind);
    expect(kinds).toContain('carryover');
  });

  it('uses the first available asset when roles are missing', () => {
    const selection = buildSceneReferenceSelection({
      referenceAssets: [asset('fallback-1'), asset('fallback-2')],
      maxReferences: 1
    });

    expect(selection.referenceImages[0].image.imageBytes).toBe('fallback-1');
    expect(selection.referenceLabels).toHaveLength(1);
    expect(selection.referenceLabels[0].assetId).toBe('fallback-1');
  });

  it('keeps label counts aligned with reference images', () => {
    const selection = buildSceneReferenceSelection({
      referenceAssets: [
        asset('avatar', 'avatar'),
        asset('item', 'item'),
        asset('setting', 'setting')
      ],
      maxReferences: 3
    });
    expect(selection.referenceLabels.length).toBe(selection.referenceImages.length);
    expect(selection.safeReferenceLabels.length).toBe(selection.safeReferenceImages.length);
  });
});
