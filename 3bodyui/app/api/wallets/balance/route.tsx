import { NextResponse } from "next/server";
import { proxy } from "@/lib/proxy";
import { internalFetch } from "@/lib/internalFetch";

export async function GET() {
  const data = await proxy(async (ctx) => {
    return internalFetch("/wallets/balance", {
      context: ctx,
    });
  });

  return NextResponse.json(data);
}
