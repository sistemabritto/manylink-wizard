import { describe, expect, it } from "vitest";
import {
  calculateCtr,
  normalizeTopKeywords,
  summarizeDmStatuses,
} from "../lib/tracking/analytics";
import {
  buildTrackedUrl,
  extractFirstUrl,
  renderMessageWithTracking,
  replaceUrlWithTrackedPlaceholder,
} from "../lib/tracking/message";

describe("tracked link messages", () => {
  it("extracts a destination URL and replaces it with the tracked placeholder", () => {
    const message =
      "Hey {username}, here is your guide: https://example.com/guide.";
    const url = extractFirstUrl(message);

    expect(url).toBe("https://example.com/guide");
    expect(replaceUrlWithTrackedPlaceholder(message, url)).toBe(
      "Hey {username}, here is your guide: {link}."
    );
  });

  it("renders tracked URLs with username personalization", () => {
    expect(
      renderMessageWithTracking({
        message: "Hey {username}, grab it here: {link}",
        commenterName: "Maya",
        trackedLinks: [
          {
            slug: "abc123",
            destinationUrl: "https://example.com/guide",
          },
        ],
        baseUrl: "https://manychat-alternative.com",
      })
    ).toBe("Hey Maya, grab it here: https://manychat-alternative.com/r/abc123");
  });

  it("can replace a raw destination URL when the placeholder is missing", () => {
    expect(
      renderMessageWithTracking({
        message: "Link: https://example.com/guide",
        trackedLinks: [
          {
            slug: "abc123",
            destinationUrl: "https://example.com/guide",
          },
        ],
        baseUrl: "https://manychat-alternative.com/",
      })
    ).toBe("Link: https://manychat-alternative.com/r/abc123");
  });

  it("matches normalized root URLs with or without trailing slash", () => {
    expect(
      replaceUrlWithTrackedPlaceholder("Link: https://example.com", "https://example.com/")
    ).toBe("Link: {link}");
    expect(
      renderMessageWithTracking({
        message: "Link: https://example.com",
        trackedLinks: [
          {
            slug: "abc123",
            destinationUrl: "https://example.com/",
          },
        ],
        baseUrl: "https://manychat-alternative.com",
      })
    ).toBe("Link: https://manychat-alternative.com/r/abc123");
  });

  it("builds redirect URLs from a base URL", () => {
    expect(buildTrackedUrl("abc123", "https://manychat-alternative.com/")).toBe(
      "https://manychat-alternative.com/r/abc123"
    );
  });
});

describe("campaign analytics helpers", () => {
  it("summarizes DM status rows", () => {
    expect(
      summarizeDmStatuses([
        { status: "SENT", _count: 20 },
        { status: "FAILED", _count: 2 },
        { status: "SKIPPED_RATE_LIMIT", _count: 3 },
        { status: "SKIPPED_PLAN_LIMIT", _count: 1 },
      ])
    ).toEqual({ sent: 20, skipped: 4, failed: 2 });
  });

  it("calculates CTR and handles empty send volume", () => {
    expect(calculateCtr(5, 20)).toBe(25);
    expect(calculateCtr(2, 3)).toBe(66.7);
    expect(calculateCtr(5, 0)).toBe(0);
  });

  it("normalizes top keywords by count", () => {
    expect(
      normalizeTopKeywords([
        { matchedKeyword: "PRICE", _count: 3 },
        { matchedKeyword: null, _count: 9 },
        { matchedKeyword: "LINK", _count: 7 },
      ])
    ).toEqual([
      { keyword: "LINK", count: 7 },
      { keyword: "PRICE", count: 3 },
    ]);
  });
});

describe("link origin (post) tagging", () => {
  it("appends a sanitized origin to tracked urls", async () => {
    const { buildTrackedUrl } = await import("../lib/tracking/message");
    expect(buildTrackedUrl("abc", "https://x.io/", "DQx1")).toBe("https://x.io/r/abc?o=DQx1");
    expect(buildTrackedUrl("abc", "https://x.io", "a b&c")).toBe("https://x.io/r/abc");
    expect(buildTrackedUrl("abc", "https://x.io")).toBe("https://x.io/r/abc");
  });

  it("leaves destinations without the placeholder untouched", async () => {
    const { resolveTrackedDestination } = await import("../lib/tracking/message");
    expect(resolveTrackedDestination("https://x.io/a?utm_campaign=fixo", "DQx1")).toBe(
      "https://x.io/a?utm_campaign=fixo"
    );
    expect(resolveTrackedDestination("https://x.io/a?c=ig_%7Bpost%7D", "DQx1")).toBe(
      "https://x.io/a?c=ig_DQx1"
    );
  });
});
