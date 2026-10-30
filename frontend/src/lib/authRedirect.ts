/** Only application-local destinations may survive authentication. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/dashboard";
  try {
    const url = new URL(value, "https://local.invalid");
    // Next's router adds the configured basePath; browser locations already include it.
    if (url.pathname === "/filipevm" || url.pathname.startsWith("/filipevm/")) {
      url.pathname = url.pathname.slice("/filipevm".length) || "/";
    }
    if (url.origin !== "https://local.invalid" || url.pathname === "/login" || url.pathname === "/register") return "/dashboard";
    return url.pathname + url.search;
  } catch { return "/dashboard"; }
}

export function currentReturnTo(): string {
  const query = new URLSearchParams(window.location.search);
  return safeReturnTo(query.get("returnTo") || (window.location.pathname + window.location.search));
}
