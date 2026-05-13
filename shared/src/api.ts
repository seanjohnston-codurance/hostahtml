export type UploadResponse = {
  url: string;
  key: string;
  expiresInDays: number;
  draft?: boolean;
};

export type ErrorResponse = { error: string };
