import { Module } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";
import { UploadsCleanupService } from "./uploads-cleanup.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService, UploadsCleanupService],
  exports: [UploadsService],
})
export class UploadsModule {}
