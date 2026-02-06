import { proxy } from "@/lib/proxy";
import { internalFetch } from "@/lib/internalFetch";

export async function POST(req: Request) {
  const body = await req.json();

  const data = await proxy(
    async (ctx) => {
      return internalFetch("/transactions/create", {
        body,
        context: ctx,
      });
    },
    ["payee"]
  );

  return Response.json(data);
}
