import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { AuditService } from "./audit.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permission, AuditAction } from "@criminals/shared";

@ApiTags("Audit")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get()
  @RequirePermissions(Permission.VIEW_LOGS)
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query("action") action?: AuditAction,
    @Query("userId") userId?: string,
    @Query("entity") entity?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
  ): Promise<any> {
    return this.auditService.findAll(user.organizationId, {
      action,
      userId,
      entity,
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined,
    });
  }
}
