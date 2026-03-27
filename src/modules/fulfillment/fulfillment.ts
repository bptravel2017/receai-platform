import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  FulfillmentPartyChoice,
  FulfillmentPartyType,
} from "@/modules/fulfillment/types";

type FulfillmentPartyRow = {
  id: string;
  party_type: FulfillmentPartyType;
  display_name: string;
};

export async function getWorkspaceFulfillmentPartyChoices(
  context: AuthenticatedAppContext,
): Promise<FulfillmentPartyChoice[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fulfillment_parties")
    .select("id, party_type, display_name")
    .eq("workspace_id", context.workspace.id)
    .eq("is_active", true)
    .order("party_type", { ascending: true })
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error("We could not load fulfillment parties right now.");
  }

  return ((data ?? []) as FulfillmentPartyRow[]).map((row) => ({
    id: row.id,
    partyType: row.party_type,
    displayName: row.display_name,
  }));
}
