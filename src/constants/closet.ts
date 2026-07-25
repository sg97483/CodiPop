export const CLOSET_FILTER_CATEGORIES = ['ALL', 'TOPS', 'BOTTOMS', 'SHOES', 'OUTER'] as const;
export const CLOSET_SAVE_CATEGORIES = ['TOPS', 'BOTTOMS', 'SHOES', 'OUTER'] as const;

export type ClosetSaveCategory = (typeof CLOSET_SAVE_CATEGORIES)[number];

export const MAX_CLOSET_ITEMS = 30;
export const PENDING_SHARE_IMAGE_KEY = 'pendingShareImageUri';
