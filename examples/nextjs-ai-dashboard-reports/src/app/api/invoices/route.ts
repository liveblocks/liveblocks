import { NextRequest, NextResponse } from "next/server";
import { invoices } from "@/data/invoices";

export async function POST(req: NextRequest) {
  const { invoiceIds } = await req.json();

  if (!Array.isArray(invoiceIds)) {
    return NextResponse.json(
      { error: "invoiceIds must be an array" },
      { status: 400 }
    );
  }

  const invoiceMap = invoices
    .filter((inv) => invoiceIds.includes(inv.invoice_id))
    .reduce(
      (acc, inv) => {
        acc[inv.invoice_id] = inv;
        return acc;
      },
      {} as Record<string, (typeof invoices)[number]>
    );

  return NextResponse.json({ invoices: invoiceMap });
}
