import { Injectable } from "@nestjs/common";
import {
  FarmModel,
  UserModel,
  GoalModel,
  ProofModel,
  InventoryItemModel,
  VehicleModel,
  mongoose,
} from "@criminals/database";
import { FarmStatus, GoalType } from "@criminals/shared";
import { getStartOfWeek, getStartOfMonth } from "@criminals/shared";
import type { DashboardStats, GoalProgress, VehicleSummary } from "@criminals/shared";

@Injectable()
export class StatisticsService {
  private getDateRange(period: "day" | "week" | "month") {
    const now = new Date();
    if (period === "day") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    if (period === "week") {
      return { start: getStartOfWeek(), end: now };
    }
    return { start: getStartOfMonth(), end: now };
  }

  async getDashboardStats(
    organizationId: string,
    userId?: string,
  ): Promise<DashboardStats> {
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const userObjectId = userId
      ? new mongoose.Types.ObjectId(userId)
      : undefined;

    const baseMatch: any = {
      organizationId: orgObjectId,
      status: FarmStatus.APPROVED,
    };
    if (userObjectId) baseMatch.userId = userObjectId;

    const { start: weekStart } = this.getDateRange("week");
    const { start: monthStart } = this.getDateRange("month");
    const { start: dayStart } = this.getDateRange("day");

    const aggregateSum = async (extraMatch?: Record<string, any>) => {
      const pipeline: any[] = [
        { $match: { ...baseMatch, ...(extraMatch ?? {}) } },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$quantity" },
            totalWithdrawn: { $sum: "$withdrawnAmount" },
            count: { $sum: 1 },
          },
        },
      ];
      const result = await FarmModel.aggregate(pipeline);
      return result[0] ?? {
        totalQuantity: 0,
        totalWithdrawn: 0,
        count: 0,
      };
    };

    const aggregateCount = async (extraMatch?: Record<string, any>) => {
      const pipeline: any[] = [
        { $match: { ...baseMatch, ...(extraMatch ?? {}) } },
        { $count: "total" },
      ];
      const result = await FarmModel.aggregate(pipeline);
      return result[0]?.total ?? 0;
    };

    const [totalAgg, weeklyAgg, monthlyAgg, todayAgg, records] =
      await Promise.all([
        aggregateSum(),
        aggregateSum({ createdAt: { $gte: weekStart } }),
        aggregateSum({ createdAt: { $gte: monthStart } }),
        aggregateSum({ createdAt: { $gte: dayStart } }),
        aggregateCount(),
      ]);

    const pendingMatch: any = {
      organizationId: orgObjectId,
      status: FarmStatus.PENDING,
    };
    if (userObjectId) pendingMatch.userId = userObjectId;

    const pendingCountPipeline: any[] = [
      { $match: pendingMatch },
      { $count: "total" },
    ];
    const pendingCountResult = await FarmModel.aggregate(pendingCountPipeline);
    const pendingCount = pendingCountResult[0]?.total ?? 0;

    const daysInMonth =
      (new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ).getDate() -
        new Date().getDate() +
        1);
    const monthlyFarm = monthlyAgg.totalQuantity ?? 0;
    const weeklyFarm = weeklyAgg.totalQuantity ?? 0;
    const todayFarm = todayAgg.totalQuantity ?? 0;

    const dailyAverage = records > 0 ? Math.floor(monthlyFarm / daysInMonth) : 0;
    const weeklyAverage = records > 0 ? Math.floor(weeklyFarm / 7) : 0;

    return {
      totalFarm: totalAgg.totalQuantity ?? 0,
      monthlyFarm,
      weeklyFarm,
      dailyAverage,
      weeklyAverage,
      totalWithdrawn: totalAgg.totalWithdrawn ?? 0,
      recordCount: records,
      pendingFarms: pendingCount,
    };
  }

  async getOverview(organizationId: string) {
    const orgId = new mongoose.Types.ObjectId(organizationId);
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    const baseApproved: any = {
      organizationId: orgId,
      status: FarmStatus.APPROVED,
    };

    const sumFarm = (match?: Record<string, any>) =>
      FarmModel.aggregate([
        { $match: { ...baseApproved, ...(match ?? {}) } },
        {
          $group: {
            _id: null,
            qty: { $sum: "$quantity" },
            value: { $sum: "$withdrawnAmount" },
            count: { $sum: 1 },
          },
        },
      ]).then((r) => r[0] ?? { qty: 0, value: 0, count: 0 });

    // Gráfico últimos 7 dias
    const days: { label: string; quantity: number; value: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const label = d.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
      });
      const agg = await sumFarm({ createdAt: { $gte: d, $lt: next } });
      days.push({
        label: label.charAt(0).toUpperCase() + label.slice(1).replace(/-feira$/, ""),
        quantity: agg.qty ?? 0,
        value: agg.value ?? 0,
      });
    }

    // Top membros do mês
    const topMembersPipeline: any[] = [
      { $match: { ...baseApproved, createdAt: { $gte: monthStart } } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$userId",
          name: { $first: "$user.username" },
          avatar: { $first: "$user.avatar" },
          discordId: { $first: "$user.discordId" },
          total: { $sum: "$quantity" },
          withdrawn: { $sum: "$withdrawnAmount" },
          farms: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ];
    const topMembers = await FarmModel.aggregate(topMembersPipeline).then((arr) =>
      arr.map((m) => ({
        id: String(m._id),
        name: m.name ?? "Membro desconhecido",
        discordId: m.discordId,
        avatar: m.avatar,
        totalQuantity: m.total ?? 0,
        withdrawn: m.withdrawn ?? 0,
        farms: m.farms ?? 0,
      })),
    );

    // Últimos farms (últimos 10)
    const recent = await FarmModel.aggregate([
      { $match: { organizationId: orgId } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          quantity: 1,
          withdrawnAmount: 1,
          status: 1,
          createdAt: 1,
          "userId": 1,
          "user.username": 1,
          "user.discordId": 1,
          "user.avatar": 1,
        },
      },
    ]);

    const recentFarms = recent.map((r) => ({
      id: String(r._id),
      userId: String(r.userId),
      userName: r.user?.username ?? "Desconhecido",
      userDiscordId: r.user?.discordId,
      userAvatar: r.user?.avatar,
      quantity: r.quantity,
      withdrawnAmount: r.withdrawnAmount,
      status: r.status,
      createdAt: r.createdAt,
    }));

    const [all, weekly, monthly, pending, proofs, members, goals, inventory, activeGoal, vehicleSummary] =
      await Promise.all([
        sumFarm(),
        sumFarm({ createdAt: { $gte: weekStart } }),
        sumFarm({ createdAt: { $gte: monthStart } }),
        FarmModel.countDocuments({
          organizationId: orgId,
          status: FarmStatus.PENDING,
        }),
        ProofModel.countDocuments({ organizationId: orgId }),
        UserModel.countDocuments({
          organizationId: orgId,
          status: "ACTIVE",
        }).catch(() => UserModel.countDocuments({ organizationId: orgId })),
        GoalModel.countDocuments({
          organizationId: orgId,
          status: "ACHIEVED",
        }).catch(() => 0),
        InventoryItemModel.countDocuments({ organizationId: orgId }).catch(
          () => 0,
        ),
        (async (): Promise<GoalProgress | null> => {
          const goal = await GoalModel.findOne({
            organizationId: orgId,
            isActive: true,
            $or: [{ userId: null }, { userId: { $exists: false } }],
          })
            .sort({ createdAt: -1 })
            .lean();
          if (!goal) return null;
          const match: any = {
            organizationId: orgId,
            status: FarmStatus.APPROVED,
            createdAt: { $gte: goal.startDate, $lte: goal.endDate },
          };
          if (goal.userId) match.userId = goal.userId;
          const [farmAgg] = await FarmModel.aggregate([
            { $match: match },
            { $group: { _id: null, qty: { $sum: "$quantity" } } },
          ]).exec();
          const currentAmount = Number(farmAgg?.qty ?? 0);
          const targetAmount = Number(goal.targetAmount ?? 0);
          const progressPercentage =
            targetAmount > 0
              ? Math.min(100, Number(((currentAmount / targetAmount) * 100).toFixed(2)))
              : 0;
          return {
            id: String(goal._id),
            type: goal.type ?? GoalType.GLOBAL_MAIN,
            title: goal.title ?? "Meta da organização",
            description: goal.description ?? null,
            targetAmount,
            currentAmount,
            progressPercentage,
            remainingAmount: Math.max(0, targetAmount - currentAmount),
            startDate: goal.startDate,
            endDate: goal.endDate,
            isActive: Boolean(goal.isActive),
          };
        })(),
        (async (): Promise<VehicleSummary> => {
          const docs = await VehicleModel.aggregate([
            { $match: { organizationId: orgId } },
            { $group: { _id: "$status", total: { $sum: 1 } } },
          ]).exec();
          let stored = 0;
          let out = 0;
          let total = 0;
          for (const r of docs) {
            const c = Number(r.total ?? 0);
            if (r._id === "STORED") stored = c;
            else if (r._id === "OUT") out = c;
            total += c;
          }
          return { total, stored, out };
        })(),
      ]);

    return {
      kpis: {
        totalFarm: all.qty ?? 0,
        totalValue: all.value ?? 0,
        weeklyFarm: weekly.qty ?? 0,
        weeklyValue: weekly.value ?? 0,
        monthlyFarm: monthly.qty ?? 0,
        monthlyValue: monthly.value ?? 0,
        records: all.count ?? 0,
        pendingFarms: pending,
        proofs,
        members,
        goals,
        inventory,
        vehicles: vehicleSummary,
      },
      goal: activeGoal,
      vehicles: vehicleSummary,
      weeklyChart: days,
      topMembers,
      recentFarms,
    };
  }

  async getFarmStats(
    organizationId: string,
    period: "day" | "week" | "month" | "all" = "month",
  ) {
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);

    const { start, end } =
      period === "all"
        ? { start: new Date(0), end: new Date() }
        : this.getDateRange(period);

    const pipeline: any[] = [
      {
        $match: {
          organizationId: orgObjectId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalWithdrawn: { $sum: "$withdrawnAmount" },
        },
      },
    ];

    const result = await FarmModel.aggregate(pipeline);
    return result.map((r) => ({
      status: r._id,
      _count: { id: r.count },
      _sum: {
        quantity: r.totalQuantity,
        withdrawnAmount: r.totalWithdrawn,
      },
    }));
  }
}
