"use client";

import {
  ArrowRight,
  BadgeDollarSign,
  CarFront,
  Layers3,
  LoaderCircle,
  Plus,
  ReceiptText,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type {
  Customer,
  CustomerCreateInput,
  GenerateInvoiceInput,
  Invoice,
  RevenueRecord,
  RevenueRecordCreateInput,
} from "@/lib/saas-types";
import InvoicePreview from "./InvoicePreview";
import ResourceEditor from "./ResourceEditor";
import type {
  AddOnDraft,
  CustomerDraft,
  RevenueLineItem,
  RevenueRecordDraft,
  RevenueType,
  ResourceDraft,
} from "./types";

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Math.random().toString(36).slice(2, 10)}`;
}

function createVehicleDraft(index = 1): ResourceDraft {
  return {
    id: createId(),
    kind: "vehicle",
    label: index === 1 ? "Lead vehicle" : `Vehicle ${index}`,
    packagePreset: "full-day",
    packageHours: 8,
    packagePrice: 180,
    overtimeRate: 45,
    overtimeHours: 0,
    startTime: "08:00",
    endTime: "17:00",
    timeMode: "custom",
    linkedVehicleId: "",
    notes: "",
  };
}

function createGuideDraft(index = 1, linkedVehicleId = ""): ResourceDraft {
  return {
    id: createId(),
    kind: "guide",
    label: index === 1 ? "Lead guide" : `Guide ${index}`,
    packagePreset: "full-day",
    packageHours: 8,
    packagePrice: 120,
    overtimeRate: 30,
    overtimeHours: 0,
    startTime: "08:00",
    endTime: "17:00",
    timeMode: linkedVehicleId ? "same-as-vehicle" : "custom",
    linkedVehicleId,
    notes: "",
  };
}

function cloneVehicleDraft(source: ResourceDraft, index: number): ResourceDraft {
  return {
    ...source,
    id: createId(),
    label: `${source.label || "Vehicle"} ${index}`,
  };
}

function cloneGuideDraft(source: ResourceDraft, index: number): ResourceDraft {
  return {
    ...source,
    id: createId(),
    label: `${source.label || "Guide"} ${index}`,
  };
}

function createAddOnDraft(type: RevenueType): AddOnDraft {
  return {
    id: createId(),
    type,
    label: type === "transfer" ? "Airport transfer" : "Other charge",
    quantity: 1,
    unitPrice: type === "transfer" ? 65 : 1,
    notes: "",
  };
}

function parseMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
}

function hoursBetween(start: string, end: string) {
  const startMinutes = parseMinutes(start);
  const endMinutes = parseMinutes(end);
  const diff =
    endMinutes >= startMinutes
      ? endMinutes - startMinutes
      : endMinutes + 24 * 60 - startMinutes;

  return diff / 60;
}

function packageHoursForPreset(resource: ResourceDraft) {
  if (resource.packagePreset === "half-day") {
    return 4;
  }

  if (resource.packagePreset === "full-day") {
    return 8;
  }

  return resource.packageHours || 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getResourceWindow(resource: ResourceDraft, vehicles: ResourceDraft[]) {
  if (resource.kind === "guide" && resource.timeMode === "same-as-vehicle") {
    const linkedVehicle = vehicles.find((vehicle) => vehicle.id === resource.linkedVehicleId);

    if (linkedVehicle) {
      return {
        startTime: linkedVehicle.startTime,
        endTime: linkedVehicle.endTime,
      };
    }
  }

  return {
    startTime: resource.startTime,
    endTime: resource.endTime,
  };
}

function buildResourceItems(
  resource: ResourceDraft,
  vehicles: ResourceDraft[],
): RevenueLineItem[] {
  const packageHours = packageHoursForPreset(resource);
  const { startTime, endTime } = getResourceWindow(resource, vehicles);
  const durationHours = hoursBetween(startTime, endTime);
  const automaticOvertimeHours = Math.max(
    0,
    Number((durationHours - packageHours).toFixed(2)),
  );
  const overtimeHours = Math.max(automaticOvertimeHours, resource.overtimeHours);
  const resourceLabel = resource.label || (resource.kind === "vehicle" ? "Vehicle" : "Guide");
  const resourceKind = resource.kind;
  const items: RevenueLineItem[] = [
    {
      id: `${resource.id}-package`,
      type: "daytime",
      kind: "package",
      title: `${resourceLabel} ${resource.packagePreset} package`,
      quantity: 1,
      unitPrice: resource.packagePrice,
      amount: Number(resource.packagePrice.toFixed(2)),
      meta: {
        resourceKind,
        packagePreset: resource.packagePreset,
        packageHours,
        startTime,
        endTime,
        notes: resource.notes || null,
      },
    },
  ];

  if (overtimeHours > 0) {
    items.push({
      id: `${resource.id}-overtime`,
      type: "daytime",
      kind: "overtime",
      title: `${resourceLabel} overtime`,
      quantity: overtimeHours,
      unitPrice: resource.overtimeRate,
      amount: Number((overtimeHours * resource.overtimeRate).toFixed(2)),
      meta: {
        resourceKind,
        startTime,
        endTime,
        automaticOvertimeHours,
        overtimeHours,
        notes: resource.notes || null,
      },
    });
  }

  return items;
}

function buildRevenueRecord(
  customer: CustomerDraft,
  recordType: RevenueType,
  vehicles: ResourceDraft[],
  guides: ResourceDraft[],
  addOns: AddOnDraft[],
): RevenueRecordDraft {
  const items: RevenueLineItem[] = [
    ...vehicles.flatMap((vehicle) => buildResourceItems(vehicle, vehicles)),
    ...guides.flatMap((guide) => buildResourceItems(guide, vehicles)),
    ...addOns.map((item) => ({
      id: item.id,
      type: item.type,
      kind: item.type === "transfer" ? ("transfer" as const) : ("other" as const),
      title: item.label || (item.type === "transfer" ? "Transfer" : "Other charge"),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: Number((item.quantity * item.unitPrice).toFixed(2)),
      meta: {
        notes: item.notes || null,
      },
    })),
  ];
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const primaryVehicle = vehicles[0];
  const serviceWindow = primaryVehicle
    ? `${primaryVehicle.startTime} - ${primaryVehicle.endTime}`
    : "No daytime window";

  return {
    customer,
    type: recordType,
    items,
    total_amount: Number(totalAmount.toFixed(2)),
    currency: "USD",
    notes: customer.reference ? `Reference: ${customer.reference}` : "",
    source: "daytime-core",
    daytime: {
      packageMode: primaryVehicle?.packagePreset ?? "custom",
      standardHours: primaryVehicle ? packageHoursForPreset(primaryVehicle) : 0,
      overtimeRate: primaryVehicle?.overtimeRate ?? 0,
      serviceWindow,
      vehicles,
      guides,
    },
  };
}

function toCustomerPayload(customer: CustomerDraft): CustomerCreateInput {
  return {
    name: customer.name,
    email: customer.email || null,
    phone: customer.phone || null,
    companyName: customer.company || null,
    notes: customer.reference ? `Reference: ${customer.reference}` : null,
  };
}

function toRevenuePayload(
  customerId: string,
  record: RevenueRecordDraft,
): RevenueRecordCreateInput {
  return {
    customerId,
    type: record.type,
    title:
      record.customer.reference || record.customer.company || record.customer.name
        ? `${record.customer.reference || record.customer.company || record.customer.name} revenue`
        : "Revenue record",
    currency: record.currency,
    notes: record.notes || null,
    source: record.source,
    items: record.items.map((item) => ({
      kind: item.kind,
      label: item.title,
      quantity: item.quantity,
      unitAmount: item.unitPrice,
      amount: item.amount,
      metadata: item.meta,
    })),
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data;
}

function SectionHeading({
  icon,
  eyebrow,
  title,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-muted">{eyebrow}</p>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-primary bg-primary text-white shadow-[0_10px_20px_rgba(15,118,110,0.18)]"
          : "border-border bg-white text-muted hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted">{label}</p>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

export default function DaytimeRevenueBuilder() {
  const [customer, setCustomer] = useState<CustomerDraft>({
    name: "Ava Chen",
    company: "Skyline Tours",
    email: "ava@skylinetours.com",
    phone: "(555) 203-8441",
    reference: "DT-2048",
  });
  const [recordType, setRecordType] = useState<RevenueType>("daytime");
  const [vehicles, setVehicles] = useState<ResourceDraft[]>([createVehicleDraft()]);
  const [guides, setGuides] = useState<ResourceDraft[]>([createGuideDraft(1, "")]);
  const [addOns, setAddOns] = useState<AddOnDraft[]>([]);
  const [status, setStatus] = useState<string>("Ready to create customer, revenue, and invoice.");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState<Customer | null>(null);
  const [savedRevenue, setSavedRevenue] = useState<RevenueRecord | null>(null);
  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null);

  const record = buildRevenueRecord(customer, recordType, vehicles, guides, addOns);
  const vehicleTotal = record.items
    .filter((item) => item.meta?.resourceKind === "vehicle")
    .reduce((sum, item) => sum + item.amount, 0);
  const guideTotal = record.items
    .filter((item) => item.meta?.resourceKind === "guide")
    .reduce((sum, item) => sum + item.amount, 0);
  const vehicleWindow = vehicles[0]
    ? `${vehicles[0].startTime} - ${vehicles[0].endTime}`
    : "No daytime vehicle";
  const revenuePayloadPreview = {
    customer: toCustomerPayload(customer),
    revenue: toRevenuePayload(savedCustomer?.id ?? "customer_id", record),
    invoice:
      savedRevenue?.id
        ? ({
            revenueRecordId: savedRevenue.id,
            status: "issued",
          } satisfies GenerateInvoiceInput)
        : {
            revenueRecordId: "revenue_record_id",
            status: "issued",
          },
  };

  function markCustomerDirty(next: CustomerDraft) {
    setCustomer(next);
    setSavedCustomer(null);
    setSavedRevenue(null);
    setSavedInvoice(null);
    setError(null);
    setStatus("Customer details changed. Save customer again before posting revenue.");
  }

  function markRevenueDirty() {
    setSavedRevenue(null);
    setSavedInvoice(null);
    setError(null);
    setStatus("Revenue draft updated. Save the revenue record again to refresh invoice output.");
  }

  function syncGuidesAfterVehicles(nextVehicles: ResourceDraft[]) {
    setVehicles(nextVehicles);
    setGuides((current) =>
      current.map((guide) => {
        if (guide.timeMode !== "same-as-vehicle") {
          return guide;
        }

        const linkedVehicleStillExists = nextVehicles.some(
          (vehicle) => vehicle.id === guide.linkedVehicleId,
        );

        if (linkedVehicleStillExists) {
          return guide;
        }

        return {
          ...guide,
          linkedVehicleId: nextVehicles[0]?.id ?? "",
          timeMode: nextVehicles[0] ? "same-as-vehicle" : "custom",
        };
      }),
    );
    markRevenueDirty();
  }

  function addVehicle() {
    syncGuidesAfterVehicles([...vehicles, createVehicleDraft(vehicles.length + 1)]);
  }

  function duplicateVehicle(vehicle: ResourceDraft) {
    syncGuidesAfterVehicles([
      ...vehicles,
      cloneVehicleDraft(vehicle, vehicles.length + 1),
    ]);
  }

  function addGuide() {
    setGuides((current) => [
      ...current,
      createGuideDraft(current.length + 1, vehicles[0]?.id ?? ""),
    ]);
    markRevenueDirty();
  }

  function duplicateGuide(guide: ResourceDraft) {
    setGuides((current) => [
      ...current,
      cloneGuideDraft(guide, current.length + 1),
    ]);
    markRevenueDirty();
  }

  function applyVehicleWindowToAllGuides() {
    const leadVehicle = vehicles[0];

    if (!leadVehicle) {
      return;
    }

    setGuides((current) =>
      current.map((guide) => ({
        ...guide,
        linkedVehicleId: guide.linkedVehicleId || leadVehicle.id,
        timeMode: "same-as-vehicle",
      })),
    );
    markRevenueDirty();
  }

  async function createCustomer() {
    setIsSubmitting(true);
    setError(null);
    setSavedRevenue(null);
    setSavedInvoice(null);

    try {
      const response = await postJson<{ customer: Customer }>(
        "/api/customers",
        toCustomerPayload(customer),
      );
      setSavedCustomer(response.customer);
      setStatus(`Customer created: ${response.customer.name}`);
      return response.customer.id;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to create customer.";
      setError(message);
      throw caughtError;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function ensureCustomerId() {
    if (savedCustomer) {
      return savedCustomer.id;
    }

    return createCustomer();
  }

  async function createRevenue() {
    setIsSubmitting(true);
    setError(null);
    setSavedInvoice(null);

    try {
      const customerId = await ensureCustomerId();
      const response = await postJson<{ revenueRecord: RevenueRecord }>(
        "/api/revenue",
        toRevenuePayload(customerId, record),
      );
      setSavedRevenue(response.revenueRecord);
      setStatus(`Revenue record saved: ${response.revenueRecord.id}`);
      return response.revenueRecord.id;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to create revenue record.";
      setError(message);
      throw caughtError;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function ensureRevenueId() {
    if (savedRevenue) {
      return savedRevenue.id;
    }

    return createRevenue();
  }

  async function generateInvoice() {
    setIsSubmitting(true);
    setError(null);

    try {
      const revenueRecordId = await ensureRevenueId();
      const response = await postJson<{ invoice: Invoice }>("/api/invoices", {
        revenueRecordId,
        status: "issued",
      } satisfies GenerateInvoiceInput);
      setSavedInvoice(response.invoice);
      setStatus(`Invoice generated: ${response.invoice.invoiceNumber}`);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to generate invoice.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-border/80 bg-white/80 px-5 py-4 shadow-[0_20px_40px_rgba(16,35,31,0.05)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-muted">Daytime core</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Unified revenue builder for daytime, transfer, and other services.
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <ToggleChip active={recordType === "daytime"} onClick={() => setRecordType("daytime")}>
              Daytime
            </ToggleChip>
            <ToggleChip active={recordType === "transfer"} onClick={() => setRecordType("transfer")}>
              Transfer
            </ToggleChip>
            <ToggleChip active={recordType === "other"} onClick={() => setRecordType("other")}>
              Other
            </ToggleChip>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <section
            id="customer"
            className="rounded-[2rem] border border-border bg-surface/80 p-5 shadow-[0_16px_30px_rgba(16,35,31,0.05)]"
          >
            <SectionHeading
              icon={<BadgeDollarSign className="h-5 w-5" />}
              eyebrow="Customer"
              title="Create the AR record once"
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-foreground">
                <span className="text-xs uppercase tracking-[0.24em] text-muted">Customer name</span>
                <input
                  value={customer.name}
                  onChange={(event) =>
                    markCustomerDirty({ ...customer, name: event.target.value })
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="Customer contact"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                <span className="text-xs uppercase tracking-[0.24em] text-muted">Company</span>
                <input
                  value={customer.company}
                  onChange={(event) =>
                    markCustomerDirty({ ...customer, company: event.target.value })
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="Company name"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                <span className="text-xs uppercase tracking-[0.24em] text-muted">Email</span>
                <input
                  value={customer.email}
                  onChange={(event) =>
                    markCustomerDirty({ ...customer, email: event.target.value })
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="billing@client.com"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                <span className="text-xs uppercase tracking-[0.24em] text-muted">Phone</span>
                <input
                  value={customer.phone}
                  onChange={(event) =>
                    markCustomerDirty({ ...customer, phone: event.target.value })
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="Dispatch phone"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
                <span className="text-xs uppercase tracking-[0.24em] text-muted">Reference</span>
                <input
                  value={customer.reference}
                  onChange={(event) =>
                    markCustomerDirty({ ...customer, reference: event.target.value })
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="Dispatch or invoice ref"
                />
              </label>
            </div>
          </section>

          <section
            id="vehicles"
            className="rounded-[2rem] border border-border bg-white/85 p-5 shadow-[0_16px_30px_rgba(16,35,31,0.05)]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <SectionHeading
                icon={<CarFront className="h-5 w-5" />}
                eyebrow="Vehicles"
                title="Core revenue driver"
              />
              <button
                type="button"
                onClick={addVehicle}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add vehicle
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {vehicles.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-surface/70 p-6 text-sm text-muted">
                  No daytime vehicle yet. Leave this empty for transfer-only invoices or add a
                  vehicle to price a tour charter.
                </div>
              ) : null}
              {vehicles.map((vehicle) => (
                <ResourceEditor
                  key={vehicle.id}
                  resource={vehicle}
                  kind="vehicle"
                  vehicleOptions={[]}
                  onDuplicate={() => duplicateVehicle(vehicle)}
                  onChange={(next) =>
                    syncGuidesAfterVehicles(
                      vehicles.map((item) => (item.id === vehicle.id ? next : item)),
                    )
                  }
                  onRemove={() =>
                    syncGuidesAfterVehicles(
                      vehicles.filter((item) => item.id !== vehicle.id),
                    )
                  }
                />
              ))}
            </div>
          </section>

          <section
            id="guides"
            className="rounded-[2rem] border border-border bg-white/85 p-5 shadow-[0_16px_30px_rgba(16,35,31,0.05)]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <SectionHeading
                icon={<Users className="h-5 w-5" />}
                eyebrow="Guides"
                title="Mirror a vehicle or price custom time"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addGuide}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Add guide
                </button>
                <button
                  type="button"
                  onClick={applyVehicleWindowToAllGuides}
                  disabled={guides.length === 0 || vehicles.length === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Auto-fill all guide times
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {guides.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-surface/70 p-6 text-sm text-muted">
                  Add guides only when the charter needs them. The invoice will omit this section
                  when no guide items exist.
                </div>
              ) : null}
              {guides.map((guide) => (
                <ResourceEditor
                  key={guide.id}
                  resource={guide}
                  kind="guide"
                  vehicleOptions={vehicles.map((vehicle) => ({
                    id: vehicle.id,
                    label: vehicle.label || "Vehicle",
                  }))}
                  onDuplicate={() => duplicateGuide(guide)}
                  onChange={(next) => {
                    setGuides((current) =>
                      current.map((item) => (item.id === guide.id ? next : item)),
                    );
                    markRevenueDirty();
                  }}
                  onRemove={() => {
                    setGuides((current) => current.filter((item) => item.id !== guide.id));
                    markRevenueDirty();
                  }}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-white/85 p-5 shadow-[0_16px_30px_rgba(16,35,31,0.05)]">
            <SectionHeading
              icon={<Layers3 className="h-5 w-5" />}
              eyebrow="Add-ons"
              title="Keep mixed services on one revenue record"
            />

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddOns((current) => [...current, createAddOnDraft("transfer")]);
                  markRevenueDirty();
                }}
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Add transfer
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddOns((current) => [...current, createAddOnDraft("other")]);
                  markRevenueDirty();
                }}
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Add other item
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {addOns.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border bg-surface/60 p-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.24em] text-muted">Label</span>
                      <input
                        value={item.label}
                        onChange={(event) => {
                          setAddOns((current) =>
                            current.map((row) =>
                              row.id === item.id ? { ...row, label: event.target.value } : row,
                            ),
                          );
                          markRevenueDirty();
                        }}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-foreground">
                      <span className="text-xs uppercase tracking-[0.24em] text-muted">Quantity</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => {
                          setAddOns((current) =>
                            current.map((row) =>
                              row.id === item.id
                                ? { ...row, quantity: Number(event.target.value) || 1 }
                                : row,
                            ),
                          );
                          markRevenueDirty();
                        }}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-foreground">
                      <span className="text-xs uppercase tracking-[0.24em] text-muted">Unit price</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) => {
                          setAddOns((current) =>
                            current.map((row) =>
                              row.id === item.id
                                ? { ...row, unitPrice: Number(event.target.value) || 0 }
                                : row,
                            ),
                          );
                          markRevenueDirty();
                        }}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <label className="grid flex-1 gap-2 text-sm font-medium text-foreground">
                      <span className="text-xs uppercase tracking-[0.24em] text-muted">Notes</span>
                      <input
                        value={item.notes}
                        onChange={(event) => {
                          setAddOns((current) =>
                            current.map((row) =>
                              row.id === item.id ? { ...row, notes: event.target.value } : row,
                            ),
                          );
                          markRevenueDirty();
                        }}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAddOns((current) => current.filter((row) => row.id !== item.id));
                        markRevenueDirty();
                      }}
                      className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition hover:border-red-200 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[2rem] border border-border bg-slate-900 p-5 text-white shadow-[0_20px_40px_rgba(16,35,31,0.16)]">
            <p className="text-xs uppercase tracking-[0.32em] text-white/55">Live total</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                Total amount
              </div>
              <div className="mt-1 text-5xl font-black tracking-tight text-white">
                {formatCurrency(record.total_amount)}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard
                label="Vehicles"
                value={formatCurrency(vehicleTotal)}
                hint={`${vehicles.length} vehicle resource(s)`}
              />
              <MetricCard
                label="Guides"
                value={formatCurrency(guideTotal)}
                hint={`${guides.length} guide resource(s)`}
              />
              <MetricCard
                label="Time window"
                value={vehicleWindow}
                hint="Package pricing plus overtime"
              />
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={createCustomer}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeDollarSign className="h-4 w-4" />
                )}
                Create customer
              </button>
              <button
                type="button"
                onClick={createRevenue}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Save revenue
              </button>
              <button
                type="button"
                onClick={generateInvoice}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ReceiptText className="h-4 w-4" />
                )}
                Generate invoice
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="font-semibold text-white">Run status</div>
              <p className="mt-2 text-white/80">{status}</p>
              {error ? <p className="mt-2 text-rose-300">{error}</p> : null}
            </div>

            {(savedCustomer || savedRevenue || savedInvoice) ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                {savedCustomer ? <p>Customer ID: {savedCustomer.id}</p> : null}
                {savedRevenue ? <p>Revenue ID: {savedRevenue.id}</p> : null}
                {savedInvoice ? (
                  <p>Invoice: {savedInvoice.invoiceNumber}</p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section id="invoice">
            <InvoicePreview record={record} />
          </section>

          <section
            id="payload"
            className="rounded-[2rem] border border-border bg-white/90 p-5 shadow-[0_16px_30px_rgba(16,35,31,0.05)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted">Unified payload</p>
                <h2 className="text-lg font-semibold text-foreground">Customer → revenue → invoice</h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard?.writeText(
                    JSON.stringify(revenuePayloadPreview, null, 2),
                  )
                }
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Copy JSON
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <pre className="mt-4 max-h-[28rem] overflow-auto rounded-2xl border border-border bg-slate-950 p-4 text-xs leading-6 text-slate-200">
{JSON.stringify(revenuePayloadPreview, null, 2)}
            </pre>
          </section>
        </aside>
      </section>
    </main>
  );
}
