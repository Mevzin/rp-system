import { Module } from "@nestjs/common";
import { ProofsController } from "./proofs.controller";
import { ProofsService } from "./proofs.service";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [UploadsModule],
  controllers: [ProofsController],
  providers: [ProofsService],
  exports: [ProofsService],
})
export class ProofsModule {}
