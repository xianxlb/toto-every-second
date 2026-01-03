import { z, ZodObject } from "zod";

interface Lottery<T> {
  draw(): Promise<T>;
  score(guess: T, target: T): number;
}

function lottery<
  T extends z.ZodRawShape & { type: z.ZodType<TTkey> },
  TTkey extends string,
>(type: TTkey, data: ZodObject<T>, generator: Lottery<z.infer<ZodObject<T>>>) {
  return {
    ...generator,
    type: type,
    load(v: unknown) {
      return data.parse(v);
    },
    schema: data,
  };
}

export { lottery };
