"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { logWorkspaceUsage } from "@/modules/billing/usage";
import {
  assertCanManageCostReceipts,
  CostReceiptsError,
  getCostReceiptById,
} from "@/modules/cost-receipts/receipts";
import type { ReceiptIntakeStatus } from "@/modules/cost-receipts/types";
import { runReceiptParserScaffold } from "@/modules/cost-receipts/parser";
import { createCostRecord } from "@/modules/costs/actions";
import { CostsError } from "@/modules/costs/costs";
import {
  formatCentsAsAmount,
  getTrimmedField,
  normalizeOptional,
  parseAmountToCents,
  validateCostInput,
  withStatus,
} from "@/modules/costs/validation";

const RECEIPT_BUCKET = "receipt-intake";

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveReviewStatus(args: {
  explicitStatus: string;
  hasCandidateData: boolean;
  classificationComplete: boolean;
  isPosted: boolean;
}): ReceiptIntakeStatus {
  if (args.isPosted) {
    return "posted";
  }

  if (args.explicitStatus === "failed") {
    return "failed";
  }

  if (args.classificationComplete) {
    return "classified";
  }

  if (args.hasCandidateData || args.explicitStatus === "parsed") {
    return "parsed";
  }

  return "uploaded";
}

function hasClassification(input: {
  costScope: string;
  costCategoryId: string;
  customerId: string;
  revenueRecordId: string;
  invoiceId: string;
  revenueRecordItemId: string;
  groupName: string;
}) {
  if (input.costScope === "company") {
    return Boolean(input.costCategoryId);
  }

  if (input.costScope !== "group_linked") {
    return false;
  }

  return Boolean(
    input.customerId ||
      input.revenueRecordId ||
      input.invoiceId ||
      input.revenueRecordItemId ||
      input.groupName,
  );
}

function hasCandidateData(input: {
  candidateDate: string;
  candidateVendorName: string;
  candidateAmount: string;
  candidateDescription: string;
  candidateNote: string;
}) {
  return Boolean(
    input.candidateDate ||
      input.candidateVendorName ||
      input.candidateAmount ||
      input.candidateDescription ||
      input.candidateNote,
  );
}

async function uploadReceiptFile(workspaceId: string, file: File) {
  const admin = createSupabaseAdminClient();
  const baseName = sanitizeFileName(file.name || "receipt-upload");
  const objectPath = `${workspaceId}/${crypto.randomUUID()}-${baseName || "receipt"}`;
  const { error } = await admin.storage.from(RECEIPT_BUCKET).upload(objectPath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new CostReceiptsError("We could not upload that receipt file.");
  }

  return {
    filePath: objectPath,
    fileName: file.name || baseName || "receipt",
    fileMimeType: file.type || null,
    fileSizeBytes: file.size,
  };
}

export async function createCostReceiptIntakeAction(formData: FormData) {
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageCostReceipts(context);

    const tempFileReference = getTrimmedField(formData, "tempFileReference");
    const candidateDate = getTrimmedField(formData, "candidateDate");
    const candidateVendorName = getTrimmedField(formData, "candidateVendorName");
    const candidateAmount = getTrimmedField(formData, "candidateAmount");
    const candidateDescription = getTrimmedField(formData, "candidateDescription");
    const candidateNote = getTrimmedField(formData, "candidateNote");
    const fileValue = formData.get("receiptFile");
    const receiptFile =
      fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (!receiptFile && !tempFileReference) {
      throw new CostReceiptsError(
        "Upload a receipt file or add a temporary file reference.",
      );
    }

    if (!receiptFile && !candidateVendorName && !candidateDescription) {
      throw new CostReceiptsError(
        "Add at least a vendor name or description when there is no uploaded receipt file yet.",
      );
    }

    const upload = receiptFile
      ? await uploadReceiptFile(context.workspace.id, receiptFile)
      : {
          filePath: null,
          fileName: null,
          fileMimeType: null,
          fileSizeBytes: null,
        };

    const nextHasCandidateData = hasCandidateData({
      candidateDate,
      candidateVendorName,
      candidateAmount,
      candidateDescription,
      candidateNote,
    });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cost_receipt_intakes")
      .insert({
        workspace_id: context.workspace.id,
        status: nextHasCandidateData ? "parsed" : "uploaded",
        parse_status: "not_started",
        file_path: upload.filePath,
        file_name: upload.fileName,
        file_mime_type: upload.fileMimeType,
        file_size_bytes: upload.fileSizeBytes,
        temp_file_reference: normalizeOptional(tempFileReference),
        candidate_date: normalizeOptional(candidateDate),
        candidate_vendor_name: normalizeOptional(candidateVendorName),
        candidate_amount_cents: candidateAmount
          ? parseAmountToCents(candidateAmount)
          : null,
        candidate_description: normalizeOptional(candidateDescription),
        candidate_note: normalizeOptional(candidateNote),
        uploaded_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new CostReceiptsError("We could not create that receipt intake record.");
    }

    await logWorkspaceUsage(context.workspace.id, "receipt_created");

    redirect(
      withStatus(
        `/costs/receipts/${data.id}`,
        "message",
        "Receipt intake created. Review and classify it before posting.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof CostReceiptsError || error instanceof CostsError
        ? error.message
        : "We could not create that receipt intake record.";

    redirect(withStatus("/costs/receipts", "error", message));
  }
}

export async function updateCostReceiptReviewAction(formData: FormData) {
  const receiptId = getTrimmedField(formData, "receiptId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageCostReceipts(context);

    const existing = await getCostReceiptById(context, receiptId);

    if (!existing) {
      throw new CostReceiptsError("That receipt intake record is no longer available.");
    }

    if (existing.receipt.postedCostRecordId) {
      throw new CostReceiptsError("Posted receipts are read-only.");
    }

    const tempFileReference = getTrimmedField(formData, "tempFileReference");
    const candidateDate = getTrimmedField(formData, "candidateDate");
    const candidateVendorName = getTrimmedField(formData, "candidateVendorName");
    const candidateAmount = getTrimmedField(formData, "candidateAmount");
    const candidateDescription = getTrimmedField(formData, "candidateDescription");
    const candidateNote = getTrimmedField(formData, "candidateNote");
    const costScope = getTrimmedField(formData, "costScope");
    const costCategoryId = getTrimmedField(formData, "costCategoryId");
    const customerId = getTrimmedField(formData, "customerId");
    const revenueRecordId = getTrimmedField(formData, "revenueRecordId");
    const invoiceId = getTrimmedField(formData, "invoiceId");
    const revenueRecordItemId = getTrimmedField(formData, "revenueRecordItemId");
    const serviceDate = getTrimmedField(formData, "serviceDate");
    const groupName = getTrimmedField(formData, "groupName");
    const explicitStatus = getTrimmedField(formData, "reviewStatus");

    if (!existing.receipt.filePath && !tempFileReference) {
      throw new CostReceiptsError(
        "Keep a temporary file reference when no uploaded file is attached.",
      );
    }

    if (candidateNote.length > 4000) {
      throw new CostReceiptsError("Receipt notes must stay under 4000 characters.");
    }

    const nextHasCandidateData = hasCandidateData({
      candidateDate,
      candidateVendorName,
      candidateAmount,
      candidateDescription,
      candidateNote,
    });
    const classificationComplete = hasClassification({
      costScope,
      costCategoryId,
      customerId,
      revenueRecordId,
      invoiceId,
      revenueRecordItemId,
      groupName,
    });
    const nextStatus = resolveReviewStatus({
      explicitStatus,
      hasCandidateData: nextHasCandidateData,
      classificationComplete,
      isPosted: false,
    });

    if (classificationComplete) {
      await validateCostInput(
        {
          costScope,
          costDate: candidateDate,
          serviceDate,
          groupName,
          vendorName: candidateVendorName,
          description: candidateDescription,
          note: candidateNote,
          amount: candidateAmount,
          costCategoryId,
          customerId,
          revenueRecordId,
          invoiceId,
          revenueRecordItemId,
        },
        context.workspace.id,
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("cost_receipt_intakes")
      .update({
        status: nextStatus,
        temp_file_reference: normalizeOptional(tempFileReference),
        candidate_date: normalizeOptional(candidateDate),
        candidate_vendor_name: normalizeOptional(candidateVendorName),
        candidate_amount_cents: candidateAmount
          ? parseAmountToCents(candidateAmount)
          : null,
        candidate_description: normalizeOptional(candidateDescription),
        candidate_note: normalizeOptional(candidateNote),
        cost_scope:
          costScope === "company" || costScope === "group_linked" ? costScope : null,
        cost_category_id: normalizeOptional(costCategoryId),
        customer_id: normalizeOptional(customerId),
        revenue_record_id: normalizeOptional(revenueRecordId),
        invoice_id: normalizeOptional(invoiceId),
        revenue_record_item_id: normalizeOptional(revenueRecordItemId),
        service_date: normalizeOptional(serviceDate),
        group_name: normalizeOptional(groupName),
        updated_by_user_id: context.user.id,
      })
      .eq("id", receiptId)
      .eq("workspace_id", context.workspace.id);

    if (error) {
      throw new CostReceiptsError("We could not save that receipt review.");
    }

    redirect(
      withStatus(`/costs/receipts/${receiptId}`, "message", "Receipt review updated."),
    );
  } catch (error) {
    const message =
      error instanceof CostReceiptsError || error instanceof CostsError
        ? error.message
        : "We could not save that receipt review.";

    redirect(withStatus(`/costs/receipts/${receiptId}`, "error", message));
  }
}

export async function runReceiptParserAction(formData: FormData) {
  const receiptId = getTrimmedField(formData, "receiptId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageCostReceipts(context);

    const existing = await getCostReceiptById(context, receiptId);

    if (!existing) {
      throw new CostReceiptsError("That receipt intake record is no longer available.");
    }

    if (existing.receipt.postedCostRecordId) {
      throw new CostReceiptsError("Posted receipts are read-only.");
    }

    const receipt = existing.receipt;

    if (!receipt.fileName && !receipt.tempFileReference) {
      throw new CostReceiptsError(
        "Add an uploaded file or temporary receipt reference before running the parser scaffold.",
      );
    }

    const parsed = runReceiptParserScaffold({
      fileName: receipt.fileName,
      tempFileReference: receipt.tempFileReference,
    });

    const mergedCandidateDate = receipt.candidateDate ?? parsed.candidateDate;
    const mergedCandidateVendorName =
      receipt.candidateVendorName ?? parsed.candidateVendorName;
    const mergedCandidateAmountCents =
      receipt.candidateAmountCents ?? parsed.candidateAmountCents;
    const mergedCandidateDescription =
      receipt.candidateDescription ?? parsed.candidateDescription;
    const mergedCandidateNote = receipt.candidateNote ?? parsed.candidateNote;

    const mergedHasCandidateData = hasCandidateData({
      candidateDate: mergedCandidateDate ?? "",
      candidateVendorName: mergedCandidateVendorName ?? "",
      candidateAmount:
        typeof mergedCandidateAmountCents === "number"
          ? formatCentsAsAmount(mergedCandidateAmountCents)
          : "",
      candidateDescription: mergedCandidateDescription ?? "",
      candidateNote: mergedCandidateNote ?? "",
    });
    const classificationComplete = hasClassification({
      costScope: receipt.costScope ?? "",
      costCategoryId: receipt.costCategoryId ?? "",
      customerId: receipt.customerId ?? "",
      revenueRecordId: receipt.revenueRecordId ?? "",
      invoiceId: receipt.invoiceId ?? "",
      revenueRecordItemId: receipt.revenueRecordItemId ?? "",
      groupName: receipt.groupName ?? "",
    });
    const nextStatus = resolveReviewStatus({
      explicitStatus:
        parsed.parseStatus === "failed" && !mergedHasCandidateData && !classificationComplete
          ? "failed"
          : receipt.status,
      hasCandidateData: mergedHasCandidateData,
      classificationComplete,
      isPosted: false,
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("cost_receipt_intakes")
      .update({
        status: nextStatus,
        parse_status: parsed.parseStatus,
        parser_name: parsed.parserName,
        parser_version: parsed.parserVersion,
        parse_attempted_at: parsed.parseAttemptedAt,
        parsed_at: parsed.parsedAt ?? receipt.parsedAt,
        parse_error: parsed.parseError,
        candidate_date: normalizeOptional(mergedCandidateDate ?? ""),
        candidate_vendor_name: normalizeOptional(mergedCandidateVendorName ?? ""),
        candidate_amount_cents: mergedCandidateAmountCents,
        candidate_description: normalizeOptional(mergedCandidateDescription ?? ""),
        candidate_note: normalizeOptional(mergedCandidateNote ?? ""),
        updated_by_user_id: context.user.id,
      })
      .eq("id", receiptId)
      .eq("workspace_id", context.workspace.id);

    if (error) {
      throw new CostReceiptsError("We could not run the receipt parser scaffold.");
    }

    redirect(
      withStatus(
        `/costs/receipts/${receiptId}`,
        parsed.parseStatus === "parsed" ? "message" : "error",
        parsed.parseStatus === "parsed"
          ? "Parser scaffold filled receipt candidates. Review them before classification or posting."
          : parsed.parseError ?? "The parser scaffold could not infer receipt candidates yet.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof CostReceiptsError || error instanceof CostsError
        ? error.message
        : "We could not run the receipt parser scaffold.";

    redirect(withStatus(`/costs/receipts/${receiptId}`, "error", message));
  }
}

export async function postReceiptToCostAction(formData: FormData) {
  const receiptId = getTrimmedField(formData, "receiptId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageCostReceipts(context);

    const existing = await getCostReceiptById(context, receiptId);

    if (!existing) {
      throw new CostReceiptsError("That receipt intake record is no longer available.");
    }

    if (existing.receipt.postedCostRecordId) {
      redirect(
        withStatus(
          `/costs/receipts/${receiptId}`,
          "message",
          "This receipt is already posted into a formal cost record.",
        ),
      );
    }

    const receipt = existing.receipt;
    const input = {
      costScope: receipt.costScope ?? "",
      costDate: receipt.candidateDate ?? "",
      serviceDate: receipt.serviceDate ?? "",
      groupName: receipt.groupName ?? "",
      vendorName: receipt.candidateVendorName ?? "",
      description: receipt.candidateDescription ?? "",
      note: receipt.candidateNote ?? "",
      amount:
        typeof receipt.candidateAmountCents === "number"
          ? formatCentsAsAmount(receipt.candidateAmountCents)
          : "",
      costCategoryId: receipt.costCategoryId ?? "",
      customerId: receipt.customerId ?? "",
      revenueRecordId: receipt.revenueRecordId ?? "",
      invoiceId: receipt.invoiceId ?? "",
      revenueRecordItemId: receipt.revenueRecordItemId ?? "",
    };

    const createdCost = await createCostRecord(context, input);
    const supabase = await createSupabaseServerClient();

    const updateResponse = await supabase
      .from("cost_receipt_intakes")
      .update({
        status: "posted",
        posted_cost_record_id: createdCost.id,
        updated_by_user_id: context.user.id,
      })
      .eq("id", receiptId)
      .eq("workspace_id", context.workspace.id);

    if (updateResponse.error) {
      await supabase
        .from("cost_records")
        .delete()
        .eq("id", createdCost.id)
        .eq("workspace_id", context.workspace.id);

      throw new CostReceiptsError(
        "The cost was created, but the receipt record could not be linked safely.",
      );
    }

    redirect(
      withStatus(
        `/costs/receipts/${receiptId}`,
        "message",
        "Receipt posted into formal costs.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof CostReceiptsError || error instanceof CostsError
        ? error.message
        : "We could not post that receipt into formal costs.";

    redirect(withStatus(`/costs/receipts/${receiptId}`, "error", message));
  }
}
