import { Injectable } from "@nestjs/common";
import { OrganizationModel, mongoose } from "@criminals/database";

@Injectable()
export class OrganizationsService {
  constructor() {}

  async findById(id: string) {
    return OrganizationModel.findById(id).lean();
  }

  async findByGuildId(discordGuildId: string) {
    return OrganizationModel.findOne({ discordGuildId }).lean();
  }
}
