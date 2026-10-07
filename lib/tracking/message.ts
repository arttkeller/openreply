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
 * First name from an Instagram profile name ("ANA paula 🏡" -> "Ana"). Returns
 * null when the first word is not a plain name (emoji, digits, "@handle"), so
 * the message drops the greeting instead of addressing someone by a brand.
 */
export function firstNameFrom(profileName: string | null | undefined): string | null {
  const word = profileName?.trim().split(/\s+/)[0] ?? "";
  if (!/^\p{L}[\p{L}'-]{1,19}$/u.test(word)) return null;
  const rest = word.slice(1);
  return word[0].toUpperCase() + (rest === rest.toUpperCase() ? rest.toLowerCase() : rest);
}

/**
 * Remove an unfilled {first_name} with the comma/space that introduced it
 * ("Aqui está, {first_name}!" -> "Aqui está!"). The worker fills the token
 * only where the conversation is open (Instagram shares the profile name only
 * then), so the opening DM, follow prompt and public replies land here.
 */
export function dropFirstName(message: string) {
  return message
    .replace(/^\s*\{first_name\}[\s,!.]*/i, "")
    .replace(/,?[ \t]*\{first_name\}/gi, "");
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
  return dropFirstName(message)
    .replace(/\{username\}/gi, commenterName ?? "there")
    .replace(/\s*\{link\}\s*/gi, " ")
    .trim();
}

export function buildTrackedUrl(
  slug: string,
  baseUrl?: string,
  recipientToken?: string
) {
  const resolvedBaseUrl =
    baseUrl ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXTAUTH_URL ?? "http://localhost:3000");

  const url = `${resolvedBaseUrl.replace(/\/$/, "")}/r/${slug}`;
  return recipientToken ? `${url}?r=${recipientToken}` : url;
}

export function renderMessageWithTracking({
  message,
  commenterName,
  trackedLinks,
  baseUrl,
  recipientToken,
}: {
  message: string;
  commenterName?: string | null;
  trackedLinks?: MessageTrackedLink[];
  baseUrl?: string;
  recipientToken?: string;
}) {
  let rendered = dropFirstName(message).replace(
    /\{username\}/gi,
    commenterName ?? "there"
  );
  const primaryLink = trackedLinks?.[0];

  if (!primaryLink) return rendered;

  const trackedUrl = buildTrackedUrl(primaryLink.slug, baseUrl, recipientToken);

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
