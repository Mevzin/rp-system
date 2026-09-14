import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import {
  VehicleModel,
  VehicleHistoryModel,
  AuditLogModel,
  mongoose,
} from "@criminals/database";
import {
  createVehicleSchema,
  updateVehicleSchema,
} from "@criminals/shared";
import {
  AuditAction,
  VehicleStatus,
  VehicleHistoryAction,
} from "@criminals/shared";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  PaginatedResponse,
} from "@criminals/shared";
import {
  createWithSessionOpts,
  runInTxSession,
} from "../../common/utils/db-transaction";

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
      `Identificador de ${label} inválido: deve ser um ObjectId válido (24 caracteres hex).`,
    );
  }
  return new mongoose.Types.ObjectId(trimmed);
}

type AnyPlainRecord = Record<string, any>;

function toIdString(value: any): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value.toString === "function") {
    const s = value.toString();
    return s;
  }
  return String(value);
}

function serializeVehicle(doc: any): AnyPlainRecord {
  if (!doc) return doc as any;
  const plain: AnyPlainRecord =
    typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const _id = plain._id ?? plain.id;
  const id = toIdString(_id);
  const result: AnyPlainRecord = {
    ...plain,
    id,
    organizationId: toIdString(plain.organizationId),
    ownerUserId: toIdString(plain.ownerUserId) ?? null,
    lastActionBy: toIdString(plain.lastActionBy) ?? null,
    createdBy: toIdString(plain.createdBy) ?? null,
    updatedBy: toIdString(plain.updatedBy) ?? null,
  };
  delete result._id;
  return result;
}

@Injectable()
export class VehiclesService {
  async findAll(organizationId: string) {
    const orgObjectId = parseSafeObjectId(organizationId, "organização");
    const docs = await VehicleModel.find({ organizationId: orgObjectId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(serializeVehicle);
  }

  async findById(organizationId: string, vehicleId: string) {
    const orgObjectId = parseSafeObjectId(organizationId, "organização");
    const vehicleObjectId = parseSafeObjectId(vehicleId, "veículo");

    const vehicle = await VehicleModel.findOne({
      _id: vehicleObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!vehicle) {
      throw new NotFoundException("Veículo não encontrado");
    }

    return serializeVehicle(vehicle);
  }

  async create(
    organizationId: string,
    userId: string,
    input: CreateVehicleInput,
  ) {
    const validated = createVehicleSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(validated.error.flatten());
    }

    const orgObjectId = parseSafeObjectId(organizationId, "organização");
    const userObjectId = parseSafeObjectId(userId, "usuário");

    const existing = await VehicleModel.findOne({
      organizationId: orgObjectId,
      plate: validated.data.plate.trim(),
    }).lean();

    if (existing) {
      throw new ConflictException(
        "Já existe um veículo com essa placa na organização",
      );
    }

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const vehicleDocList = await VehicleModel.create(
        [
          {
            ...validated.data,
            plate: validated.data.plate.trim(),
            organizationId: orgObjectId,
            createdBy: userObjectId,
            updatedBy: userObjectId,
          },
        ],
        opts,
      );
      const vehicleDoc = vehicleDocList[0];

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            action: AuditAction.VEHICLE_CREATED,
            entity: "Vehicle",
            entityId: vehicleDoc._id.toString(),
            metadata: serializeVehicle(vehicleDoc.toObject()),
          },
        ],
        opts,
      );

      return serializeVehicle(vehicleDoc.toObject());
    });
  }

  async update(
    organizationId: string,
    userId: string,
    vehicleId: string,
    input: UpdateVehicleInput,
  ) {
    const validated = updateVehicleSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(validated.error.flatten());
    }

    const orgObjectId = parseSafeObjectId(organizationId, "organização");
    const userObjectId = parseSafeObjectId(userId, "usuário");
    const vehicleObjectId = parseSafeObjectId(vehicleId, "veículo");

    const existing = await VehicleModel.findOne({
      _id: vehicleObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!existing) {
      throw new NotFoundException("Veículo não encontrado");
    }

    if (validated.data.plate && validated.data.plate.trim() !== existing.plate) {
      const plateConflict = await VehicleModel.findOne({
        organizationId: orgObjectId,
        plate: validated.data.plate.trim(),
        _id: { $ne: vehicleObjectId },
      }).lean();

      if (plateConflict) {
        throw new ConflictException(
          "Já existe um veículo com essa placa na organização",
        );
      }
    }

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const updateData: any = {
        ...validated.data,
        updatedBy: userObjectId,
      };

      if (validated.data.plate) {
        updateData.plate = validated.data.plate.trim();
      }

      const updatedVehicle = await VehicleModel.findOneAndUpdate(
        { _id: vehicleObjectId, organizationId: orgObjectId },
        { $set: updateData },
        { ...opts, new: true, runValidators: true },
      ).lean();

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            action: AuditAction.VEHICLE_UPDATED,
            entity: "Vehicle",
            entityId: vehicleId,
            metadata: {
              before: serializeVehicle(existing),
              after: serializeVehicle(updatedVehicle),
            },
          },
        ],
        opts,
      );

      return serializeVehicle(updatedVehicle);
    });
  }

  async remove(
    organizationId: string,
    userId: string,
    vehicleId: string,
  ) {
    const orgObjectId = parseSafeObjectId(organizationId, "organização");
    const userObjectId = parseSafeObjectId(userId, "usuário");
    const vehicleObjectId = parseSafeObjectId(vehicleId, "veículo");

    const existing = await VehicleModel.findOne({
      _id: vehicleObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!existing) {
      throw new NotFoundException("Veículo não encontrado");
    }

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      await VehicleModel.deleteOne(
        { _id: vehicleObjectId, organizationId: orgObjectId },
        opts,
      );

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            action: AuditAction.VEHICLE_DELETED,
            entity: "Vehicle",
            entityId: vehicleId,
            metadata: serializeVehicle(existing),
          },
        ],
        opts,
      );

      return { success: true };
    });
  }

  async take(
    organizationId: string,
    userId: string,
    vehicleId: string,
  ) {
    const orgObjectId = parseSafeObjectId(organizationId, "organização");
    const userObjectId = parseSafeObjectId(userId, "usuário");
    const vehicleObjectId = parseSafeObjectId(vehicleId, "veículo");

    const existing = await VehicleModel.findOne({
      _id: vehicleObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!existing) {
      throw new NotFoundException("Veículo não encontrado");
    }

    if (existing.status === VehicleStatus.DETAINED) {
      throw new BadRequestException(
        "Veículo está detido e não pode ser retirado. Libere-o primeiro.",
      );
    }
    if (existing.status === VehicleStatus.OUT) {
      throw new BadRequestException("Veículo já está fora da garagem");
    }

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const now = new Date();
      const updatedVehicle = await VehicleModel.findOneAndUpdate(
        { _id: vehicleObjectId, organizationId: orgObjectId },
        {
          $set: {
            status: VehicleStatus.OUT,
            lastActionBy: userObjectId,
            lastActionAt: now,
            updatedBy: userObjectId,
          },
        },
        { ...opts, new: true, runValidators: true },
      ).lean();

      await VehicleHistoryModel.create(
        [
          {
            vehicleId: vehicleObjectId,
            organizationId: orgObjectId,
            userId: userObjectId,
            action: VehicleHistoryAction.TAKEN,
            metadata: {
              previousStatus: existing.status,
              newStatus: VehicleStatus.OUT,
            },
          },
        ],
        opts,
      );

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            action: AuditAction.VEHICLE_TAKEN,
            entity: "Vehicle",
            entityId: vehicleId,
            metadata: {
              vehicleModel: existing.model,
              plate: existing.plate,
              previousStatus: existing.status,
              newStatus: VehicleStatus.OUT,
            },
          },
        ],
        opts,
      );

      return serializeVehicle(updatedVehicle);
    });
  }

  async store(
    organizationId: string,
    userId: string,
    vehicleId: string,
  ) {
    const orgObjectId = parseSafeObjectId(organizationId, "organização");
    const userObjectId = parseSafeObjectId(userId, "usuário");
    const vehicleObjectId = parseSafeObjectId(vehicleId, "veículo");

    const existing = await VehicleModel.findOne({
      _id: vehicleObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!existing) {
      throw new NotFoundException("Veículo não encontrado");
    }

    if (existing.status === VehicleStatus.DETAINED) {
      throw new BadRequestException(
        "Veículo está detido. Libere-o antes de guardar na garagem.",
      );
    }
    if (existing.status === VehicleStatus.STORED) {
      throw new BadRequestException("Veículo já está na garagem");
    }

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const now = new Date();
      const updatedVehicle = await VehicleModel.findOneAndUpdate(
        { _id: vehicleObjectId, organizationId: orgObjectId },
        {
          $set: {
            status: VehicleStatus.STORED,
            lastActionBy: userObjectId,
            lastActionAt: now,
            updatedBy: userObjectId,
          },
        },
        { ...opts, new: true, runValidators: true },
      ).lean();

      await VehicleHistoryModel.create(
        [
          {
            vehicleId: vehicleObjectId,
            organizationId: orgObjectId,
            userId: userObjectId,
            action: VehicleHistoryAction.STORED,
            metadata: {
              previousStatus: existing.status,
              newStatus: VehicleStatus.STORED,
            },
          },
        ],
        opts,
      );

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            action: AuditAction.VEHICLE_STORED,
            entity: "Vehicle",
            entityId: vehicleId,
            metadata: {
              vehicleModel: existing.model,
              plate: existing.plate,
              previousStatus: existing.status,
              newStatus: VehicleStatus.STORED,
            },
          },
        ],
        opts,
      );

      return serializeVehicle(updatedVehicle);
    });
  }

  async toggleDetain(
    organizationId: string,
    userId: string,
    vehicleId: string,
  ) {
    const orgObjectId = parseSafeObjectId(organizationId, "organização");
    const userObjectId = parseSafeObjectId(userId, "usuário");
    const vehicleObjectId = parseSafeObjectId(vehicleId, "veículo");

    const existing = await VehicleModel.findOne({
      _id: vehicleObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!existing) {
      throw new NotFoundException("Veículo não encontrado");
    }

    const isCurrentlyDetained = existing.status === VehicleStatus.DETAINED;

    const nextStatus = isCurrentlyDetained
      ? VehicleStatus.STORED
      : VehicleStatus.DETAINED;

    const historyAction = isCurrentlyDetained
      ? VehicleHistoryAction.RELEASED
      : VehicleHistoryAction.DETAINED;

    const auditAction = isCurrentlyDetained
      ? AuditAction.VEHICLE_RELEASED
      : AuditAction.VEHICLE_DETAINED;

    return runInTxSession(async ({ session }) => {
      const opts = createWithSessionOpts(session);
      const now = new Date();
      const updatedVehicle = await VehicleModel.findOneAndUpdate(
        { _id: vehicleObjectId, organizationId: orgObjectId },
        {
          $set: {
            status: nextStatus,
            lastActionBy: userObjectId,
            lastActionAt: now,
            updatedBy: userObjectId,
          },
        },
        { ...opts, new: true, runValidators: true },
      ).lean();

      await VehicleHistoryModel.create(
        [
          {
            vehicleId: vehicleObjectId,
            organizationId: orgObjectId,
            userId: userObjectId,
            action: historyAction,
            metadata: {
              previousStatus: existing.status,
              newStatus: nextStatus,
            },
          },
        ],
        opts,
      );

      await AuditLogModel.create(
        [
          {
            organizationId: orgObjectId,
            userId: userObjectId,
            action: auditAction,
            entity: "Vehicle",
            entityId: vehicleId,
            metadata: {
              vehicleModel: existing.model,
              plate: existing.plate,
              previousStatus: existing.status,
              newStatus: nextStatus,
            },
          },
        ],
        opts,
      );

      return serializeVehicle(updatedVehicle);
    });
  }

  async getHistory(
    organizationId: string,
    vehicleId: string,
    options?: { page?: number; perPage?: number },
  ): Promise<PaginatedResponse<any>> {
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const orgObjectId = parseSafeObjectId(organizationId, "organização");
    const vehicleObjectId = parseSafeObjectId(vehicleId, "veículo");

    const vehicle = await VehicleModel.findOne({
      _id: vehicleObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!vehicle) {
      throw new NotFoundException("Veículo não encontrado");
    }

    const matchStage = {
      vehicleId: vehicleObjectId,
      organizationId: orgObjectId,
    };

    const dataPipeline: any[] = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: perPage },
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
        $project: {
          action: 1,
          metadata: 1,
          createdAt: 1,
          user: {
            username: 1,
            globalName: 1,
          },
          userId: 1,
          rawId: "$_id",
        },
      },
    ];

    const countPipeline: any[] = [
      { $match: matchStage },
      { $count: "total" },
    ];

    const [data, countResult] = await Promise.all([
      VehicleHistoryModel.aggregate(dataPipeline),
      VehicleHistoryModel.aggregate(countPipeline),
    ]);

    const normalizedData = (data ?? []).map((entry) => ({
      ...entry,
      id: toIdString(entry.rawId ?? entry._id) ?? undefined,
      userId: toIdString(entry.userId) ?? null,
      user: entry.user
        ? {
          ...entry.user,
          id: toIdString(entry.user?._id) ?? null,
        }
        : null,
      _id: undefined,
      rawId: undefined,
    }));

    const total = countResult[0]?.total ?? 0;

    return {
      data: normalizedData,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }
}
