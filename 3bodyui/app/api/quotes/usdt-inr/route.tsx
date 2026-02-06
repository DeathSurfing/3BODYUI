import { proxy } from "@/lib/proxy";
import { internalFetch } from "@/lib/internalFetch";

// Required for static export with Next.js
export const dynamic = "force-static";

export async function POST(req: Request) {
  const body = await req.json();

  const data = await proxy(async (ctx) => {
    return internalFetch("/quotes/usdt-inr", {
      body,
      context: ctx,
    });
  });

  return Response.json(data);
}
