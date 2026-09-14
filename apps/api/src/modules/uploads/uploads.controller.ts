import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Get,
  Param,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadsService } from "./uploads.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import type { UploadProofInput } from "@criminals/shared";
import { Permission } from "@criminals/shared";

@ApiTags("Uploads")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) { }

  @Post("proof")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "proofType"],
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        proofType: {
          type: "string",
          enum: ["INVENTORY_PROOF", "BANK_PROOF"],
        },
      },
    },
  })
  async uploadProof(
    @CurrentUser() user: { id: string; organizationId: string },
    @UploadedFile() file: Express.Multer.File,
    @Query() query: UploadProofInput,
  ) {
    if (!file) {
      throw new Error("Arquivo 'file' não enviado no multipart/form-data.");
    }

    const proofType = (query as any).proofType || (file as any).proofType;
    const normalizedQuery: UploadProofInput = { proofType };

    return this.uploadsService.uploadProof(
      user.organizationId,
      user.id,
      file.buffer,
      file.mimetype,
      file.originalname,
      file.size,
      normalizedQuery,
    );
  }

  @Post("generic")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  async uploadGeneric(
    @CurrentUser() user: { id: string; organizationId: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error("Arquivo 'file' não enviado no multipart/form-data.");
    }

    return this.uploadsService.uploadGeneric(
      user.organizationId,
      user.id,
      file.buffer,
      file.mimetype,
      file.originalname,
      file.size,
    );
  }

  @Get(":storageKey/url")
  getFileUrl(@Param("storageKey") storageKey: string) {
    return this.uploadsService.getFileUrl(storageKey);
  }
}
