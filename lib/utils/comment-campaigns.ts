import { matchKeywords, type KeywordMatchResult } from "@/lib/utils/keyword-matcher";

/**
 * Pick the campaigns a comment should fire. A campaign bound to a keyword is
 * more specific than an "any word" campaign, so when at least one keyword
 * campaign matches, the "any word" campaigns leave that comment alone.
 * Otherwise both would answer it: two public replies, and the second private
 * reply fails because Instagram allows only one per comment.
 */
export function selectCommentMatches<T extends { matchAnyWord: boolean; keywords: string[]; wholeWordMatch: boolean }>(
  commentText: string,
  automations: T[]
): { automation: T; matchResult: KeywordMatchResult }[] {
  const keywordHits = automations
    .filter((a) => !a.matchAnyWord)
    .map((automation) => ({ automation, matchResult: matchKeywords(commentText, automation.keywords, automation.wholeWordMatch) }))
    .filter((hit) => hit.matchResult.matched);
  if (keywordHits.length > 0) return keywordHits;
  return automations
    .filter((a) => a.matchAnyWord)
    .map((automation) => ({ automation, matchResult: { matched: true, matchedKeyword: null } as KeywordMatchResult }));
}
