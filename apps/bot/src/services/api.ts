import { apiGet, apiPost } from "@/api/client";

export { apiGet, apiPost };

export async function getFarmStats() {
  return apiGet<any>("/statistics/dashboard");
}

export async function getRanking(period: "week" | "month" | "all" = "month") {
  return apiGet<any[]>("/statistics/ranking", { period, limit: 10 });
}

export async function getGoals(type?: string) {
  return apiGet<any[]>("/goals", { type, isActive: "true" });
}

export async function createFarm(
  discordUserId: string,
  quantity: number,
  withdrawnAmount: number,
  observation?: string | null,
) {
  return apiPost<any>("/farm", {
    discordUserId,
    quantity,
    withdrawnAmount,
    observation,
    proofs: [],
  });
}
