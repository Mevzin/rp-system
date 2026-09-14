import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  InventoryItemModel,
  InventoryMovementModel,
  AuditLogModel,
  mongoose,
} from "@criminals/database";
import {
  createInventoryItemSchema,
  createInventoryMovementSchema,
} from "@criminals/shared";
import {
  AuditAction,
  Permission,
  DiscordRoleTier,
  InventoryMovementType,
} from "@criminals/shared";
import type {
  CreateInventoryItemInput,
  CreateInventoryMovementInput,
} from "@criminals/shared";
import { getPermissionsForTier } from "@criminals/shared";
import {
  createWithSessionOpts,
  runInTxSession,
} from "../../common/utils/db-transaction";

@Injectable()
export class InventoryService {
  async getItems(organizationId: string) {
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    return InventoryItemModel.find({ organizationId: orgObjectId })
      .sort({ name: "asc" })
      .lean();
  }

  async createItem(
    organizationId: string,
    userId: string,
    userTier: DiscordRoleTier,
    input: CreateInventoryItemInput,
  ) {
    const permissions = getPermissionsForTier(userTier);
    if (!permissions.includes(Permission.MANAGE_INVENTORY)) {
      throw new ForbiddenException("Sem permissão para criar itens");
    }

    const validated = createInventoryItemSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(validated.error.flatten());
    }

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const orgObjectId = new mongoose.Types.ObjectId(organizationId);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const [itemDoc] = await InventoryItemModel.create(
        [
          {
            ...validated.data,
            organizationId: orgObjectId,
          },
        ],
        opts,
      );

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            action: AuditAction.INVENTORY_ITEM_CREATED,
            entity: "InventoryItem",
            entityId: itemDoc._id.toString(),
            metadata: itemDoc.toObject(),
          },
        ],
        opts,
      );

      return itemDoc.toObject();
    });
  }

  async createMovement(
    organizationId: string,
    userId: string,
    userTier: DiscordRoleTier,
    input: CreateInventoryMovementInput,
  ) {
    const permissions = getPermissionsForTier(userTier);
    if (!permissions.includes(Permission.MANAGE_INVENTORY)) {
      throw new ForbiddenException("Sem permissão para criar movimentações");
    }

    const validated = createInventoryMovementSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(validated.error.flatten());
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const itemObjectId = new mongoose.Types.ObjectId(validated.data.itemId);

    const item = await InventoryItemModel.findOne({
      _id: itemObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!item) {
      throw new BadRequestException("Item não encontrado");
    }

    if (
      validated.data.type === InventoryMovementType.OUT &&
      item.quantity < validated.data.quantity
    ) {
      throw new BadRequestException("Quantidade insuficiente em estoque");
    }

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      let quantityDelta = 0;
      switch (validated.data.type) {
        case InventoryMovementType.IN:
          quantityDelta = validated.data.quantity;
          break;
        case InventoryMovementType.OUT:
          quantityDelta = -validated.data.quantity;
          break;
        case InventoryMovementType.ADJUSTMENT:
          quantityDelta = 0;
          break;
      }

      let updatedItem = item;
      if (quantityDelta !== 0) {
        updatedItem = (await InventoryItemModel.findOneAndUpdate(
          { _id: itemObjectId },
          { $inc: { quantity: quantityDelta } },
          { ...opts, new: true, runValidators: true },
        ).lean()) as any;
      }

      const [movementDoc] = await InventoryMovementModel.create(
        [
          {
            ...validated.data,
            organizationId: orgObjectId,
            userId: userObjectId,
            stockBefore: item.quantity,
            stockAfter: updatedItem.quantity,
          },
        ],
        opts,
      );

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            action: AuditAction.INVENTORY_MOVEMENT_CREATED,
            entity: "InventoryMovement",
            entityId: movementDoc._id.toString(),
            metadata: {
              ...validated.data,
              oldQuantity: item.quantity,
              newQuantity: updatedItem.quantity,
            },
          },
        ],
        opts,
      );

      return movementDoc.toObject();
    });
  }

  async getMovements(
    organizationId: string,
    filters?: { itemId?: string; page?: number; perPage?: number },
  ) {
    const page = filters?.page ?? 1;
    const perPage = filters?.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const whereClause: any = { organizationId: orgObjectId };
    if (filters?.itemId) {
      whereClause.itemId = new mongoose.Types.ObjectId(filters.itemId);
    }

    const [data, total] = await Promise.all([
      InventoryMovementModel.find(whereClause)
        .sort({ createdAt: "desc" })
        .skip(skip)
        .limit(perPage)
        .populate("item", "name")
        .populate("userId", "username globalName")
        .lean(),
      InventoryMovementModel.countDocuments(whereClause),
    ]);

    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }
}
