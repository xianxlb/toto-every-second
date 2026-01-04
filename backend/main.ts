import z from "zod";
import { lottery } from "./lottery/base.ts";
import { saveDraw, getDrawsByType, getTotalByType, getCountByScore, clearAllData, tryAcquireSecondSlot, drawSchema } from "./lottery/db.ts";
import { toto } from "./lottery/toto.ts";

const sleep = (ms: number) =>
  new Promise<void>((res) =>
    setTimeout(() => {
      res();
    }, ms),
  );

async function everySecond(cb: () => Promise<void>) {
  while (true) {
    const now = performance.now();
    try {
      await cb();
    } catch (e) {
      console.error(e);
    }
    const after = performance.now();
    await sleep(1000 - (after - now));
  }
}

async function saveLotteryResult<T extends ReturnType<typeof lottery>>(
  lotteryInstance: T,
) {
  const draw = await lotteryInstance.draw();
  const guess = await lotteryInstance.draw();
  const score = lotteryInstance.score(draw, guess);

  const result = await saveDraw({
    lottery_type: lotteryInstance.type,
    draw: draw,
    guesses: [guess],
    score: score,
  });

  return drawSchema(lotteryInstance.schema).parse(result);
}

const lotteries = [toto];

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const routes = new Map<
  URLPattern,
  (pattern: URLPatternResult, request: Request) => Promise<Response> | Response
>();
const sockets = new Set<WebSocket>();
let isPaused = false;
let pauseUntil = 0;

routes.set(new URLPattern({ pathname: "/ws" }), (_, req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", () => {
    sockets.add(socket);
  });

  socket.addEventListener("close", () => {
    sockets.delete(socket);
  });

  return response;
});

// Prize amounts based on Singapore Pools TOTO structure
// Groups 1-4 use estimated averages, Groups 5-7 are fixed
const prizeAmounts: Record<number, number> = {
  1.0: 1000000,   // Group 1: Jackpot (min guaranteed)
  0.85: 100000,   // Group 2: 5 + Additional
  0.7: 50000,     // Group 3: 5 numbers
  0.55: 2000,     // Group 4: 4 + Additional
  0.4: 50,        // Group 5: 4 numbers (fixed)
  0.25: 25,       // Group 6: 3 + Additional (fixed)
  0.1: 10,        // Group 7: 3 numbers (fixed)
};

routes.set(new URLPattern({ pathname: "/wins" }), async () => {
  const scores = [1.0, 0.85, 0.7, 0.55, 0.4, 0.25, 0.1];
  let totalPrizes = 0;
  let totalWins = 0;

  for (const score of scores) {
    const count = await getCountByScore(score);
    totalWins += count;
    totalPrizes += count * (prizeAmounts[score] || 0);
  }

  const json = JSON.stringify({ wins: totalWins, totalPrizes });

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
});

routes.set(new URLPattern({ pathname: "/clear" }), async () => {
  await clearAllData();
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
});

routes.set(new URLPattern({ pathname: "/history/:type" }), async (pattern, req) => {
  const PAGINATION_ITEMS = 24;

  const type = pattern.pathname.groups.type;
  const url = new URL(req.url);
  const params = url.searchParams;

  const lotteryInstance = lotteries.find((l) => l.type === type);

  if (!lotteryInstance || !type) {
    return new Response(null, { status: 400 });
  }

  const pageParam = Number(params.get("page"));

  const page = isNaN(pageParam) ? 0 : pageParam;

  const total = await getTotalByType(type);

  if (!total) {
    console.error("No results found");
    return new Response(JSON.stringify({ data: [], total: 0 }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }

  const results = await getDrawsByType(type, PAGINATION_ITEMS, PAGINATION_ITEMS * page);

  const parsed = z.array(drawSchema(lotteryInstance.schema)).parse(results);

  const json = JSON.stringify({
    data: parsed,
    total,
  });

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
});

if (import.meta.main) {
  everySecond(async () => {
    // Try to acquire slot for this second - only one draw per second globally
    const acquired = await tryAcquireSecondSlot();
    if (!acquired) {
      return; // Another instance already drew for this second
    }

    const now = Date.now();

    if (isPaused && now < pauseUntil) {
      return;
    }

    if (isPaused && now >= pauseUntil) {
      isPaused = false;
      console.log("Resuming lottery draws after jackpot win!");
    }

    const results = await Promise.all(lotteries.map(saveLotteryResult));
    const payloads = results.map((r) => JSON.stringify(r));

    const hasJackpot = results.some((r) => r.score === 1.0);

    if (hasJackpot) {
      isPaused = true;
      pauseUntil = now + 30000;
      console.log("JACKPOT! Pausing for 30 seconds...");
    }

    sockets.forEach((socket) => {
      payloads.forEach((p) => socket.send(p));
    });
  });

  const port = Number(Deno.env.get("PORT")) || 3350;

  Deno.serve({ port }, (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    for (const [pattern, handler] of routes.entries()) {
      const patternResult = pattern.exec(req.url);
      if (patternResult) {
        return handler(patternResult, req);
      }
    }

    return new Response("Not Found", { status: 404 });
  });
}
