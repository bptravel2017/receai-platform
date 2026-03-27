export type FulfillmentPartyType = "driver" | "vendor" | "guide" | "operator";

export type FulfillmentPartyChoice = {
  id: string;
  partyType: FulfillmentPartyType;
  displayName: string;
};
