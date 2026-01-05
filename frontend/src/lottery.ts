// Seeded random number generator (Mulberry32)
// Same seed always produces same sequence
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate N unique random numbers in range [min, max]
function generateUniqueNumbers(
  rng: () => number,
  count: number,
  min: number,
  max: number
): number[] {
  const numbers: Set<number> = new Set();
  while (numbers.size < count) {
    const num = Math.floor(rng() * (max - min + 1)) + min;
    numbers.add(num);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

// Generate a single random number in range [min, max], excluding certain numbers
function generateNumber(
  rng: () => number,
  min: number,
  max: number,
  exclude: number[] = []
): number {
  let num: number;
  do {
    num = Math.floor(rng() * (max - min + 1)) + min;
  } while (exclude.includes(num));
  return num;
}

export interface TotoDraw {
  numbers: number[];
  additional: number;
}

export interface TotoResult {
  id: number;
  lottery_type: "toto";
  draw: TotoDraw;
  guesses: TotoDraw[];
  score: number;
  timestamp: Date;
}

// Generate TOTO draw for a given second (deterministic)
export function generateTotoDraw(secondTimestamp: number): TotoDraw {
  const rng = mulberry32(secondTimestamp);
  const numbers = generateUniqueNumbers(rng, 6, 1, 49);
  const additional = generateNumber(rng, 1, 49, numbers);
  return { numbers, additional };
}

// Generate a quick pick (random guess)
export function generateQuickPick(secondTimestamp: number): TotoDraw {
  // Use a different seed for the guess (add offset)
  const rng = mulberry32(secondTimestamp + 1000000000);
  const numbers = generateUniqueNumbers(rng, 6, 1, 49);
  const additional = generateNumber(rng, 1, 49, numbers);
  return { numbers, additional };
}

// Calculate score based on Singapore TOTO rules
export function calculateScore(draw: TotoDraw, guess: TotoDraw): number {
  const mainMatches = guess.numbers.filter((n) =>
    draw.numbers.includes(n)
  ).length;
  const additionalMatch =
    guess.numbers.includes(draw.additional) ||
    draw.numbers.includes(guess.additional);

  // Group 1: 6 main numbers
  if (mainMatches === 6) return 1.0;
  // Group 2: 5 main + additional
  if (mainMatches === 5 && additionalMatch) return 0.85;
  // Group 3: 5 main numbers
  if (mainMatches === 5) return 0.7;
  // Group 4: 4 main + additional
  if (mainMatches === 4 && additionalMatch) return 0.55;
  // Group 5: 4 main numbers
  if (mainMatches === 4) return 0.4;
  // Group 6: 3 main + additional
  if (mainMatches === 3 && additionalMatch) return 0.25;
  // Group 7: 3 main numbers
  if (mainMatches === 3) return 0.1;

  return 0;
}

// Generate a complete result for a given second
export function generateResult(secondTimestamp: number, drawNumber: number): TotoResult {
  const draw = generateTotoDraw(secondTimestamp);
  const guess = generateQuickPick(secondTimestamp);
  const score = calculateScore(draw, guess);

  return {
    id: drawNumber,
    lottery_type: "toto",
    draw,
    guesses: [guess],
    score,
    timestamp: new Date(secondTimestamp * 1000),
  };
}

// Get the current second timestamp
export function getCurrentSecond(): number {
  return Math.floor(Date.now() / 1000);
}

// Prize amounts
export const prizeAmounts: Record<number, number> = {
  1.0: 1000000, // Group 1: Jackpot
  0.85: 100000, // Group 2: 5 + Additional
  0.7: 50000, // Group 3: 5 numbers
  0.55: 2000, // Group 4: 4 + Additional
  0.4: 50, // Group 5: 4 numbers
  0.25: 25, // Group 6: 3 + Additional
  0.1: 10, // Group 7: 3 numbers
};
