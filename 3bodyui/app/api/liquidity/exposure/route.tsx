import { proxy } from "@/lib/proxy";
import { internalFetch } from "@/lib/internalFetch";

// Required for static export with Next.js
export const dynamic = "force-static";

export async function GET() {
  const data = await proxy(
    async (ctx) => {
      return internalFetch("/liquidity/exposure", {
        context: ctx,
      });
    },
    ["liquidity_provider"]
  );

  return Response.json(data);
}
