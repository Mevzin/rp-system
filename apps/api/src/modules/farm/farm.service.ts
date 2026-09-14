import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import {
  FarmModel,
  ProofModel,
  AuditLogModel,
  mongoose,
} from "@criminals/database";
import {
  createFarmSchema,
  reviewFarmSchema,
} from "@criminals/shared";
import {
  FarmStatus,
  FarmType,
  AuditAction,
  Permission,
  DiscordRoleTier,
  ProofType,
} from "@criminals/shared";
import type { CreateFarmInput, ReviewFarmInput } from "@criminals/shared";
import { getPermissionsForTier } from "@criminals/shared";
import { ProofsService } from "../proofs/proofs.service";
import {
  createWithSessionOpts,
  runInTxSession,
} from "../../common/utils/db-transaction";
import { DiscordUploadService } from "../../common/utils/discord-upload";

type CreateFarmFormInput = {
  type?: string | number | null | undefined;
  quantity?: string | number | null | undefined;
  withdrawnAmount?: string | number | null | undefined;
  observation?: string | null | undefined;
  authorInfo?: {
    id: string;
    username: string | null;
    globalName: string | null;
    discordId: string | null;
  };
};

function parseSafeObjectId(
  value: string | undefined | null,
  label: string,
): mongoose.Types.ObjectId {
  if (!value || typeof value !== "string") {
    throw new BadRequestException(
      `Identificador de ${label} ausente ou inválido.`,
    );
  }
  const trimmed = value.trim();
  if (!mongoose.Types.ObjectId.isValid(trimmed)) {
    throw new BadRequestException(
      `Identificador de ${label} inválido: ObjectId esperado.`,
    );
  }
  return new mongoose.Types.ObjectId(trimmed);
}

const toObjectId = (v: any, label: string): mongoose.Types.ObjectId =>
  parseSafeObjectId(String(v ?? "").trim(), label);

function normalizeFarmType(raw: any): FarmType {
  if (raw === FarmType.BANK_DEPOSIT_PROOF) return FarmType.BANK_DEPOSIT_PROOF;
  if (raw === FarmType.NORMAL) return FarmType.NORMAL;
  if (typeof raw === "string") {
    const up = raw.trim().toUpperCase();
    if (["BANK_DEPOSIT_PROOF", "BANK", "CARGA", "DEPOSITO", "DEPOSITO_BANCARIO"].includes(up)) {
      return FarmType.BANK_DEPOSIT_PROOF;
    }
  }
  return FarmType.NORMAL;
}

function parseNumericField(
  raw: any,
  label: string,
  allowFractional = false,
): number {
  if (raw == null || raw === "") return 0;
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") n = Number(raw.trim());
  else throw new BadRequestException(`Campo ${label} inválido.`);
  if (!Number.isFinite(n)) {
    throw new BadRequestException(`Campo ${label} não é numérico.`);
  }
  if (!allowFractional && !Number.isInteger(n)) {
    throw new BadRequestException(
      `Campo ${label} deve ser um inteiro (use centavos).`,
    );
  }
  if (n < 0) {
    throw new BadRequestException(`Campo ${label} não pode ser negativo.`);
  }
  return n;
}

@Injectable()
export class FarmService {
  private readonly logger = new Logger(FarmService.name);

  constructor(
    private readonly proofsService: ProofsService,
    private readonly discordUpload: DiscordUploadService,
  ) { }

  private buildContentCaption(
    mode: FarmType,
    author: NonNullable<CreateFarmFormInput["authorInfo"]> | null,
    amountQuant: { quantity: number; withdrawnAmount: number; observation?: string | null },
  ): string {
    const display =
      author?.globalName || author?.username || author?.discordId || `user-${author?.id ?? "unknown"}`;
    const modeLabel = mode === FarmType.BANK_DEPOSIT_PROOF
      ? "Comprovante de Carga / Depósito Bancário"
      : "Farm Normal";
    const lines: string[] = [
      `💼 **Nova submissão: ${modeLabel}**`,
      `👤 Autor: ${display}${author?.discordId ? ` (<@${author.discordId}>)` : ""}`,
    ];
    if (amountQuant.quantity > 0) lines.push(`🌱 Quantidade: **${amountQuant.quantity.toLocaleString("pt-BR")}**`);
    if (amountQuant.withdrawnAmount > 0) {
      const real = (amountQuant.withdrawnAmount / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      lines.push(`💰 Retirado: **${real}**`);
    }
    if (amountQuant.observation?.trim()) {
      lines.push(`📝 Obs: ${amountQuant.observation.trim().slice(0, 600)}`);
    }
    lines.push(`⏰ Enviado em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
    return lines.join("\n");
  }

  async createFromFormData(
    userId: string,
    organizationId: string,
    form: CreateFarmFormInput,
    files: Express.Multer.File[],
  ) {
    const orgObj = toObjectId(organizationId, "organização");
    const userObj = toObjectId(userId, "usuário");

    const type = normalizeFarmType(form.type);
    const quantity = parseNumericField(form.quantity, "quantity");
    const withdrawnAmount = parseNumericField(
      form.withdrawnAmount,
      "withdrawnAmount",
    );
    const observation =
      typeof form.observation === "string"
        ? form.observation
        : form.observation == null
          ? null
          : String(form.observation);

    const authorInfo = form.authorInfo ?? {
      id: userId,
      username: null,
      globalName: null,
      discordId: null,
    };
    const authorName =
      authorInfo?.globalName || authorInfo?.username || null;

    const proofsSafe = Array.isArray(files) ? files.filter(Boolean) : [];

    const channelConfigured =
      this.discordUpload.getDefaultProofsChannelId() != null;

    if (type === FarmType.BANK_DEPOSIT_PROOF) {
      if (proofsSafe.length !== 1) {
        throw new BadRequestException(
          "Modalidade comprovante de carga aceita exatamente 1 anexo (a foto do comprovante bancário).",
        );
      }
      if (!channelConfigured) {
        throw new BadRequestException(
          "O canal de comprovantes do Discord não está configurado. " +
          "Informe FARM_PROOFS_DISCORD_CHANNEL_ID no .env e reinicie a API.",
        );
      }
    } else {
      if (proofsSafe.length > 5) {
        throw new BadRequestException(
          "Envie no máximo 5 anexos por farm.",
        );
      }
      const hasNumbers = quantity > 0 || withdrawnAmount > 0;
      const hasProofs = proofsSafe.length > 0;
      if (!hasNumbers && !hasProofs) {
        throw new BadRequestException(
          "Informe pelo menos a quantidade de componentes, valor gasto ou envie um comprovante anexado.",
        );
      }
      if (hasProofs && !channelConfigured) {
        throw new BadRequestException(
          "O canal de comprovantes do Discord não está configurado. " +
          "Informe FARM_PROOFS_DISCORD_CHANNEL_ID no .env e reinicie a API.",
        );
      }
    }

    for (const f of proofsSafe) {
      if (f.size > 24 * 1024 * 1024) {
        throw new BadRequestException(
          `Arquivo "${f.originalname}" ultrapassa 24MB (limite do Discord).`,
        );
      }
      if (f.size <= 0) {
        throw new BadRequestException(
          `Arquivo "${f.originalname || "anexo"}" está vazio.`,
        );
      }
      if (f.buffer == null) {
        throw new BadRequestException(
          `Arquivo "${f.originalname}" não tem buffer (multer não salvou em memória).`,
        );
      }
    }

    const caption = this.buildContentCaption(type, authorInfo, {
      quantity,
      withdrawnAmount,
      observation,
    });

    const uploaded = proofsSafe.length
      ? await Promise.all(
        proofsSafe.map(async (f, i) => {
          const result = await this.discordUpload.uploadFileToChannel({
            file: f.buffer,
            filename: f.originalname || `farm-${Date.now()}-${i}.bin`,
            mimeType: f.mimetype || undefined,
            caption: i === 0 ? caption : undefined,
          });
          return {
            file: f,
            discord: result,
          };
        }),
      )
      : [];

    const firstMsgId = uploaded[0]?.discord.messageId ?? null;
    const firstMsgChannel = uploaded[0]?.discord.channelId ?? null;
    const firstMsgJump = uploaded[0]?.discord.jumpUrl ?? null;

    const proofsPayload: CreateFarmInput["proofs"] = uploaded.map(
      (u, idx) => ({
        type:
          type === FarmType.BANK_DEPOSIT_PROOF
            ? ProofType.BANK_PROOF
            : idx === 0
              ? ProofType.BANK_PROOF
              : idx === 1
                ? ProofType.INVENTORY_PROOF
                : idx % 2 === 0
                  ? ProofType.BANK_PROOF
                  : ProofType.INVENTORY_PROOF,
        storageKey: `discord://${u.discord.channelId}/${u.discord.messageId}/${u.discord.attachmentId}`,
        url: u.discord.cdnUrl,
        discordMessageId: u.discord.messageId,
        discordAttachmentId: u.discord.attachmentId,
        discordJumpUrl: u.discord.jumpUrl,
        metadata: {
          mimeType: u.discord.contentType || u.file.mimetype || "application/octet-stream",
          sizeBytes: u.discord.sizeBytes || u.file.size || 1,
          filename: u.discord.filename || u.file.originalname || undefined,
        },
      }),
    );

    if (
      type !== FarmType.BANK_DEPOSIT_PROOF &&
      proofsPayload.length >= 2 &&
      proofsPayload.every((p) => p.type === ProofType.BANK_PROOF)
    ) {
      proofsPayload[proofsPayload.length - 1].type = ProofType.INVENTORY_PROOF;
    }

    const input: CreateFarmInput = {
      type,
      quantity,
      withdrawnAmount,
      observation: observation ?? null,
      proofs: proofsPayload,
    };

    const created = await this.create(userId, organizationId, input, {
      discordMessageId: firstMsgId,
      discordChannelId: firstMsgChannel,
      discordJumpUrl: firstMsgJump,
      authorName,
    });
    return created;
  }

  async create(
    userId: string,
    organizationId: string,
    input: CreateFarmInput,
    extra?: {
      discordMessageId?: string | null;
      discordChannelId?: string | null;
      discordJumpUrl?: string | null;
      authorName?: string | null;
    },
  ) {
    const validated = createFarmSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(validated.error.flatten());
    }

    const orgObjectId = toObjectId(organizationId, "organização");
    const userObjectId = toObjectId(userId, "usuário");

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);

      const [farmDoc] = await FarmModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            type: validated.data.type ?? FarmType.NORMAL,
            quantity: validated.data.quantity,
            withdrawnAmount: validated.data.withdrawnAmount,
            observation: validated.data.observation ?? null,
            status: FarmStatus.PENDING,
            discordMessageId: extra?.discordMessageId ?? null,
            discordChannelId: extra?.discordChannelId ?? null,
            discordJumpUrl: extra?.discordJumpUrl ?? null,
          },
        ],
        opts,
      );

      const farmId = farmDoc._id;
      const proofDocs = (validated.data.proofs ?? []).map((p) => ({
        organizationId: orgObjectId,
        farmId,
        type: p.type,
        storageKey: p.storageKey,
        url: p.url,
        uploadedBy: userObjectId,
        discordMessageId: (p as any).discordMessageId ?? null,
        discordAttachmentId: (p as any).discordAttachmentId ?? null,
        discordJumpUrl: (p as any).discordJumpUrl ?? null,
        discordChannelId: extra?.discordChannelId ?? null,
        metadata: p.metadata ?? {
          mimeType: "image/png",
          sizeBytes: 1,
          filename: "proof.png",
        },
      }));
      if (proofDocs.length > 0) {
        await ProofModel.insertMany(proofDocs, opts);
      }

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            action: AuditAction.FARM_CREATED,
            entity: "Farm",
            entityId: String(farmId),
            metadata: {
              type: validated.data.type ?? FarmType.NORMAL,
              quantity: validated.data.quantity,
              withdrawnAmount: validated.data.withdrawnAmount,
              proofsCount: proofDocs.length,
              authorName: extra?.authorName ?? null,
              discordMessageId: extra?.discordMessageId ?? null,
            },
          },
        ],
        opts,
      );

      return FarmModel.aggregate([
        { $match: { _id: farmId, organizationId: orgObjectId } },
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
                  avatar: 1,
                  discordId: 1,
                },
              },
            ],
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "proofs",
            localField: "_id",
            foreignField: "farmId",
            as: "proofs",
          },
        },
      ]).then((arr: any[]) => arr?.[0] ?? null);
    });
  }

  async findAll(
    organizationId: string,
    userTier: DiscordRoleTier,
    userId: string,
    filters?: {
      status?: FarmStatus;
      userId?: string;
      page?: number;
      perPage?: number;
      type?: FarmType;
    },
  ) {
    const permissions = getPermissionsForTier(userTier);
    const canViewAll = permissions.includes(Permission.VIEW_ALL_FARMS);

    const orgObjectId = toObjectId(organizationId, "organização");
    const whereClause: any = { organizationId: orgObjectId };
    if (filters?.status) whereClause.status = filters.status;
    if (filters?.type) whereClause.type = filters.type;
    if (canViewAll) {
      if (filters?.userId)
        whereClause.userId = toObjectId(filters.userId, "usuário");
    } else {
      whereClause.userId = toObjectId(userId, "usuário");
    }

    const page = filters?.page ?? 1;
    const perPage = filters?.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const [data, total] = await Promise.all([
      FarmModel.aggregate([
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
                  avatar: 1,
                  discordId: 1,
                },
              },
            ],
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "reviewedBy",
            foreignField: "_id",
            as: "reviewedBy",
            pipeline: [{ $project: { username: 1, globalName: 1 } }],
          },
        },
        {
          $unwind: {
            path: "$reviewedBy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "proofs",
            localField: "_id",
            foreignField: "farmId",
            as: "proofs",
          },
        },
      ]).exec(),
      FarmModel.countDocuments(whereClause),
    ]);

    return {
      items: data,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasNext: page < Math.ceil(total / perPage),
        hasPrev: page > 1,
      },
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findById(
    id: string,
    organizationId: string,
    userTier: DiscordRoleTier,
    currentUserId: string,
  ) {
    const permissions = getPermissionsForTier(userTier);
    const canViewAll = permissions.includes(Permission.VIEW_ALL_FARMS);

    const orgObjectId = toObjectId(organizationId, "organização");
    const match: any = {
      _id: toObjectId(id, "farm"),
      organizationId: orgObjectId,
    };
    if (!canViewAll) {
      match.userId = toObjectId(currentUserId, "usuário");
    }

    const result = await FarmModel.aggregate([
      { $match: match },
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
        $lookup: {
          from: "users",
          localField: "reviewedBy",
          foreignField: "_id",
          as: "reviewedBy",
        },
      },
      {
        $unwind: {
          path: "$reviewedBy",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "proofs",
          localField: "_id",
          foreignField: "farmId",
          as: "proofs",
        },
      },
    ]).exec();

    if (!result || result.length === 0) {
      throw new BadRequestException("Farm não encontrado");
    }
    return result[0];
  }

  async approve(
    id: string,
    organizationId: string,
    reviewerId: string,
    userTier: DiscordRoleTier,
  ) {
    const permissions = getPermissionsForTier(userTier);
    if (!permissions.includes(Permission.REVIEW_FARM)) {
      throw new ForbiddenException("Sem permissão para aprovar farms");
    }
    const reviewerObjId = toObjectId(reviewerId, "usuário");
    const orgObjId = toObjectId(organizationId, "organização");
    const now = new Date();

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const farm = await FarmModel.findOneAndUpdate(
        {
          _id: toObjectId(id, "farm"),
          organizationId: orgObjId,
          status: FarmStatus.PENDING,
        },
        {
          $set: {
            status: FarmStatus.APPROVED,
            reviewedBy: reviewerObjId,
            reviewedAt: now,
            rejectionReason: null,
          },
        },
        { ...opts, new: true, runValidators: true },
      ).lean();

      if (!farm) {
        throw new BadRequestException("Farm não está pendente");
      }

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjId,
            userId: reviewerObjId,
            action: AuditAction.FARM_APPROVED,
            entity: "Farm",
            entityId: id,
            metadata: {
              type: (farm as any).type ?? FarmType.NORMAL,
              memberId: String(farm.userId),
              quantity: farm.quantity,
              withdrawnAmount: farm.withdrawnAmount,
              discordMessageId: (farm as any).discordMessageId ?? null,
            },
          },
        ],
        opts,
      );

      return farm;
    });
  }

  async reject(
    id: string,
    organizationId: string,
    reviewerId: string,
    userTier: DiscordRoleTier,
    input: ReviewFarmInput,
    options?: { deleteDiscordMessages?: boolean },
  ) {
    const permissions = getPermissionsForTier(userTier);
    if (!permissions.includes(Permission.REVIEW_FARM)) {
      throw new ForbiddenException("Sem permissão para rejeitar farms");
    }

    const validated = reviewFarmSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(validated.error.flatten());
    }
    if (!validated.data.rejectionReason) {
      throw new BadRequestException("Motivo da rejeição é obrigatório");
    }

    const reviewerObjId = toObjectId(reviewerId, "usuário");
    const orgObjId = toObjectId(organizationId, "organização");
    const now = new Date();
    const shouldDeleteDiscord = options?.deleteDiscordMessages ?? false;

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const farmObjId = toObjectId(id, "farm");

      const farmBefore = await FarmModel.findOne({
        _id: farmObjId,
        organizationId: orgObjId,
      }).lean();

      const farm = await FarmModel.findOneAndUpdate(
        {
          _id: farmObjId,
          organizationId: orgObjId,
          status: FarmStatus.PENDING,
        },
        {
          $set: {
            status: FarmStatus.REJECTED,
            rejectionReason: validated.data.rejectionReason,
            reviewedBy: reviewerObjId,
            reviewedAt: now,
          },
        },
        { ...opts, new: true, runValidators: true },
      ).lean();

      if (!farm) {
        throw new BadRequestException("Farm não está pendente");
      }

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjId,
            userId: reviewerObjId,
            action: AuditAction.FARM_REJECTED,
            entity: "Farm",
            entityId: id,
            metadata: {
              type: (farm as any).type ?? FarmType.NORMAL,
              memberId: String(farm.userId),
              quantity: farm.quantity,
              withdrawnAmount: farm.withdrawnAmount,
              rejectionReason: validated.data.rejectionReason,
              discordMessageId: (farmBefore as any)?.discordMessageId ?? null,
            },
          },
        ],
        opts,
      );

      try {
        if (shouldDeleteDiscord) {
          const proofs = await ProofModel.find({
            farmId: farmObjId,
            organizationId: orgObjId,
          })
            .select("discordChannelId discordMessageId")
            .lean();
          const candidates = new Map<
            string,
            Set<string>
          >();
          const push = (ch: string | null | undefined, msg: string | null | undefined) => {
            if (!ch || !msg) return;
            if (!candidates.has(ch)) candidates.set(ch, new Set());
            candidates.get(ch)!.add(msg);
          };
          push(
            (farmBefore as any)?.discordChannelId,
            (farmBefore as any)?.discordMessageId,
          );
          for (const p of proofs) {
            push(p.discordChannelId as any, p.discordMessageId as any);
          }
          for (const [ch, msgs] of candidates) {
            for (const msg of msgs) {
              try {
                await this.discordUpload.deleteMessage(ch, msg);
              } catch (err) {
                this.logger.warn(
                  `skip deleteDiscord proof ch=${ch} msg=${msg}: ${(err as any)?.message ?? err}`,
                );
              }
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `reject discord delete failed, continue anyway: ${err?.message ?? err}`,
        );
      }

      return farm;
    });
  }
}

