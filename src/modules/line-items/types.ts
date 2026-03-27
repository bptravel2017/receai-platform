export type LineItemRecord = {
  id: string;
  title: string;
  description: string | null;
  serviceCategory?: string | null;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  serviceDate: string | null;
  groupDate?: string | null;
};

export type LineItemEditorValue = {
  id: string;
  title: string;
  description: string;
  serviceCategory?: string;
  quantity: string;
  unitPrice: string;
  serviceDate: string;
  groupDate?: string;
};
