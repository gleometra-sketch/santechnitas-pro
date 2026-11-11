import type { ChannelAdapter } from "../notify";

/** Įrašo pranešimą į `notifications` lentelę (programos varpelis). */
export const inappAdapter: ChannelAdapter = async ({ supabase, companyId, userId, event, payload }) => {
  const { error } = await supabase.from("notifications").insert({
    company_id: companyId,
    user_id: userId,
    event_type: event,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  });
  if (error) throw new Error(error.message);
};
