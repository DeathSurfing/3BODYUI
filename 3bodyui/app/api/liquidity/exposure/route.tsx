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
