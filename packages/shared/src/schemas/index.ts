import { z } from "zod";
import {
  FarmStatus,
  FarmType,
  GoalType,
  InventoryMovementType,
  ProofType,
  VehicleStatus,
  VehicleHistoryAction,
  SiteAccessStatus,
  OrganizationRank,
} from "../enums";

export const createFarmSchema = z.object({
  type: z.nativeEnum(FarmType).default(FarmType.NORMAL),
  quantity: z.number().int().nonnegative().optional().default(0),
  withdrawnAmount: z.number().int().nonnegative().optional().default(0),
  observation: z.string().max(500).optional().nullable(),
  proofs: z.array(
    z.object({
      type: z.nativeEnum(ProofType),
      storageKey: z.string().min(1),
      url: z.string().min(1),
      discordMessageId: z.string().optional(),
      discordAttachmentId: z.string().optional(),
      discordJumpUrl: z.string().optional(),
      metadata: z
        .object({
          mimeType: z.string().optional(),
          sizeBytes: z.number().int().optional(),
          width: z.number().int().optional(),
          height: z.number().int().optional(),
          filename: z.string().optional(),
        })
        .optional(),
    }),
  ).default([]),
}).superRefine((val, ctx) => {
  if (val.type === FarmType.BANK_DEPOSIT_PROOF) {
    const hasProofs = Array.isArray(val.proofs) && val.proofs.length > 0;
    if (!hasProofs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Modalidade 'Comprovante de carga' requer 1 anexo.",
        path: ["proofs"],
      });
    } else if (val.proofs.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Modalidade 'Comprovante de carga' aceita somente 1 anexo.",
        path: ["proofs"],
      });
    } else if (val.proofs[0].type !== ProofType.BANK_PROOF) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Comprovante de carga deve ser tipo BANK_PROOF.",
        path: ["proofs", 0, "type"],
      });
    }
  }
  if (val.type === FarmType.NORMAL) {
    const hasAny =
      (val.quantity ?? 0) > 0 ||
      (val.withdrawnAmount ?? 0) > 0 ||
      (Array.isArray(val.proofs) && val.proofs.length > 0);
    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Informe quantidade/valor retirado ou envie pelo menos 1 comprovante.",
        path: ["quantity"],
      });
    }
  }
});

export const reviewFarmSchema = z.object({
  rejectionReason: z.string().max(500).optional(),
});

export const createGoalSchema = z
  .object({
    type: z.nativeEnum(GoalType).default(GoalType.GLOBAL_MAIN),
    title: z.string().min(2).max(120).optional().default("Meta da organização"),
    description: z.string().max(500).optional().nullable(),
    targetAmount: z.number().int().positive(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    userId: z.string().optional().nullable(),
    replaceActive: z.boolean().optional().default(false),
  })
  .refine((v) => v.endDate.getTime() > v.startDate.getTime(), {
    message: "Data de término deve ser posterior ao início.",
    path: ["endDate"],
  });

export const updateGoalSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  targetAmount: z.number().int().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
  userId: z.string().optional().nullable(),
});

export const uploadProofSchema = z.object({
  proofType: z.nativeEnum(ProofType),
});

export const uploadProofResultSchema = z.object({
  storageKey: z.string().min(1),
  url: z.string().min(1),
  deleteHash: z.string().optional(),
  metadata: z.object({
    mimeType: z.string(),
    sizeBytes: z.number().int().positive(),
  }),
});

export const createInventoryItemSchema = z.object({
  name: z.string().min(2).max(100),
  quantity: z.number().int().nonnegative().default(0),
});

export const createInventoryMovementSchema = z.object({
  itemId: z.string().min(1),
  type: z.nativeEnum(InventoryMovementType),
  quantity: z.number().int().positive(),
  reason: z.string().max(500).optional().nullable(),
});

export const createVehicleSchema = z.object({
  model: z.string().min(2).max(80),
  plate: z.string().min(4).max(20),
  ownerName: z.string().min(2).max(120).optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.STORED),
});

export const updateVehicleSchema = z.object({
  model: z.string().min(2).max(80).optional(),
  plate: z.string().min(4).max(20).optional(),
  ownerName: z.string().min(2).max(120).optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  status: z.nativeEnum(VehicleStatus).optional(),
});

export const assignRoleSchema = z.object({
  roleId: z.string().min(1),
});

export const completeProfileSchema = z.object({
  rpId: z.string().min(1).max(64),
  displayName: z.string().min(1).max(120),
  alias: z.string().min(1).max(64),
  phone: z.string().min(8).max(32),
});

export const updateMemberSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  alias: z.string().min(1).max(64).optional(),
  phone: z.string().min(8).max(32).optional(),
  rpId: z.string().min(1).max(64).optional(),
  rank: z.nativeEnum(OrganizationRank).optional(),
  siteAccess: z.nativeEnum(SiteAccessStatus).optional(),
});

export const updateDiscordRoleConfigSchema = z.object({
  ownerRoleId: z.string().nullable().optional(),
  managerRoleId: z.string().nullable().optional(),
  supervisorRoleId: z.string().nullable().optional(),
  memberRoleId: z.string().nullable().optional(),
  leaderRoleId: z.string().nullable().optional(),
  subLeaderRoleId: z.string().nullable().optional(),
  level1RoleId: z.string().nullable().optional(),
  level2RoleId: z.string().nullable().optional(),
  level3RoleId: z.string().nullable().optional(),
  afkRoleId: z.string().nullable().optional(),
});

export type CreateFarmInput = z.infer<typeof createFarmSchema>;
export type ReviewFarmInput = z.infer<typeof reviewFarmSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type UploadProofInput = z.infer<typeof uploadProofSchema>;
export type UploadProofResult = z.infer<typeof uploadProofResultSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type CreateInventoryMovementInput = z.infer<typeof createInventoryMovementSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type UpdateDiscordRoleConfigInput = z.infer<typeof updateDiscordRoleConfigSchema>;

export { VehicleStatus, VehicleHistoryAction, SiteAccessStatus, OrganizationRank };

