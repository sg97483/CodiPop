export const CLOTHING_SIZE_LABELS = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXL+',
] as const;

export type ClothingSizeLabel = (typeof CLOTHING_SIZE_LABELS)[number];

export type BodySizeProfile = {
  heightCm: number;
  weightKg: number;
  usualSize: ClothingSizeLabel;
  updatedAt?: any;
};

export type SizeRecommendInput = {
  heightCm: number;
  weightKg: number;
  usualSize: ClothingSizeLabel;
  category?: string;
  /** 상품에 표기된 사이즈가 있으면 비교용 */
  productSize?: string;
};

export type SizeRecommendResult = {
  recommendedSize: ClothingSizeLabel;
  confidence: 'low' | 'medium' | 'high';
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  bmi: number;
  fitHint: 'smaller' | 'similar' | 'larger';
};
