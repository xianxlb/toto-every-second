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

// Get next ID
async function getNextId(): Promise<number> {
  const result = await kv.get<number>(["counter", "draw"]);
  const nextId = (result.value || 0) + 1;
  await kv.set(["counter", "draw"], nextId);
  return nextId;
}

// Save a draw
async function saveDraw(record: Omit<DrawRecord, "id" | "timestamp">): Promise<DrawRecord> {
  const id = await getNextId();
  const timestamp = new Date().toISOString();
  const fullRecord: DrawRecord = { ...record, id, timestamp };

  await kv.set(["draw", id], fullRecord);
  await kv.set(["draw_by_type", record.lottery_type, id], fullRecord);

  return fullRecord;
}

// Get draws by type with pagination
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

// Get total count by type
async function getTotalByType(type: string): Promise<number> {
  let count = 0;
  const iter = kv.list({ prefix: ["draw_by_type", type] });
  for await (const _ of iter) {
    count++;
  }
  return count;
}

// Get count by score
async function getCountByScore(score: number): Promise<number> {
  let count = 0;
  const iter = kv.list<DrawRecord>({ prefix: ["draw"] });
  for await (const entry of iter) {
    if (entry.value && entry.value.score === score) {
      count++;
    }
  }
  return count;
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

export { saveDraw, getDrawsByType, getTotalByType, getCountByScore, drawSchema };
