import { NextResponse } from "next/server";
import { created, fail, readJsonBody, success } from "@/lib/saas-http";
import { saasRepository } from "@/lib/saas-service";
import { RevenueRecordCreateInput } from "@/lib/saas-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const customerId = url.searchParams.get("customerId");

    if (id) {
      const revenueRecord = await saasRepository.getRevenueRecord(id);

      return success({ revenueRecord });
    }

    const records = customerId
      ? await saasRepository.listRevenueRecordsByCustomer(customerId)
      : await saasRepository.listRevenueRecords();

    return success({ revenueRecords: records });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as RevenueRecordCreateInput;
    const revenueRecord = await saasRepository.createRevenueRecord(body);

    return created({ revenueRecord });
  } catch (error) {
    return fail(error);
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
