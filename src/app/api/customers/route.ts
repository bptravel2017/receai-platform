import { NextResponse } from "next/server";
import { created, fail, readJsonBody, success } from "@/lib/saas-http";
import { saasRepository } from "@/lib/saas-service";
import { CustomerCreateInput } from "@/lib/saas-types";

export const runtime = "nodejs";

export async function GET() {
  try {
    await saasRepository.validateConnection();
    const customers = await saasRepository.listCustomers();

    return success({ customers });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await saasRepository.validateConnection();
    const body = (await readJsonBody(request)) as CustomerCreateInput;
    const customer = await saasRepository.createCustomer(body);

    return created({ customer });
  } catch (error) {
    return fail(error);
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
