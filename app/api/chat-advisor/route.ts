import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { runAdvisorConversationTurn } from "@/lib/chatAdvisor/langGraphAdvisor";
import {
  hydratePriorProfile,
  loadAdvisorSession,
  mergeAskedGapKindsLists,
  parseAskedGapKindsPayload,
  persistAdvisorSession,
  sanitizeCredGeniePayload,
} from "@/lib/chatAdvisor/sessionPersistence";
import type {
  ChatAdvisorRequestBody,
  ChatAdvisorResponseBody,
} from "@/lib/chatAdvisor/types";
import type { CardRowForScoring } from "@/lib/recommendV2/scoring";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const SELECT_FIELDS =
  "id, card_name, bank, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits, dining_reward, travel_reward, shopping_reward, fuel_reward, network, metadata";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatAdvisorRequestBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.length >= 16
        ? body.sessionId
        : randomUUID();

    const clientProfile = sanitizeCredGeniePayload(body.profile);
    const storedSession = await loadAdvisorSession(sessionId);
    const priorProfile = hydratePriorProfile(storedSession.profile, clientProfile);

    const clientAsked = parseAskedGapKindsPayload(body.askedGapKinds);
    const priorAskedGapKinds = mergeAskedGapKindsLists(storedSession.askedGapKinds, clientAsked);

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("credit_cards").select(SELECT_FIELDS);
    if (error) {
      throw new Error(error.message);
    }
    const cards = (data ?? []) as CardRowForScoring[];

    const turn = await runAdvisorConversationTurn({
      userMessage: message,
      priorProfile,
      candidates: cards,
      priorAskedGapKinds,
    });

    await persistAdvisorSession(sessionId, {
      profile: turn.mergedProfile,
      askedGapKinds: turn.askedGapKinds,
    });

    const response: ChatAdvisorResponseBody = {
      profile: turn.mergedProfile,
      sessionId,
      askedGapKinds: turn.askedGapKinds,
      confidenceScore: turn.confidenceScore,
      ...(turn.reasoningBrief || turn.assistantSummary
        ? { reasoningBrief: turn.reasoningBrief ?? turn.assistantSummary }
        : {}),
      ...(turn.nextQuestion ? { nextQuestion: turn.nextQuestion } : {}),
      ...(turn.recommendations && turn.recommendations.length > 0
        ? { recommendations: turn.recommendations }
        : {}),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
