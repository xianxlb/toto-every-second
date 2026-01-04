import { z, ZodObject } from "zod";

// Use Deno KV for storage (works on Deno Deploy)
const kv = await Deno.openKv();

interface DrawRecord {
  id: number;
  lottery_type: string;
  draw: unknown;
  guesses: unknown;
  score: number;
  timestamp: string;
}

// Get next ID with atomic increment
async function getNextId(): Promise<number> {
  while (true) {
    const result = await kv.get<number>(["counter", "draw"]);
    const currentId = result.value || 0;
    const nextId = currentId + 1;
    const res = await kv.atomic()
      .check(result)
      .set(["counter", "draw"], nextId)
      .commit();
    if (res.ok) {
      return nextId;
    }
  }
}

// Increment a counter atomically
async function incrementCounter(key: Deno.KvKey): Promise<void> {
  while (true) {
    const result = await kv.get<number>(key);
    const current = result.value || 0;
    const res = await kv.atomic()
      .check(result)
      .set(key, current + 1)
      .commit();
    if (res.ok) return;
  }
}

// Save a draw
async function saveDraw(record: Omit<DrawRecord, "id" | "timestamp">): Promise<DrawRecord> {
  const id = await getNextId();
  const timestamp = new Date().toISOString();
  const fullRecord: DrawRecord = { ...record, id, timestamp };

  // Use a padded key for proper ordering (supports up to 999,999,999 draws)
  const paddedId = id.toString().padStart(9, "0");

  await kv.set(["draw", paddedId], fullRecord);
  await kv.set(["draw_by_type", record.lottery_type, paddedId], fullRecord);

  // Increment counters atomically
  await incrementCounter(["count_by_type", record.lottery_type]);
  if (record.score > 0) {
    await incrementCounter(["count_by_score", record.score.toString()]);
  }

  return fullRecord;
}

// Get draws by type with pagination (optimized with proper key ordering)
async function getDrawsByType(type: string, limit: number, offset: number): Promise<DrawRecord[]> {
  const draws: DrawRecord[] = [];
  const iter = kv.list<DrawRecord>({ prefix: ["draw_by_type", type] }, { reverse: true });

  let count = 0;
  let skipped = 0;

  for await (const entry of iter) {
    if (skipped < offset) {
      skipped++;
      continue;
    }
    if (count >= limit) break;
    draws.push(entry.value);
    count++;
  }

  return draws;
}

// Get total count by type (O(1) using counter)
async function getTotalByType(type: string): Promise<number> {
  const result = await kv.get<number>(["count_by_type", type]);
  return result.value || 0;
}

// Get count by score (O(1) using counter)
async function getCountByScore(score: number): Promise<number> {
  const result = await kv.get<number>(["count_by_score", score.toString()]);
  return result.value || 0;
}

// Clear all data and reset counters
async function clearAllData(): Promise<void> {
  await kv.set(["maintenance"], true);
  await new Promise(resolve => setTimeout(resolve, 2000));

  const keys: Deno.KvKey[] = [];
  const iter = kv.list({ prefix: [] });
  for await (const entry of iter) {
    keys.push(entry.key);
  }

  for (let i = 0; i < keys.length; i += 10) {
    const batch = keys.slice(i, i + 10);
    const op = kv.atomic();
    for (const key of batch) {
      op.delete(key);
    }
    await op.commit();
  }

  await kv.set(["counter", "draw"], 0);
  await kv.set(["last_draw_second"], 0);
  await kv.delete(["maintenance"]);
}

// Check if in maintenance mode
async function isInMaintenance(): Promise<boolean> {
  const result = await kv.get<boolean>(["maintenance"]);
  return result.value === true;
}

const parseJsonPreprocessor = (value: unknown, ctx: z.RefinementCtx) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      ctx.addIssue({
        code: "custom",
        message: (e as Error).message,
      });
    }
  }
  return value;
};

const drawSchema = <T extends ZodObject>(schema: T) =>
  z.object({
    id: z.number(),
    lottery_type: z.string(),
    score: z.number(),
    guesses: z.preprocess(parseJsonPreprocessor, z.array(schema)),
    draw: z.preprocess(parseJsonPreprocessor, schema),
    timestamp: z.coerce.date(),
  });

// Try to acquire a slot for the current second
async function tryAcquireSecondSlot(): Promise<boolean> {
  const currentSecond = Math.floor(Date.now() / 1000);
  const result = await kv.get<number>(["last_draw_second"]);

  if (result.value === currentSecond) {
    return false;
  }

  const res = await kv.atomic()
    .check(result)
    .set(["last_draw_second"], currentSecond)
    .commit();

  return res.ok;
}

export { saveDraw, getDrawsByType, getTotalByType, getCountByScore, clearAllData, tryAcquireSecondSlot, isInMaintenance, drawSchema };
