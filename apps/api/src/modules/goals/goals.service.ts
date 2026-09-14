import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  GoalModel,
  FarmModel,
  AuditLogModel,
  mongoose,
} from "@criminals/database";
import { createGoalSchema, updateGoalSchema } from "@criminals/shared";
import {
  AuditAction,
  Permission,
  DiscordRoleTier,
  FarmStatus,
  GoalType,
} from "@criminals/shared";
import type { CreateGoalInput, UpdateGoalInput, GoalProgress } from "@criminals/shared";
import { getPermissionsForTier } from "@criminals/shared";
import {
  createWithSessionOpts,
  runInTxSession,
} from "../../common/utils/db-transaction";

@Injectable()
export class GoalsService {
  constructor() {}

  async findActive(organizationId: string): Promise<GoalProgress | null> {
    const orgObjId = new mongoose.Types.ObjectId(organizationId);

    const goal = await GoalModel.findOne({
      organizationId: orgObjId,
      isActive: true,
    })
      .sort({ createdAt: "desc" })
      .populate("createdBy", "username globalName")
      .populate("updatedBy", "username globalName")
      .lean();

    if (!goal) return null;

    const match: any = {
      organizationId: orgObjId,
      status: FarmStatus.APPROVED,
      createdAt: {
        $gte: goal.startDate,
        $lte: goal.endDate,
      },
    };

    if (goal.userId) {
      match.userId = goal.userId;
    }

    const [farmAgg] = await FarmModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalWithdrawn: { $sum: "$withdrawnAmount" },
        },
      },
    ]);

    const currentAmount = farmAgg?.totalWithdrawn ?? 0;
    const targetAmount = Number(goal.targetAmount) || 0;
    const progressPercentage = targetAmount > 0
      ? Math.min(100, (currentAmount / targetAmount) * 100)
      : 0;
    const remainingAmount = Math.max(0, targetAmount - currentAmount);

    return {
      id: String(goal._id),
      type: goal.type,
      title: goal.title ?? null,
      description: goal.description ?? null,
      targetAmount,
      currentAmount,
      progressPercentage,
      remainingAmount,
      startDate: goal.startDate,
      endDate: goal.endDate,
      isActive: goal.isActive,
    };
  }

  async create(
    organizationId: string,
    userId: string,
    userTier: DiscordRoleTier,
    input: CreateGoalInput,
  ) {
    const permissions = getPermissionsForTier(userTier);
    if (!permissions.includes(Permission.MANAGE_GOALS)) {
      throw new ForbiddenException("Sem permissão para criar metas");
    }

    const validated = createGoalSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(validated.error.flatten());
    }

    const orgObjId = new mongoose.Types.ObjectId(organizationId);
    const userObjId = new mongoose.Types.ObjectId(userId);
    const { replaceActive, ...goalData } = validated.data;

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);

      const activeWhere: any = {
        organizationId: orgObjId,
        isActive: true,
      };
      if (goalData.userId) {
        activeWhere.userId = new mongoose.Types.ObjectId(goalData.userId);
      } else {
        activeWhere.userId = { $exists: false };
      }

      const existingActive = await GoalModel.findOne({
        ...activeWhere,
        ...(session ? {} : {}),
      }).session(session as any);

      if (existingActive && !replaceActive) {
        throw new BadRequestException(
          "Já existe uma meta ativa. Use replaceActive=true para substituí-la.",
        );
      }

      if (existingActive && replaceActive) {
        await GoalModel.updateOne(
          { _id: existingActive._id },
          { $set: { isActive: false, updatedBy: userObjId } },
          opts,
        );

        await AuditLogModel.create(
          [
            {
              organizationId: orgObjId,
              userId: userObjId,
              action: AuditAction.GOAL_DEACTIVATED,
              entity: "Goal",
              entityId: String(existingActive._id),
              metadata: {
                reason: "replaceActive on create",
                replacedBy: null,
              },
            },
          ],
          opts,
        );
      }

      const [goal] = await GoalModel.create(
        [
          {
            ...goalData,
            organizationId: orgObjId,
            createdBy: userObjId,
            userId: goalData.userId
              ? new mongoose.Types.ObjectId(goalData.userId)
              : undefined,
          },
        ],
        opts,
      );

      if (existingActive && replaceActive) {
        await AuditLogModel.updateOne(
          {
            organizationId: orgObjId,
            action: AuditAction.GOAL_DEACTIVATED,
            entityId: String(existingActive._id),
          },
          {
            $set: {
              "metadata.replacedBy": String(goal._id),
            },
          },
          opts,
        );
      }

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjId,
            userId: userObjId,
            action: AuditAction.GOAL_CREATED,
            entity: "Goal",
            entityId: String(goal._id),
            metadata: {
              ...goalData,
              replaceActive,
            },
          },
        ],
        opts,
      );

      if (goal.isActive) {
        await AuditLogModel.create(
          [
            {
              organizationId: orgObjId,
              userId: userObjId,
              action: AuditAction.GOAL_ACTIVATED,
              entity: "Goal",
              entityId: String(goal._id),
              metadata: { activatedOnCreate: true },
            },
          ],
          opts,
        );
      }

      return goal.toObject();
    });
  }

  async findAll(
    organizationId: string,
    filters?: { type?: string; isActive?: boolean; userId?: string },
  ) {
    const orgObjId = new mongoose.Types.ObjectId(organizationId);
    const whereClause: any = { organizationId: orgObjId };
    if (filters?.type) whereClause.type = filters.type;
    if (filters?.isActive !== undefined)
      whereClause.isActive = filters.isActive;
    if (filters?.userId)
      whereClause.userId = new mongoose.Types.ObjectId(filters.userId);

    return GoalModel.find(whereClause)
      .sort({ createdAt: "desc" })
      .populate("createdBy", "username globalName")
      .populate("updatedBy", "username globalName")
      .lean();
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    userTier: DiscordRoleTier,
    input: UpdateGoalInput,
  ) {
    const permissions = getPermissionsForTier(userTier);
    if (!permissions.includes(Permission.MANAGE_GOALS)) {
      throw new ForbiddenException("Sem permissão para editar metas");
    }

    const validated = updateGoalSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(validated.error.flatten());
    }

    const orgObjId = new mongoose.Types.ObjectId(organizationId);
    const userObjId = new mongoose.Types.ObjectId(userId);

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const goal = await GoalModel.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          organizationId: orgObjId,
        },
        {
          $set: {
            ...validated.data,
            updatedBy: userObjId,
          },
        },
        { ...opts, new: true, runValidators: true },
      );

      if (!goal) throw new BadRequestException("Meta não encontrada");

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjId,
            userId: userObjId,
            action: AuditAction.GOAL_UPDATED,
            entity: "Goal",
            entityId: id,
            metadata: validated.data,
          },
        ],
        opts,
      );

      return goal.toObject();
    });
  }

  async activate(
    id: string,
    organizationId: string,
    userId: string,
    userTier: DiscordRoleTier,
  ) {
    const permissions = getPermissionsForTier(userTier);
    if (!permissions.includes(Permission.MANAGE_GOALS)) {
      throw new ForbiddenException("Sem permissão para ativar metas");
    }

    const orgObjId = new mongoose.Types.ObjectId(organizationId);
    const userObjId = new mongoose.Types.ObjectId(userId);
    const goalObjId = new mongoose.Types.ObjectId(id);

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const goal = session
        ? await GoalModel.findOne({
            _id: goalObjId,
            organizationId: orgObjId,
          }).session(session as any)
        : await GoalModel.findOne({
            _id: goalObjId,
            organizationId: orgObjId,
          });

      if (!goal) {
        throw new NotFoundException("Meta não encontrada");
      }

      if (goal.isActive) {
        throw new BadRequestException("Meta já está ativa");
      }

      const activeWhere: any = {
        organizationId: orgObjId,
        isActive: true,
        _id: { $ne: goalObjId },
      };
      if (goal.userId) {
        activeWhere.userId = goal.userId;
      } else {
        activeWhere.userId = { $exists: false };
      }

      const otherActive = session
        ? await GoalModel.findOne(activeWhere).session(session as any)
        : await GoalModel.findOne(activeWhere);
      if (otherActive) {
        throw new BadRequestException(
          `Já existe uma meta ativa (${String(otherActive._id)}). Desative-a primeiro.`,
        );
      }

      goal.isActive = true;
      goal.updatedBy = userObjId;
      await goal.save(opts);

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjId,
            userId: userObjId,
            action: AuditAction.GOAL_ACTIVATED,
            entity: "Goal",
            entityId: id,
            metadata: { goalId: id },
          },
        ],
        opts,
      );

      return goal.toObject();
    });
  }

  async deactivate(
    id: string,
    organizationId: string,
    userId: string,
    userTier: DiscordRoleTier,
  ) {
    const permissions = getPermissionsForTier(userTier);
    if (!permissions.includes(Permission.MANAGE_GOALS)) {
      throw new ForbiddenException("Sem permissão para desativar metas");
    }

    const orgObjId = new mongoose.Types.ObjectId(organizationId);
    const userObjId = new mongoose.Types.ObjectId(userId);
    const goalObjId = new mongoose.Types.ObjectId(id);

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const goal = session
        ? await GoalModel.findOne({
            _id: goalObjId,
            organizationId: orgObjId,
          }).session(session as any)
        : await GoalModel.findOne({
            _id: goalObjId,
            organizationId: orgObjId,
          });

      if (!goal) {
        throw new NotFoundException("Meta não encontrada");
      }

      if (!goal.isActive) {
        throw new BadRequestException("Meta já está inativa");
      }

      goal.isActive = false;
      goal.updatedBy = userObjId;
      await goal.save(opts);

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjId,
            userId: userObjId,
            action: AuditAction.GOAL_DEACTIVATED,
            entity: "Goal",
            entityId: id,
            metadata: { goalId: id },
          },
        ],
        opts,
      );

      return goal.toObject();
    });
  }

  async remove(
    id: string,
    organizationId: string,
    userId: string,
    userTier: DiscordRoleTier,
  ) {
    const permissions = getPermissionsForTier(userTier);
    if (!permissions.includes(Permission.MANAGE_GOALS)) {
      throw new ForbiddenException("Sem permissão para deletar metas");
    }

    const orgObjId = new mongoose.Types.ObjectId(organizationId);
    const userObjId = new mongoose.Types.ObjectId(userId);

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjId,
            userId: userObjId,
            action: AuditAction.GOAL_DELETED,
            entity: "Goal",
            entityId: id,
            metadata: { goalId: id },
          },
        ],
        opts,
      );

      const deleted = await GoalModel.findOneAndDelete(
        {
          _id: new mongoose.Types.ObjectId(id),
          organizationId: orgObjId,
        },
        opts,
      );
      if (!deleted) throw new BadRequestException("Meta não encontrada");

      return deleted.toObject();
    });
  }
}
