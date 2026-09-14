import { Injectable } from "@nestjs/common";
import { UserModel, mongoose } from "@criminals/database";

@Injectable()
export class UsersService {
  constructor() {}

  async findAll(organizationId: string) {
    return UserModel.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .sort({ username: "asc" })
      .lean();
  }

  async findById(id: string, organizationId: string) {
    return UserModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).lean();
  }

  async findByDiscordId(discordId: string, organizationId?: string) {
    const query: any = { discordId };
    if (organizationId) {
      query.organizationId = new mongoose.Types.ObjectId(organizationId);
    }
    return UserModel.findOne(query).lean();
  }

  async update(
    id: string,
    organizationId: string,
    data: { globalName?: string | null; tier?: string; roles?: string[] },
  ) {
    return UserModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
  }
}
