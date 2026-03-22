export type RevenueType = "daytime" | "transfer" | "other";
export type ResourceKind = "vehicle" | "guide";
export type PackagePreset = "half-day" | "full-day" | "custom";
export type TimeMode = "same-as-vehicle" | "custom";

export interface CustomerDraft {
  name: string;
  company: string;
  email: string;
  phone: string;
  reference: string;
}

export interface ResourceDraft {
  id: string;
  kind: ResourceKind;
  label: string;
  packagePreset: PackagePreset;
  packageHours: number;
  packagePrice: number;
  overtimeRate: number;
  overtimeHours: number;
  startTime: string;
  endTime: string;
  timeMode: TimeMode;
  linkedVehicleId: string;
  notes: string;
}

export interface AddOnDraft {
  id: string;
  type: RevenueType;
  label: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

export interface RevenueLineItem {
  id: string;
  type: RevenueType;
  kind: "vehicle" | "guide" | "package" | "overtime" | "transfer" | "other";
  title: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  meta?: Record<string, string | number | boolean | null>;
}

export interface RevenueRecordDraft {
  customer: CustomerDraft;
  type: RevenueType;
  items: RevenueLineItem[];
  total_amount: number;
  currency: "USD";
  notes: string;
  source: "daytime-core";
  daytime: {
    packageMode: PackagePreset;
    standardHours: number;
    overtimeRate: number;
    serviceWindow: string;
    vehicles: ResourceDraft[];
    guides: ResourceDraft[];
  };
}
