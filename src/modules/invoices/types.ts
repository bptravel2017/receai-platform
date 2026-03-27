import type { LineItemRecord } from "@/modules/line-items/types";

export type InvoiceStatus = "draft" | "finalized";
export type InvoiceDeliveryStatus = "not_sent" | "sent";
export type InvoiceDeliveryMethod =
  | "manual_share"
  | "external_email"
  | "platform_email";
export type InvoiceDeliveryEventStatus = "sent" | "failed";
export type InvoiceDeliveryActionType = "send" | "resend" | "reminder";
export type InvoicePaymentStatus = "unpaid" | "partial" | "paid";
export type InvoicePaymentEventSource = "manual" | "bank";
export type InvoicePaymentEventStatus = "active" | "reversed";

export type InvoiceRecord = {
  id: string;
  workspaceId: string;
  revenueRecordId: string;
  customerId: string;
  customerName: string;
  customerCompany: string | null;
  customerEmail: string | null;
  groupId: string | null;
  groupName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  deliveryStatus: InvoiceDeliveryStatus;
  paymentStatus: InvoicePaymentStatus;
  amountCents: number;
  paidAmountCents: number;
  currency: string;
  notes: string | null;
  paymentDate: string | null;
  paymentReference: string | null;
  paymentNote: string | null;
  lineItems: LineItemRecord[];
  finalizedAt: string | null;
  sentAt: string | null;
  deliveryRecipientEmail: string | null;
  deliveryReplyToEmail: string | null;
  deliveryMethod: InvoiceDeliveryMethod | null;
  deliveryNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceFormValues = {
  invoiceDate: string;
  dueDate: string;
  notes: string;
};

export type InvoicePaymentFormValues = {
  paidAmount: string;
  paymentDate: string;
  paymentReference: string;
  paymentNote: string;
};

export type InvoiceDeliveryFormValues = {
  recipientEmail: string;
  deliveryNote: string;
};

export type InvoiceDeliveryFollowUpFormValues = {
  recipientEmail: string;
  actionType: Exclude<InvoiceDeliveryActionType, "send">;
  deliveryNote: string;
};

export type InvoicePaymentEventRecord = {
  id: string;
  invoiceId: string;
  source: InvoicePaymentEventSource;
  status: InvoicePaymentEventStatus;
  amountCents: number;
  paymentDate: string;
  reference: string | null;
  note: string | null;
  bankTransactionId: string | null;
  reversedAt: string | null;
  createdAt: string;
};

export type InvoiceDeliveryEventRecord = {
  id: string;
  invoiceId: string;
  actionType: InvoiceDeliveryActionType;
  deliveryStatus: InvoiceDeliveryEventStatus;
  deliveryMethod: InvoiceDeliveryMethod;
  recipientEmail: string | null;
  replyToEmail: string | null;
  note: string | null;
  errorMessage: string | null;
  providerMessageId: string | null;
  createdAt: string;
};
