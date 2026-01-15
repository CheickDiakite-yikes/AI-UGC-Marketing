
import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Enums ---
export const assetTypeEnum = pgEnum('asset_type', ['logo', 'image', 'pdf', 'text', 'link', 'avatar']);
export const itemTypeEnum = pgEnum('item_type', ['text', 'image', 'video', 'carousel']);
export const roleEnum = pgEnum('role', ['user', 'model', 'system']);
export const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed']);
export const productTypeEnum = pgEnum('product_type', ['physical_product', 'software', 'service', 'digital_product', 'hardware']);
export const productAssetRoleEnum = pgEnum('product_asset_role', [
  'product_shot',
  'packaging',
  'mockup',
  'screenshot',
  'in_use',
  'lifestyle',
  'hero',
  'logo',
  'ui',
  'other',
]);

// --- Tables ---

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  name: text('name'),
  company: text('company'),
  jobTitle: text('job_title'),
  referralSource: text('referral_source'),
  avatarUrl: text('avatar_url'),
  imagesGenerated: integer('images_generated').default(0).notNull(),
  videosGenerated: integer('videos_generated').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  userId: uuid('user_id'), // Nullable for now if no auth
  brandIdentityId: uuid('brand_identity_id'),
  avatarIdentityId: uuid('avatar_identity_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }),
  type: assetTypeEnum('type').notNull(),
  name: text('name').notNull(),
  content: text('content'), // Base64 for backwards compatibility or text content
  storageKey: text('storage_key'), // Object storage key for media files
  mimeType: text('mime_type'),
  status: text('status').default('ready'),
  extractedText: text('extracted_text'), // For PDFs: extracted readable text content
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const generatedItems = pgTable('generated_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }),
  type: itemTypeEnum('type').notNull(),
  content: text('content'), // Text or URL (nullable when using storage)
  storageKey: text('storage_key'), // Object storage key for media files
  carouselUrls: jsonb('carousel_urls'), // Array of strings
  title: text('title').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'), // Any extra meta (aspectRatio, etc)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  x: integer('x').default(0),
  y: integer('y').default(0),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  text: text('text').notNull(),
  isThinking: boolean('is_thinking').default(false),
  relatedItemIds: jsonb('related_item_ids'), // Array of generated item IDs
  groundingLinks: jsonb('grounding_links'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const brandIdentities = pgTable('brand_identities', {
  id: uuid('id').defaultRandom().primaryKey(),
  colors: jsonb('colors').notNull(), // string[]
  fonts: jsonb('fonts').notNull(), // { display, body, vibe }
  vibe: text('vibe').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const avatarIdentities = pgTable('avatar_identities', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  description: text('description').notNull(),
  traits: jsonb('traits'), // string[]
  atomicTraits: jsonb('atomic_traits').notNull(), // { faceShape, ... }
  referenceImages: jsonb('reference_images'), // string[] (base64)
  consistencySpec: jsonb('consistency_spec'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  productType: productTypeEnum('product_type').notNull(),
  platforms: jsonb('platforms'),
  digitalSubtype: text('digital_subtype'),
  keyFeatures: jsonb('key_features'),
  variants: jsonb('variants'),
  complianceNotes: text('compliance_notes'),
  visualSpec: jsonb('visual_spec'),
  copySpec: jsonb('copy_spec'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productAssets = pgTable('product_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }),
  role: productAssetRoleEnum('role').notNull(),
  isPrimary: boolean('is_primary').default(false),
  variant: text('variant'),
  notes: text('notes'),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  payload: jsonb('payload').notNull(),
  result: jsonb('result'),
  error: text('error'),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// --- Relations ---

export const boardsRelations = relations(boards, ({ many, one }) => ({
  assets: many(assets),
  generatedItems: many(generatedItems),
  messages: many(messages),
  jobs: many(jobs),
  products: many(products),
  brandIdentity: one(brandIdentities, {
    fields: [boards.brandIdentityId],
    references: [brandIdentities.id],
  }),
  avatarIdentity: one(avatarIdentities, {
    fields: [boards.avatarIdentityId],
    references: [avatarIdentities.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  board: one(boards, {
    fields: [messages.boardId],
    references: [boards.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  board: one(boards, {
    fields: [assets.boardId],
    references: [boards.id],
  }),
  productAssets: many(productAssets),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  board: one(boards, {
    fields: [products.boardId],
    references: [boards.id],
  }),
  productAssets: many(productAssets),
}));

export const productAssetsRelations = relations(productAssets, ({ one }) => ({
  product: one(products, {
    fields: [productAssets.productId],
    references: [products.id],
  }),
  asset: one(assets, {
    fields: [productAssets.assetId],
    references: [assets.id],
  }),
}));

export const generatedItemsRelations = relations(generatedItems, ({ one }) => ({
  board: one(boards, {
    fields: [generatedItems.boardId],
    references: [boards.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  board: one(boards, {
    fields: [jobs.boardId],
    references: [boards.id],
  }),
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
}));
