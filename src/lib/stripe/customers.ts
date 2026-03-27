import { getStripeServerClient } from "@/lib/stripe/config";

type EnsureStripeCustomerArgs = {
  existingStripeCustomerId?: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  userEmail?: string | null;
  billingEmail?: string | null;
};

export async function ensureStripeCustomer(args: EnsureStripeCustomerArgs) {
  const stripe = getStripeServerClient();
  const email = args.billingEmail ?? args.userEmail ?? undefined;
  const metadata = {
    workspace_id: args.workspaceId,
    workspace_slug: args.workspaceSlug,
  };

  if (args.existingStripeCustomerId) {
    const customer = await stripe.customers.retrieve(args.existingStripeCustomerId);

    if (!customer.deleted) {
      await stripe.customers.update(customer.id, {
        email,
        name: args.workspaceName,
        metadata,
      });

      return customer.id;
    }
  }

  const customer = await stripe.customers.create({
    email,
    name: args.workspaceName,
    metadata,
  });

  return customer.id;
}
