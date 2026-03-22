"use client";

import { Clock3, CopyPlus, Sparkles, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ResourceDraft, ResourceKind } from "./types";

type ResourceEditorProps = {
  resource: ResourceDraft;
  kind: ResourceKind;
  vehicleOptions: Array<{ id: string; label: string }>;
  onChange: (next: ResourceDraft) => void;
  onRemove: () => void;
  onDuplicate: () => void;
};

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid gap-2 text-sm font-medium text-foreground ${className}`}>
      <span className="text-xs uppercase tracking-[0.24em] text-muted">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  step = "0.01",
  min = "0",
}: {
  value: number;
  onChange: (value: number) => void;
  step?: string;
  min?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
    />
  );
}

export default function ResourceEditor({
  resource,
  kind,
  vehicleOptions,
  onChange,
  onRemove,
  onDuplicate,
}: ResourceEditorProps) {
  const packageHoursLabel = resource.packagePreset === "half-day" ? 4 : resource.packagePreset === "full-day" ? 8 : resource.packageHours;
  const isGuide = kind === "guide";
  const timePresets = [
    { label: "Half-day", startTime: "08:00", endTime: "12:00" },
    { label: "Full-day", startTime: "08:00", endTime: "17:00" },
    { label: "Late", startTime: "09:00", endTime: "18:00" },
  ];

  function applyTimePreset(startTime: string, endTime: string) {
    onChange({
      ...resource,
      startTime,
      endTime,
      timeMode: isGuide ? "custom" : resource.timeMode,
    });
  }

  return (
    <article className="rounded-3xl border border-border bg-white/92 p-4 shadow-[0_12px_32px_rgba(16,35,31,0.05)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted">
            {kind === "vehicle" ? "Vehicle" : "Guide"}
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {resource.label || `Untitled ${kind}`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
          >
            <CopyPlus className="h-4 w-4" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:border-red-200 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label={kind === "vehicle" ? "Vehicle name" : "Guide name"}>
          <input
            type="text"
            value={resource.label}
            onChange={(event) => onChange({ ...resource, label: event.target.value })}
            placeholder={kind === "vehicle" ? "Toyota HiAce" : "John tour guide"}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </Field>

        <Field label="Package">
          <select
            value={resource.packagePreset}
            onChange={(event) => {
              const packagePreset = event.target.value as ResourceDraft["packagePreset"];
              const packageHours = packagePreset === "half-day" ? 4 : packagePreset === "full-day" ? 8 : resource.packageHours;
              onChange({
                ...resource,
                packagePreset,
                packageHours,
              });
            }}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="half-day">Half-day</option>
            <option value="full-day">Full-day</option>
            <option value="custom">Custom</option>
          </select>
        </Field>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Field label="Package hours">
          <NumberInput
            value={packageHoursLabel}
            onChange={(value) => onChange({ ...resource, packageHours: value, packagePreset: "custom" })}
            step="0.5"
          />
        </Field>
        <Field label="Package price">
          <NumberInput value={resource.packagePrice} onChange={(value) => onChange({ ...resource, packagePrice: value })} />
        </Field>
        <Field label="Overtime rate / hr">
          <NumberInput value={resource.overtimeRate} onChange={(value) => onChange({ ...resource, overtimeRate: value })} />
        </Field>
        <Field label="Overtime hours">
          <NumberInput value={resource.overtimeHours} onChange={(value) => onChange({ ...resource, overtimeHours: value })} step="0.5" />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Start time">
          <input
            type="time"
            value={resource.startTime}
            disabled={resource.timeMode === "same-as-vehicle"}
            onChange={(event) => onChange({ ...resource, startTime: event.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface"
          />
        </Field>
        <Field label="End time">
          <input
            type="time"
            value={resource.endTime}
            disabled={resource.timeMode === "same-as-vehicle"}
            onChange={(event) => onChange({ ...resource, endTime: event.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface"
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.24em] text-muted">
          Quick time
        </span>
        {timePresets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyTimePreset(preset.startTime, preset.endTime)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
          >
            {preset.label}
          </button>
        ))}
        {isGuide ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...resource,
                timeMode: "same-as-vehicle",
                linkedVehicleId: resource.linkedVehicleId || vehicleOptions[0]?.id || "",
              })
            }
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Auto-fill from vehicle
          </button>
        ) : null}
      </div>

      {isGuide ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/70 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock3 className="h-4 w-4 text-primary" />
            Time source
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
            <Field label="Source">
              <select
                value={resource.timeMode}
                onChange={(event) =>
                  onChange({
                    ...resource,
                    timeMode: event.target.value as ResourceDraft["timeMode"],
                  })
                }
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="same-as-vehicle">Same as vehicle</option>
                <option value="custom">Custom</option>
              </select>
            </Field>

            <Field label="Vehicle">
              <select
                value={resource.linkedVehicleId}
                onChange={(event) => onChange({ ...resource, linkedVehicleId: event.target.value })}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Select vehicle</option>
                {vehicleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {resource.timeMode === "custom" ? (
            <p className="mt-3 text-xs text-muted">
              Guide keeps its own service window and does not mirror the vehicle time.
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted">
              Guide time auto-fills from the selected vehicle.
            </p>
          )}
        </div>
      ) : null}

      <Field label="Notes" className="mt-4">
        <input
          type="text"
          value={resource.notes}
          onChange={(event) => onChange({ ...resource, notes: event.target.value })}
          placeholder="Optional dispatch note, route, or request"
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </Field>
    </article>
  );
}
