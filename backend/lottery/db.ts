import { DatabaseSync } from "node:sqlite";
import { z, ZodObject } from "zod";

const dbPath = Deno.env.get("DATABASE_PATH") || "db.db";
const db = new DatabaseSync(dbPath);

db.exec(
  `
  CREATE TABLE IF NOT EXISTS draw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lottery_type TEXT,
    draw TEXT,
    guesses TEXT,
    score FLOAT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_draw_type ON draw (lottery_type);
  CREATE INDEX IF NOT EXISTS idx_score ON draw (score);
  `,
);

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

export { db, drawSchema };
