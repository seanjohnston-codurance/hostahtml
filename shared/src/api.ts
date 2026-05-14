export type UploadResponse = {
  url: string;
  key: string;
  createdAt: number;
  expiresAt: number;
  expiresInDays: number;
  draft?: boolean;
};

export type ShareSummary = {
  token: string;
  url: string;
  filename: string;
  title?: string;
  createdAt: number;
  expiresAt: number;
  draft: boolean;
  deleted: boolean;
};

export type ListSharesResponse = { shares: ShareSummary[] };

export type UpdateShareResponse = { share: ShareSummary };

export type ErrorResponse = { error: string };
