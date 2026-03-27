export type CustomerRecord = {
  id: string;
  workspaceId: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
};

export type CustomerChoice = {
  id: string;
  name: string;
  company: string | null;
  email?: string | null;
};

export type CustomerFormValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
};
