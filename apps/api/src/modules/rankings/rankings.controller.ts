import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { RankingsService } from "./rankings.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permission } from "@criminals/shared";

@ApiTags("Rankings")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("statistics/ranking")
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_RANKING)
  getRanking(
    @CurrentUser() user: { organizationId: string },
    @Query("period") period?: "week" | "month" | "all",
    @Query("limit") limit?: string,
  ) {
    return this.rankingsService.getRanking(
      user.organizationId,
      period ?? "month",
      limit ? Number(limit) : undefined,
    );
  }
}
