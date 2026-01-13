
import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Enums ---
export const assetTypeEnum = pgEnum('asset_type', ['logo', 'image', 'pdf', 'text', 'link', 'avatar']);
export const itemTypeEnum = pgEnum('item_type', ['text', 'image', 'video', 'carousel']);
export const roleEnum = pgEnum('role', ['user', 'model', 'system']);

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Relations ---

export const boardsRelations = relations(boards, ({ many, one }) => ({
  assets: many(assets),
  generatedItems: many(generatedItems),
  messages: many(messages),
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

export const assetsRelations = relations(assets, ({ one }) => ({
  board: one(boards, {
    fields: [assets.boardId],
    references: [boards.id],
  }),
}));

export const generatedItemsRelations = relations(generatedItems, ({ one }) => ({
  board: one(boards, {
    fields: [generatedItems.boardId],
    references: [boards.id],
  }),
}));
