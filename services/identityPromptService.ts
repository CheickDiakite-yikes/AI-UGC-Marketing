import { BrandIdentity, AvatarIdentity, Product } from '@/types';
import { db } from '@/db';
import { boards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildIdentityConstraints } from './identityPromptUtils';

export async function compileVisualPromptWithIdentity(params: {
  boardId: string;
  basePrompt: string;
  productId?: string | null;
  traceId?: string;
}): Promise<{ prompt: string; productIdUsed?: string; notes: string[] }> {
  const { boardId, basePrompt, productId, traceId } = params;

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    with: {
      brandIdentity: true,
      avatarIdentity: true,
      products: true
    }
  });

  if (!board) {
    return { prompt: basePrompt, notes: ['Board not found for identity compilation'] };
  }

  const compiled = buildIdentityConstraints({
    basePrompt,
    brandIdentity: board.brandIdentity as BrandIdentity | null,
    avatarIdentity: board.avatarIdentity as AvatarIdentity | null,
    products: board.products as Product[] | undefined,
    productId
  });

  if (traceId) {
    console.log(`[PROMPT COMPILER ${traceId}] Applied identity constraints`, {
      productIdUsed: compiled.productIdUsed || null
    });
  }

  return compiled;
}
