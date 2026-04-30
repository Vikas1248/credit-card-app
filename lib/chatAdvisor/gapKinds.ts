/** Shared gap identifiers — separate from `types.ts` to avoid import cycles with `conversationState`. */
export type AdvisorGapKind =
  | "monthly_spend"
  | "category_mix"
  | "reward_format"
  | "fee_tolerance"
  | "telecom_spend_depth"
  | "travel_type"
  | "travel_frequency"
  | "lounge_priority"
  | "merchant_ecosystem";
