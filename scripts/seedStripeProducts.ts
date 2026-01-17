import * as fs from 'fs';
import * as path from 'path';
import { getStripe } from '../services/stripe';
import { PLAN_CATALOG, CREDIT_PACKS } from '../services/subscriptionPlans';

async function seedStripeProducts() {
  console.log('Creating Stripe products and prices...\n');

  const stripe = await getStripe();
  const priceIds: Record<string, string> = {};

  const basicProduct = await stripe.products.create({
    name: 'Predi AI Basic',
    description: PLAN_CATALOG.basic.description,
    metadata: { tier: 'basic' },
  });
  console.log(`Created product: ${basicProduct.name}`);

  const basicPrice = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: (PLAN_CATALOG.basic.priceMonthly ?? 0) * 100,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'basic' },
  });
  priceIds['STRIPE_PRICE_BASIC'] = basicPrice.id;
  console.log(`  Price created for Basic plan`);

  const proProduct = await stripe.products.create({
    name: 'Predi AI Pro',
    description: PLAN_CATALOG.pro.description,
    metadata: { tier: 'pro' },
  });
  console.log(`Created product: ${proProduct.name}`);

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: (PLAN_CATALOG.pro.priceMonthly ?? 0) * 100,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'pro' },
  });
  priceIds['STRIPE_PRICE_PRO'] = proPrice.id;
  console.log(`  Price created for Pro plan`);

  for (const pack of CREDIT_PACKS) {
    const product = await stripe.products.create({
      name: `Predi AI ${pack.label}`,
      description: `${pack.credits} generation credits for Predi AI`,
      metadata: { credits: String(pack.credits) },
    });
    console.log(`Created product: ${product.name}`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.price * 100,
      currency: 'usd',
      metadata: { credits: String(pack.credits) },
    });
    const envKey = `STRIPE_PRICE_CREDITS_${pack.credits}`;
    priceIds[envKey] = price.id;
    console.log(`  Price created for ${pack.credits} credits`);
  }

  const outputPath = path.join(process.cwd(), '.stripe-price-ids');
  const envContent = Object.entries(priceIds)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(outputPath, envContent, 'utf8');

  console.log(`\nDone! Price IDs saved to .stripe-price-ids`);
  console.log('Add these values to your Replit Secrets, then delete the file.');
}

seedStripeProducts().catch((err) => {
  console.error('Error seeding Stripe products:', err);
  process.exit(1);
});
