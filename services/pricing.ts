export type CreditPack = {
  id: string;
  credits: number;
  price: number;
  label: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'credits-50', credits: 50, price: 20, label: '50 credits' },
  { id: 'credits-100', credits: 100, price: 38, label: '100 credits' },
  { id: 'credits-200', credits: 200, price: 75, label: '200 credits' },
];

export const CREDIT_PRICE_FLOOR = CREDIT_PACKS.reduce((min, pack) => {
  const pricePerCredit = pack.price / pack.credits;
  return pricePerCredit < min ? pricePerCredit : min;
}, Number.POSITIVE_INFINITY);
