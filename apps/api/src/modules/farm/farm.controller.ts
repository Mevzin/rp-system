import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from "@nestjs/common";
import { FilesInterceptor, AnyFilesInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { FarmService } from "./farm.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permission, FarmStatus, DiscordRoleTier, FarmType } from "@criminals/shared";
import type { CreateFarmInput, ReviewFarmInput } from "@criminals/shared";

type CreateFarmFormBody = {
  type?: FarmType | string;
  quantity?: string | number;
  withdrawnAmount?: string | number;
  observation?: string;
};

@ApiTags("Farm")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("farm")
export class FarmController {
  constructor(private readonly farmService: FarmService) { }

  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        fileSize: 25 * 1024 * 1024,
        files: 5,
      },
    }),
  )
  @RequirePermissions(Permission.CREATE_FARM)
  create(
    @CurrentUser() user: { id: string; organizationId: string; username?: string | null; globalName?: string | null; discordId?: string | null },
    @Body() body: CreateFarmFormBody,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    return this.farmService.createFromFormData(
      user.id,
      user.organizationId,
      {
        type: body.type,
        quantity: body.quantity,
        withdrawnAmount: body.withdrawnAmount,
        observation: body.observation,
        authorInfo: {
          id: user.id,
          username: user.username ?? null,
          globalName: user.globalName ?? null,
          discordId: user.discordId ?? null,
        },
      },
      normalizedFiles,
    );
  }

  @Post("legacy")
  @RequirePermissions(Permission.CREATE_FARM)
  createLegacy(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() body: CreateFarmInput,
  ) {
    return this.farmService.create(user.id, user.organizationId, body);
  }

  @Get()
  @RequirePermissions(Permission.VIEW_OWN_FARMS)
  findAll(
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
    @Query("status") status?: FarmStatus,
    @Query("userId") userId?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
  ) {
    return this.farmService.findAll(
      user.organizationId,
      user.tier,
      user.id,
      {
        status,
        userId,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
      },
    );
  }

  @Get(":id")
  findOne(
    @Param("id") id: string,
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
  ) {
    return this.farmService.findById(
      id,
      user.organizationId,
      user.tier,
      user.id,
    );
  }

  @Post(":id/approve")
  @RequirePermissions(Permission.REVIEW_FARM)
  approve(
    @Param("id") id: string,
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
  ) {
    return this.farmService.approve(
      id,
      user.organizationId,
      user.id,
      user.tier,
    );
  }

  @Post(":id/reject")
  @RequirePermissions(Permission.REVIEW_FARM)
  reject(
    @Param("id") id: string,
    @Body() body: ReviewFarmInput,
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
  ) {
    return this.farmService.reject(
      id,
      user.organizationId,
      user.id,
      user.tier,
      body,
    );
  }
}
