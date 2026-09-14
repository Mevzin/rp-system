import { Injectable } from "@nestjs/common";
import { FarmModel, UserModel, mongoose } from "@criminals/database";
import { FarmStatus } from "@criminals/shared";
import { getStartOfWeek, getStartOfMonth } from "@criminals/shared";
import type { RankingEntry } from "@criminals/shared";

type RankingPeriod = "week" | "month" | "all";

@Injectable()
export class RankingsService {
  async getRanking(
    organizationId: string,
    period: RankingPeriod = "month",
    limit = 20,
  ): Promise<RankingEntry[]> {
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const now = new Date();
    let startDate: Date | undefined;

    if (period === "week") {
      startDate = getStartOfWeek();
    } else if (period === "month") {
      startDate = getStartOfMonth();
    }

    const matchStage: any = {
      organizationId: orgObjectId,
      status: FarmStatus.APPROVED,
    };
    if (startDate) {
      matchStage.createdAt = { $gte: startDate, $lte: now };
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: "$userId",
          totalQuantity: { $sum: "$quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: { $toString: "$_id" },
          discordId: "$user.discordId",
          username: "$user.username",
          globalName: "$user.globalName",
          avatar: "$user.avatar",
          quantity: "$totalQuantity",
        },
      },
    ];

    const results = await FarmModel.aggregate(pipeline);

    return results.map((entry, index) => ({
      position: index + 1,
      userId: entry.userId,
      discordId: entry.discordId,
      username: entry.username,
      globalName: entry.globalName,
      avatar: entry.avatar,
      quantity: entry.quantity ?? 0,
      goalProgress: null,
    }));
  }
}
