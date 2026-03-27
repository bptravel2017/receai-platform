import type { CustomerChoice } from "@/modules/customers/types";

export type GroupStatus = "active" | "archived";

export type GroupRecord = {
  id: string;
  workspaceId: string;
  name: string;
  customerId: string | null;
  customerName: string | null;
  status: GroupStatus;
  notesInternal: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GroupChoice = {
  id: string;
  name: string;
  customerId: string | null;
  customerName: string | null;
  status: GroupStatus;
  label: string;
};

export type GroupFormValues = {
  name: string;
  customerId: string;
  status: GroupStatus;
  notesInternal: string;
};

export type GroupsEditorData = {
  canManageGroups: boolean;
  customers: CustomerChoice[];
};
