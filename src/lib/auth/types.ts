import type { WorkspaceBillingAccount } from "@/modules/billing/types";
import type { WorkspacePlan } from "@/modules/plans/types";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  replyToEmail: string | null;
  plan: WorkspacePlan;
  role: string;
};

export type ProfileSummary = {
  id: string;
  email: string;
  fullName: string | null;
  defaultWorkspaceId: string | null;
};

export type BootstrapSummary = {
  createdWorkspace: boolean;
  createdProfile: boolean;
  recoveredProfile: boolean;
  recoveredDefaultWorkspace: boolean;
  isFirstLogin: boolean;
};

export type AuthenticatedAppContext = {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  profile: ProfileSummary;
  workspace: WorkspaceSummary;
  billing: WorkspaceBillingAccount | null;
  bootstrap: BootstrapSummary;
};
