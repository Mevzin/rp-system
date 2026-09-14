import { Module } from "@nestjs/common";
import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";
import { AuthModule } from "../auth/auth.module";
import { DiscordModule } from "../discord/discord.module";

@Module({
  imports: [AuthModule, DiscordModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
