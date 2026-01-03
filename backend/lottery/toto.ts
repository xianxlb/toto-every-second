import { z } from "zod";
import { lottery } from "./base.ts";
import { randomInt } from "./util.ts";

// Singapore Toto: Pick 6 numbers from 1-49
// Draw: 6 winning numbers + 1 additional number
// Jackpot: Match all 6 winning numbers
// Odds: 1 in 13,983,816

// Real frequency data from Singapore Pools (Oct 9, 2014 onwards)
// Source: https://www.singaporepools.com.sg/en/product/Pages/toto_wnf.aspx
const mainBallFrequency: Record<number, number> = {
  1: 152, 2: 148, 3: 137, 4: 141, 5: 148, 6: 137, 7: 134, 8: 149, 9: 144, 10: 148,
  11: 134, 12: 153, 13: 135, 14: 132, 15: 168, 16: 131, 17: 138, 18: 132, 19: 139, 20: 140,
  21: 136, 22: 153, 23: 136, 24: 146, 25: 128, 26: 133, 27: 137, 28: 155, 29: 128, 30: 146,
  31: 144, 32: 149, 33: 119, 34: 142, 35: 147, 36: 145, 37: 145, 38: 139, 39: 133, 40: 163,
  41: 129, 42: 123, 43: 138, 44: 148, 45: 117, 46: 153, 47: 133, 48: 143, 49: 152,
};

const additionalFrequency: Record<number, number> = {
  1: 27, 2: 26, 3: 21, 4: 16, 5: 19, 6: 31, 7: 23, 8: 25, 9: 18, 10: 24,
  11: 16, 12: 22, 13: 24, 14: 18, 15: 20, 16: 27, 17: 19, 18: 26, 19: 22, 20: 35,
  21: 27, 22: 22, 23: 24, 24: 24, 25: 24, 26: 20, 27: 24, 28: 20, 29: 28, 30: 23,
  31: 30, 32: 13, 33: 32, 34: 30, 35: 25, 36: 26, 37: 24, 38: 18, 39: 23, 40: 16,
  41: 24, 42: 27, 43: 19, 44: 25, 45: 20, 46: 25, 47: 20, 48: 30, 49: 28,
};

// Weighted random selection based on frequency
function weightedRandomSelect(
  frequency: Record<number, number>,
  exclude: number[] = []
): number {
  const available = Object.entries(frequency)
    .filter(([num]) => !exclude.includes(Number(num)))
    .map(([num, weight]) => ({ num: Number(num), weight }));

  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  let random = randomInt(1, totalWeight);

  for (const item of available) {
    random -= item.weight;
    if (random <= 0) {
      return item.num;
    }
  }

  return available[available.length - 1].num;
}

const totoSchema = z.object({
  type: z.literal("toto"),
  numbers: z.array(z.number()).length(6),
  additional: z.number(), // The additional number (bonus ball)
});

export const toto = lottery("toto", totoSchema, {
  async draw() {
    const numbers: number[] = [];

    // Draw 6 unique main numbers using weighted selection
    while (numbers.length < 6) {
      const num = weightedRandomSelect(mainBallFrequency, numbers);
      numbers.push(num);
    }

    // Draw additional number using its own frequency (excluding main numbers)
    const additional = weightedRandomSelect(additionalFrequency, numbers);

    // Sort winning numbers
    const winningNumbers = numbers.sort((a, b) => a - b);

    return {
      type: "toto" as const,
      numbers: winningNumbers,
      additional: additional,
    };
  },

  score(draw, guess) {
    // Count matching main numbers (guess numbers vs draw main numbers)
    const mainMatches = guess.numbers.filter((num) =>
      draw.numbers.includes(num)
    ).length;

    // Check if any guess number matches the draw's additional number
    const additionalMatch = guess.numbers.includes(draw.additional) ? 1 : 0;

    // Scoring based on Singapore Toto prize groups:
    // Group 1: 6 main numbers = 1.0 (Jackpot)
    // Group 2: 5 main + additional = 0.85
    // Group 3: 5 main = 0.7
    // Group 4: 4 main + additional = 0.55
    // Group 5: 4 main = 0.4
    // Group 6: 3 main + additional = 0.25
    // Group 7: 3 main = 0.1
    // No prize: less than 3 matches = 0

    if (mainMatches === 6) return 1.0; // Jackpot!
    if (mainMatches === 5 && additionalMatch) return 0.85;
    if (mainMatches === 5) return 0.7;
    if (mainMatches === 4 && additionalMatch) return 0.55;
    if (mainMatches === 4) return 0.4;
    if (mainMatches === 3 && additionalMatch) return 0.25;
    if (mainMatches === 3) return 0.1;

    return 0;
  },
});
