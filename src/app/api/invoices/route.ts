import { NextResponse } from "next/server";
import { created, fail, readJsonBody, success } from "@/lib/saas-http";
import { saasRepository } from "@/lib/saas-service";
import { GenerateInvoiceInput } from "@/lib/saas-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const revenueRecordId = url.searchParams.get("revenueRecordId");

    if (id) {
      const invoice = await saasRepository.getInvoice(id);

      return success({ invoice });
    }

    if (revenueRecordId) {
      const invoice = await saasRepository.getInvoiceByRevenueRecordId(revenueRecordId);

      return success({ invoice });
    }

    const invoices = await saasRepository.listInvoices();

    return success({ invoices });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as GenerateInvoiceInput;
    const invoice = await saasRepository.createInvoiceFromRevenue(body);

    return created({ invoice });
  } catch (error) {
    return fail(error);
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
