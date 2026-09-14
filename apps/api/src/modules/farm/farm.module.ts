import { Module } from "@nestjs/common";
import { FarmController } from "./farm.controller";
import { FarmService } from "./farm.service";
import { AuthModule } from "../auth/auth.module";
import { ProofsModule } from "../proofs/proofs.module";
import { DiscordUploadService } from "../../common/utils/discord-upload";

@Module({
  imports: [AuthModule, ProofsModule],
  controllers: [FarmController],
  providers: [FarmService, DiscordUploadService],
  exports: [FarmService, DiscordUploadService],
})
export class FarmModule {}
