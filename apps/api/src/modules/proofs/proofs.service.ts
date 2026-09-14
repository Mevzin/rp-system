import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ProofModel, AuditLogModel, mongoose, UserModel } from "@criminals/database";
import { AuditAction, Permission } from "@criminals/shared";
import { UploadsService } from "../uploads/uploads.service";
import { PipelineStage } from "mongoose";

@Injectable()
export class ProofsService {
  private readonly logger = new Logger(ProofsService.name);

  constructor(private readonly uploadsService: UploadsService) {}

  async findByFarmId(farmId: string) {
    return ProofModel.find({ farmId: new mongoose.Types.ObjectId(farmId) })
      .sort({ createdAt: "desc" })
      .lean();
  }

  async createMany(proofs: any[]) {
    const prepared = proofs.map((p) => ({
      ...p,
      farmId: new mongoose.Types.ObjectId(p.farmId),
      organizationId: new mongoose.Types.ObjectId(p.organizationId),
      uploadedBy: new mongoose.Types.ObjectId(p.uploadedBy),
    }));
    return ProofModel.insertMany(prepared);
  }

  async listForOrganization(params: {
    organizationId: string;
    page: number;
    perPage: number;
    type?: string;
    farmId?: string;
    uploadedBy?: string;
  }) {
    const { organizationId, page, perPage, type, farmId, uploadedBy } = params;

    const match: Record<string, any> = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };
    if (type) match.type = type;
    if (farmId) match.farmId = new mongoose.Types.ObjectId(farmId);
    if (uploadedBy) match.uploadedBy = new mongoose.Types.ObjectId(uploadedBy);

    const pipeline: PipelineStage[] = [{ $match: match }];

    pipeline.push({ $sort: { createdAt: -1 } });

    const facet: PipelineStage.Facet["$facet"] = {
      metadata: [{ $count: "total" }],
      items: [
        { $skip: (page - 1) * perPage },
        { $limit: perPage },
        {
          $lookup: {
            from: UserModel.collection.name,
            localField: "uploadedBy",
            foreignField: "_id",
            as: "uploadedByUser",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  discordId: 1,
                  username: 1,
                  avatar: 1,
                  globalName: 1,
                },
              },
            ],
          },
        },
        { $unwind: { path: "$uploadedByUser", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: 1,
            url: 1,
            storageKey: 1,
            metadata: 1,
            farmId: 1,
            uploadedBy: 1,
            organizationId: 1,
            createdAt: 1,
            updatedAt: 1,
            "uploadedByUser._id": 1,
            "uploadedByUser.username": 1,
            "uploadedByUser.globalName": 1,
            "uploadedByUser.discordId": 1,
            "uploadedByUser.avatar": 1,
          },
        },
      ],
    };

    pipeline.push({ $facet: facet });

    const [agg] = await ProofModel.aggregate(pipeline);
    const total = (agg?.metadata?.[0]?.total as number) ?? 0;
    const items = (agg?.items as any[]) ?? [];

    return {
      items,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        hasNext: page * perPage < total,
        hasPrev: page > 1,
      },
    };
  }

  async getByIdOrThrow(id: string, organizationId: string) {
    const proof = await ProofModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).lean();
    if (!proof) throw new BadRequestException("Proof não encontrada.");
    return proof;
  }

  async deleteManyByIds(
    ids: string[],
    params: { organizationId: string; deletedByUserId: string },
  ): Promise<{ deletedCount: number; deletedFiles: number; idsNotFound: string[] }> {
    const { organizationId, deletedByUserId } = params;

    const objectIds = ids
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((v): v is mongoose.Types.ObjectId => v !== null);

    if (objectIds.length === 0) {
      return { deletedCount: 0, deletedFiles: 0, idsNotFound: ids };
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const proofs = await ProofModel.find({
      _id: { $in: objectIds },
      organizationId: orgObjectId,
    }).lean();

    const deletedStorageKeys: string[] = [];
    const deletedProofIds: mongoose.Types.ObjectId[] = [];

    for (const proof of proofs) {
      try {
        if (proof.storageKey) {
          const ok = this.uploadsService.deleteFileByStorageKey(proof.storageKey);
          if (ok) deletedStorageKeys.push(proof.storageKey);
        }
      } catch (e) {
        this.logger.warn(`Não apagou arquivo do proof ${proof._id}: ${e}`);
      }
      deletedProofIds.push(proof._id);
    }

    let deletedCount = 0;
    try {
      if (deletedProofIds.length > 0) {
        const res = await ProofModel.deleteMany({ _id: { $in: deletedProofIds } });
        deletedCount = res.deletedCount || 0;
      }
    } catch (e) {
      this.logger.error(`Erro ao deletar proofs no banco: ${e}`);
    }

    const idsNotFound: string[] = ids.filter(
      (id) => !deletedProofIds.some((oid) => oid.toString() === id),
    );

    try {
      const auditPayload: any = {
        organizationId: orgObjectId,
        userId: new mongoose.Types.ObjectId(deletedByUserId),
        action: AuditAction.UPLOAD_DELETED,
        entity: "Proof",
        metadata: {
          ids: ids,
          deletedCount,
          deletedFiles: deletedStorageKeys.length,
          storageKeys: deletedStorageKeys,
        },
      };
      await AuditLogModel.create(auditPayload);
    } catch (e) {
      this.logger.warn(`Não criou audit log de deleção de proofs: ${e}`);
    }

    return {
      deletedCount,
      deletedFiles: deletedStorageKeys.length,
      idsNotFound,
    };
  }
}
