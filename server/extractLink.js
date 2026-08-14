// Server-side link metadata extraction.
//
// Reads a pasted event-page URL server-side (Node has no CORS restriction,
// unlike a browser `fetch()`) and pulls out whatever machine-readable event
// data the page publishes for its own link-preview cards: Open Graph <meta>
// tags (og:title, og:description, og:image) and schema.org JSON-LD
// (`<script type="application/ld+json">`, typically `@type: "Event"` with
// `name`, `startDate`, `endDate`, `location`). Event platforms like Partiful
// and Eventbrite both publish this data, since it's what makes their links
// unfurl nicely when pasted into iMessage/Slack/etc.
//
// Deliberately uses plain regex parsing instead of an HTML-parsing library
// dependency, consistent with the rest of the app's "plain, deterministic
// heuristics" approach (see src/lib/autofill.ts) — meta tags and a handful of
// <script> blocks are simple enough that a full DOM parser isn't needed.

const PRIVATE_HOSTNAME_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|::1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|.*\.local)$/i;

/** Throws if the URL isn't a plausible public http(s) page — this endpoint
 * fetches whatever URL a client hands it, so it needs to refuse obviously
 * internal/loopback targets rather than letting itself be used as an SSRF
 * pivot into the server's own network. This is a simple heuristic denylist,
 * not a complete sandbox. */
export function assertSafeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Not a valid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported');
  }
  if (PRIVATE_HOSTNAME_RE.test(parsed.hostname)) {
    throw new Error('That host is not allowed');
  }
  return parsed;
}

const ENTITY_MAP = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
};

export function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, name) => ENTITY_MAP[name])
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function getAttr(tag, attr) {
  const re = new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const m = tag.match(re);
  if (!m) return undefined;
  return decodeHtmlEntities(m[2] ?? m[3] ?? '');
}

function collectEvents(node, out) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectEvents(n, out));
    return;
  }
  if (typeof node !== 'object') return;
  const type = node['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === 'string' && t.toLowerCase().includes('event'))) {
    out.push(node);
  }
  // Some sites (Partiful included, per common JSON-LD conventions) nest the
  // real entries inside a top-level @graph array rather than at the root.
  if (node['@graph']) collectEvents(node['@graph'], out);
}

function describeLocation(loc) {
  if (!loc) return undefined;
  if (typeof loc === 'string') return loc;
  if (Array.isArray(loc)) return describeLocation(loc[0]);
  const name = loc.name;
  const addr = loc.address;
  let addrStr;
  if (typeof addr === 'string') {
    addrStr = addr;
  } else if (addr && typeof addr === 'object') {
    addrStr = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode]
      .filter(Boolean)
      .join(', ');
  }
  return [name, addrStr].filter(Boolean).join(', ') || undefined;
}

/**
 * Pure HTML-in, metadata-out parser — no network access here. Split out from
 * `extractLinkMetadata` so the parsing logic (the part actually worth
 * testing against fixture pages) can be exercised directly, without also
 * having to satisfy `assertSafeUrl`'s SSRF denylist just to point a test at
 * a local fixture server on localhost/a private IP.
 */
export function parseEventHtml(html) {
  const meta = {};
  const metaTagRe = /<meta\b[^>]*>/gi;
  let m;
  while ((m = metaTagRe.exec(html))) {
    const tag = m[0];
    const key = getAttr(tag, 'property') || getAttr(tag, 'name');
    const content = getAttr(tag, 'content');
    if (key && content !== undefined) meta[key.toLowerCase()] = content;
  }

  const titleTagMatch = html.match(/<title>([^<]*)<\/title>/i);

  const events = [];
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ldRe.exec(html))) {
    try {
      const parsedLd = JSON.parse(m[1].trim());
      collectEvents(parsedLd, events);
    } catch {
      // Malformed/partial JSON-LD shouldn't sink the whole extraction —
      // there may still be usable Open Graph tags.
    }
  }
  const event = events[0];

  const title =
    meta['og:title'] || event?.name || (titleTagMatch ? decodeHtmlEntities(titleTagMatch[1]) : undefined);
  const description = meta['og:description'] || meta['description'] || event?.description;
  const image = meta['og:image'];
  const startDate = event?.startDate;
  const endDate = event?.endDate;
  const location = describeLocation(event?.location);

  return { title, description, image, startDate, endDate, location };
}

/**
 * Fetches `url` and extracts whatever title/description/image/date/location
 * data its Open Graph tags and JSON-LD Event structured data expose. Returns
 * `undefined` for any field the page doesn't publish — callers should treat
 * every field as optional and fall back to their own guesses.
 */
export async function extractLinkMetadata(url) {
  const parsed = assertSafeUrl(url);

  const res = await fetch(parsed.toString(), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; HobbiesAppLinkPreview/1.0; +https://example.invalid/bot)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
    throw new Error('Not an HTML page');
  }

  const html = await res.text();
  return parseEventHtml(html);
}
