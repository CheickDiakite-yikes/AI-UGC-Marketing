import { BrandIdentity, AvatarIdentity, Product, BrandContext } from '@/types';
import { db } from '@/db';
import { boards, users } from '@/db/schema';
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

  let brandContext: BrandContext | null = null;
  if (board.userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, board.userId),
      columns: { brandContext: true }
    });
    brandContext = (user?.brandContext as BrandContext) || null;
  }

  const compiled = buildIdentityConstraints({
    basePrompt,
    brandIdentity: board.brandIdentity as unknown as BrandIdentity | null,
    avatarIdentity: board.avatarIdentity as unknown as AvatarIdentity | null,
    products: board.products as unknown as Product[] | undefined,
    productId,
    brandContext
  });

  if (traceId) {
    console.log(`[PROMPT COMPILER ${traceId}] Applied identity constraints`, {
      productIdUsed: compiled.productIdUsed || null,
      hasBrandContext: !!brandContext
    });
  }

  return compiled;
}
