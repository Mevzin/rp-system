import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { VehiclesService } from "./vehicles.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permission } from "@criminals/shared";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  UserData,
} from "@criminals/shared";

@ApiTags("Vehicles")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_GARAGE)
  findAll(@CurrentUser() user: UserData) {
    return this.vehiclesService.findAll(user.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: UserData,
    @Body() body: CreateVehicleInput,
  ) {
    return this.vehiclesService.create(
      user.organizationId,
      user.id,
      body,
    );
  }

  @Get(":id")
  @RequirePermissions(Permission.VIEW_GARAGE)
  findById(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
  ) {
    return this.vehiclesService.findById(user.organizationId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
    @Body() body: UpdateVehicleInput,
  ) {
    return this.vehiclesService.update(
      user.organizationId,
      user.id,
      id,
      body,
    );
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
  ) {
    return this.vehiclesService.remove(
      user.organizationId,
      user.id,
      id,
    );
  }

  @Post(":id/take")
  take(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
  ) {
    return this.vehiclesService.take(
      user.organizationId,
      user.id,
      id,
    );
  }

  @Post(":id/store")
  store(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
  ) {
    return this.vehiclesService.store(
      user.organizationId,
      user.id,
      id,
    );
  }

  @Post(":id/detain")
  toggleDetain(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
  ) {
    return this.vehiclesService.toggleDetain(
      user.organizationId,
      user.id,
      id,
    );
  }

  @Get(":id/history")
  @RequirePermissions(Permission.VIEW_VEHICLE_HISTORY)
  getHistory(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
  ) {
    return this.vehiclesService.getHistory(
      user.organizationId,
      id,
      {
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
      },
    );
  }
}
