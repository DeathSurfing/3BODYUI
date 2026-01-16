export async function POST(req: Request) {
  const body = await req.json();

  const data = await proxy(
    async (ctx) => {
      return internalFetch("/transactions/execute", {
        body,
        context: ctx,
      });
    },
    ["liquidity_provider"]
  );

  return Response.json(data);
}
