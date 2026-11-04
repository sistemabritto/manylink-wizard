export interface MessageTrackedLink {
  slug: string;
  destinationUrl: string;
}

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/i;

function trimTrailingPunctuation(url: string) {
  return url.replace(/[.,!?;:]+$/, "");
}

export function extractFirstUrl(message: string): string | null {
  const match = message.match(URL_PATTERN);
  if (!match) return null;

  try {
    const url = trimTrailingPunctuation(match[0]);
    return new URL(url).toString();
  } catch {
    return null;
  }
}

export function replaceUrlWithTrackedPlaceholder(
  message: string,
  destinationUrl: string | null | undefined
) {
  if (!destinationUrl) return message;
  if (message.includes(destinationUrl)) {
    return message.replace(destinationUrl, "{link}");
  }

  const withoutTrailingSlash = destinationUrl.replace(/\/$/, "");
  return message.replace(withoutTrailingSlash, "{link}");
}

/**
 * Personalize {username} and strip the {link} token — used when the link is
 * delivered as a separate button rather than inline in the message text.
 */
export function renderMessageWithoutLink({
  message,
  commenterName,
}: {
  message: string;
  commenterName?: string | null;
}) {
  return message
    .replace(/\{username\}/gi, commenterName ?? "there")
    .replace(/\s*\{link\}\s*/gi, " ")
    .trim();
}

/**
 * Placeholder a tracked link's destination can carry to receive the post the
 * click came from (e.g. `utm_campaign=ig_{post}`). Filled at redirect time from
 * the `o` query param, so one campaign/link works for every post.
 */
export const LINK_ORIGIN_PLACEHOLDER = /\{post\}|%7Bpost%7D/gi;
export const UNKNOWN_LINK_ORIGIN = "sem_post";

/** Keep only URL/UTM-safe origin tags (post shortcode or media id). */
export function sanitizeLinkOrigin(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? trimmed : null;
}

export function resolveTrackedDestination(
  destinationUrl: string,
  origin?: string | null
): string {
  return destinationUrl.replace(
    LINK_ORIGIN_PLACEHOLDER,
    sanitizeLinkOrigin(origin) ?? UNKNOWN_LINK_ORIGIN
  );
}

export function buildTrackedUrl(
  slug: string,
  baseUrl?: string,
  origin?: string | null
) {
  const resolvedBaseUrl =
    baseUrl ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXTAUTH_URL ?? "http://localhost:3000");
  const safeOrigin = sanitizeLinkOrigin(origin);

  return `${resolvedBaseUrl.replace(/\/$/, "")}/r/${slug}${
    safeOrigin ? `?o=${safeOrigin}` : ""
  }`;
}

export function renderMessageWithTracking({
  message,
  commenterName,
  trackedLinks,
  baseUrl,
  origin,
}: {
  message: string;
  commenterName?: string | null;
  trackedLinks?: MessageTrackedLink[];
  baseUrl?: string;
  origin?: string | null;
}) {
  let rendered = message.replace(/\{username\}/gi, commenterName ?? "there");
  const primaryLink = trackedLinks?.[0];

  if (!primaryLink) return rendered;

  const trackedUrl = buildTrackedUrl(primaryLink.slug, baseUrl, origin);

  if (/\{link\}/i.test(rendered)) {
    return rendered.replace(/\{link\}/gi, trackedUrl);
  }

  if (rendered.includes(primaryLink.destinationUrl)) {
    rendered = rendered.replaceAll(primaryLink.destinationUrl, trackedUrl);
  } else {
    const withoutTrailingSlash = primaryLink.destinationUrl.replace(/\/$/, "");
    rendered = rendered.replaceAll(withoutTrailingSlash, trackedUrl);
  }

  return rendered;
}
