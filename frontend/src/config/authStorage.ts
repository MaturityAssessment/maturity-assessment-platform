const ACCESS_TOKEN_FALLBACK_KEY = "auth_token";
const REFRESH_TOKEN_FALLBACK_KEY = "refresh_token";

const isValidStorageKey = (value: string | undefined): value is string =>
  Boolean(value && value !== "undefined" && value !== "null");

export const ACCESS_TOKEN_STORAGE_KEY = isValidStorageKey(process.env.NEXT_PUBLIC_TOKEN)
  ? process.env.NEXT_PUBLIC_TOKEN
  : ACCESS_TOKEN_FALLBACK_KEY;

export const REFRESH_TOKEN_STORAGE_KEY = isValidStorageKey(
  process.env.NEXT_PUBLIC_REFRESH_TOKEN
)
  ? process.env.NEXT_PUBLIC_REFRESH_TOKEN
  : REFRESH_TOKEN_FALLBACK_KEY;
