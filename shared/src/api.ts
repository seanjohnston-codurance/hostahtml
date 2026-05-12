export type UploadResponse = {
  url: string;
  key: string;
  expiresInDays: number;
};

export type ErrorResponse = { error: string };
