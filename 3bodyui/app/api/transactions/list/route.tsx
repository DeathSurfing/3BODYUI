import { proxy } from "@/lib/proxy";
import { internalFetch } from "@/lib/internalFetch";

// Required for static export with Next.js
export const dynamic = "force-static";

export async function GET() {
  const data = await proxy(
    async (ctx) => {
      return internalFetch("/transactions/list", {
        context: ctx,
      });
    },
    ["merchant", "liquidity_provider"]
  );

  return Response.json(data);
}
