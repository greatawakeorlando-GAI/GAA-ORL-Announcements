// Turns bare URLs typed into an announcement's message (like
// "https://form.jotform.com/...") into clickable links when displayed.
// Announcements are stored as plain text, not HTML, on purpose -- this
// keeps the data simple and safe (no risk of someone's post breaking the
// page's layout) while still making links usable to read.

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const TRAILING_PUNCTUATION = /[.,!?;:'")\]]+$/;

export function linkify(text) {
  if (!text) return text;

  return text.split(URL_PATTERN).map((segment, i) => {
    const isUrl = /^(https?:\/\/|www\.)/i.test(segment);
    if (!isUrl) return segment;

    // A URL at the end of a sentence often has trailing punctuation
    // ("visit https://example.com.") that isn't really part of the link.
    const trailingMatch = segment.match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const displayUrl = trailing ? segment.slice(0, -trailing.length) : segment;
    const href = displayUrl.startsWith("http") ? displayUrl : `https://${displayUrl}`;

    return (
      <span key={i}>
        <a href={href} target="_blank" rel="noopener noreferrer">
          {displayUrl}
        </a>
        {trailing}
      </span>
    );
  });
}
