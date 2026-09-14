import { Injectable } from "@nestjs/common";
import {
  AuditLogModel,
  mongoose,
} from "@criminals/database";
import { AuditAction } from "@criminals/shared";

@Injectable()
export class AuditService {
  constructor() { }

  async findAll(
    organizationId: string,
    filters?: {
      action?: AuditAction;
      userId?: string;
      entity?: string;
      page?: number;
      perPage?: number;
    },
  ): Promise<any> {
    const page = filters?.page ?? 1;
    const perPage = filters?.perPage ?? 50;
    const skip = (page - 1) * perPage;

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const whereClause: any = { organizationId: orgObjectId };
    if (filters?.action) whereClause.action = filters.action;
    if (filters?.userId)
      whereClause.userId = new mongoose.Types.ObjectId(filters.userId);
    if (filters?.entity) whereClause.entity = filters.entity;

    const [data, total] = await Promise.all([
      AuditLogModel.aggregate([
        { $match: whereClause },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: perPage },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
            pipeline: [
              {
                $project: {
                  username: 1,
                  globalName: 1,
                  displayName: 1,
                  discordId: 1,
                  avatar: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
        },
      ]).exec(),
      AuditLogModel.countDocuments(whereClause),
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

  async create(
    organizationId: string,
    data: {
      userId?: string;
      action: AuditAction;
      entity?: string;
      entityId?: string;
      metadata?: any;
    },
  ): Promise<any> {
    const payload: any = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      metadata: data.metadata,
    };
    if (data.userId) {
      payload.userId = new mongoose.Types.ObjectId(data.userId);
    }
    return AuditLogModel.create(payload);
  }
}
