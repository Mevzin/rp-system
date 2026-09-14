import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { InventoryService } from "./inventory.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permission, DiscordRoleTier } from "@criminals/shared";
import type {
  CreateInventoryItemInput,
  CreateInventoryMovementInput,
} from "@criminals/shared";

@ApiTags("Inventory")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_INVENTORY)
  getItems(@CurrentUser() user: { organizationId: string }) {
    return this.inventoryService.getItems(user.organizationId);
  }

  @Post("items")
  @RequirePermissions(Permission.MANAGE_INVENTORY)
  createItem(
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
    @Body() body: CreateInventoryItemInput,
  ) {
    return this.inventoryService.createItem(
      user.organizationId,
      user.id,
      user.tier,
      body,
    );
  }

  @Post("movements")
  @RequirePermissions(Permission.MANAGE_INVENTORY)
  createMovement(
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
    @Body() body: CreateInventoryMovementInput,
  ) {
    return this.inventoryService.createMovement(
      user.organizationId,
      user.id,
      user.tier,
      body,
    );
  }

  @Get("movements")
  @RequirePermissions(Permission.VIEW_INVENTORY)
  getMovements(
    @CurrentUser() user: { organizationId: string },
    @Query("itemId") itemId?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
  ) {
    return this.inventoryService.getMovements(user.organizationId, {
      itemId,
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined,
    });
  }
}
