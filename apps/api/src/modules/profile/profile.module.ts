import { Module } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { AuthModule } from "../auth/auth.module";
import { DiscordModule } from "../discord/discord.module";

@Module({
  imports: [AuthModule, DiscordModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
