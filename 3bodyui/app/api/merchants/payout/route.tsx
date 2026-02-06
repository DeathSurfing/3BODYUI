import { proxy } from "@/lib/proxy";
import { internalFetch } from "@/lib/internalFetch";

export async function POST(req: Request) {
  const body = await req.json();

  const data = await proxy(
    async (ctx) => {
      return internalFetch("/merchants/payout", {
        body,
        context: ctx,
      });
    },
    ["merchant"]
  );

  return Response.json(data);
}
