// Fix for iOS "Protocol error" when RN's <Image> fetches R2/Cloudinary URLs
// whose filenames or path segments contain spaces or other characters that
// aren't URL-safe. Browsers silently percent-encode these before hitting the
// network; RN's networking does not, so the request goes out malformed and
// iOS fails with "The operation couldn't be completed. Protocol error".
//
// Fresh uploads made through the app happened to have clean names and
// worked; older items (uploaded from the website with a messier original
// filename) failed at 100% — matching the exact symptom reported.
//
// This safely encodes ONLY the parts that need it — the path segments and
// query values — while leaving protocol, host, and separators alone, so it
// idempotently normalises URLs that are already partially encoded and
// leaves valid URLs untouched.
export function safeImageUri(input) {
  if (!input) return '';
  const uri = typeof input === 'string' ? input : (input.url || input.src || input.image || '');
  if (typeof uri !== 'string' || !uri) return '';

  try {
    const u = new URL(uri);
    // Re-encode each already-decoded path segment. decodeURIComponent on an
    // unencoded segment is a no-op, so this doesn't double-encode.
    u.pathname = u.pathname
      .split('/')
      .map((seg) => (seg ? encodeURIComponent(decodeURIComponent(seg)) : ''))
      .join('/');
    // Same for query params.
    if (u.search) {
      const params = new URLSearchParams();
      u.searchParams.forEach((v, k) => params.append(k, v));
      u.search = params.toString() ? `?${params.toString()}` : '';
    }
    return u.toString();
  } catch (_) {
    // Not a parseable URL — fall through to a best-effort encode of any
    // literal spaces (the single most common offender in R2 keys).
    return uri.replace(/ /g, '%20');
  }
}
