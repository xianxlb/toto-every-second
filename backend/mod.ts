import { toto } from "./lottery/toto.ts";
import { drawSchema } from "./lottery/db.ts";
import z from "zod";

export { toto };

export const totoDrawSchema = drawSchema(toto.schema);

export type TotoDraw = z.infer<typeof toto.schema>;
export type TotoResult = z.infer<typeof totoDrawSchema>;
