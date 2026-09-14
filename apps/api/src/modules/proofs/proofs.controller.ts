import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Body,
} from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ProofsService } from "./proofs.service";
import { Permission, ProofType } from "@criminals/shared";

@ApiTags("Proofs")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("proofs")
export class ProofsController {
  constructor(private readonly proofsService: ProofsService) {}

  @Get()
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "perPage", required: false, type: Number, example: 20 })
  @ApiQuery({
    name: "type",
    required: false,
    enum: ProofType,
    style: "form",
    explode: false,
  })
  @ApiQuery({ name: "farmId", required: false, type: String })
  @ApiQuery({ name: "uploadedBy", required: false, type: String })
  async list(
    @CurrentUser() user: { id: string; organizationId: string; permissions: Permission[] },
    @Query("page") page = 1,
    @Query("perPage") perPage = 20,
    @Query("type") type?: ProofType,
    @Query("farmId") farmId?: string,
    @Query("uploadedBy") uploadedBy?: string,
  ) {
    if (perPage > 100) perPage = 100;
    return this.proofsService.listForOrganization({
      organizationId: user.organizationId,
      page: Number(page) || 1,
      perPage: Number(perPage) || 20,
      type,
      farmId,
      uploadedBy,
    });
  }

  @Get(":id")
  async getOne(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param("id") id: string,
  ) {
    return this.proofsService.getByIdOrThrow(id, user.organizationId);
  }

  @Delete("batch")
  async deleteBatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() body: { ids: string[] },
  ) {
    if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException("Informe os IDs: { ids: string[] }");
    }
    if (body.ids.length > 500) {
      throw new BadRequestException("Limite de 500 exclusões por lote.");
    }
    return this.proofsService.deleteManyByIds(body.ids, {
      organizationId: user.organizationId,
      deletedByUserId: user.id,
    });
  }

  @Delete(":id")
  async deleteOne(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param("id") id: string,
  ) {
    const result = await this.proofsService.deleteManyByIds([id], {
      organizationId: user.organizationId,
      deletedByUserId: user.id,
    });
    if (result.deletedCount === 0) {
      throw new BadRequestException("Proof não encontrada ou já excluída.");
    }
    return result;
  }
}
