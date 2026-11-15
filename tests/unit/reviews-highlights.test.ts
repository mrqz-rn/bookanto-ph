import { describe, expect, it } from "vitest";

import { REVIEW_HIGHLIGHTS } from "@/features/reviews/constants";

describe("review highlights keyword matching and statistics", () => {
  it("defines standard Filipino service business categories", () => {
    const ids = REVIEW_HIGHLIGHTS.map((h) => h.id);
    expect(ids).toContain("clean");
    expect(ids).toContain("skilled");
    expect(ids).toContain("punctual");
    expect(ids).toContain("friendly");
    expect(ids).toContain("value");
    expect(ids).toContain("relaxing");
  });

  it("matches Tagalog and English keywords in customer comments", () => {
    const sampleComments = [
      "Sobrang linis ng place at malinis ang gamit!",
      "Super bait ng staff, very accommodating at friendly.",
      "Pulido ang gupit, magaling ang barber. High skill!",
      "Sulit ang bayad, very affordable price. Worth every peso!",
      "Mabilis at on time, walang waiting time.",
      "Presko at very relaxing atmosphere.",
    ];

    const matchKeywords = (text: string, tagId: string) => {
      const tag = REVIEW_HIGHLIGHTS.find((h) => h.id === tagId);
      if (!tag) return false;
      const lower = text.toLowerCase();
      return tag.keywords.some((kw) => lower.includes(kw.toLowerCase()));
    };

    expect(matchKeywords(sampleComments[0]!, "clean")).toBe(true);
    expect(matchKeywords(sampleComments[1]!, "friendly")).toBe(true);
    expect(matchKeywords(sampleComments[2]!, "skilled")).toBe(true);
    expect(matchKeywords(sampleComments[3]!, "value")).toBe(true);
    expect(matchKeywords(sampleComments[4]!, "punctual")).toBe(true);
    expect(matchKeywords(sampleComments[5]!, "relaxing")).toBe(true);
  });

  it("calculates accurate distribution percentages and average rating", () => {
    const ratings = [5, 5, 5, 4, 4, 3, 2, 1, 5, 5]; // 10 reviews total
    // 5-stars: 5, 4-stars: 2, 3-stars: 1, 2-stars: 1, 1-star: 1
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    let recommendCount = 0;

    for (const r of ratings) {
      distribution[r as 1 | 2 | 3 | 4 | 5]++;
      sum += r;
      if (r >= 4) recommendCount++;
    }

    const avg = Math.round((sum / ratings.length) * 10) / 10;
    const recommendRate = Math.round((recommendCount / ratings.length) * 100);

    expect(distribution[5]).toBe(5);
    expect(distribution[4]).toBe(2);
    expect(distribution[3]).toBe(1);
    expect(distribution[2]).toBe(1);
    expect(distribution[1]).toBe(1);
    expect(avg).toBe(3.9);
    expect(recommendRate).toBe(70); // 7 out of 10 are >= 4 stars
  });
});
