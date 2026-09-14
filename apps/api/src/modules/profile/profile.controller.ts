import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { ProfileService } from "./profile.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { CompleteProfileInput, UserData } from "@criminals/shared";

@ApiTags("Profile")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get("status")
  getProfileStatus(@CurrentUser() user: UserData) {
    return this.profileService.getProfileStatus(
      user.id,
      user.organizationId,
    );
  }

  @Post("complete")
  completeProfile(
    @CurrentUser() user: UserData,
    @Body() body: CompleteProfileInput,
  ) {
    return this.profileService.completeProfile(
      user.id,
      user.organizationId,
      body,
    );
  }
}
