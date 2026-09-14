import { Injectable } from "@nestjs/common";
import { NotificationModel, mongoose } from "@criminals/database";

@Injectable()
export class NotificationsService {
  async create(
    organizationId: string,
    data: {
      userId?: string;
      channel?: string;
      type: string;
      title: string;
      content: string;
      metadata?: any;
      sentAt?: Date;
    },
  ): Promise<any> {
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const createData: any = {
      organizationId: orgObjectId,
      ...data,
    };
    if (data.userId) {
      createData.userId = new mongoose.Types.ObjectId(data.userId);
    }
    const doc = await NotificationModel.create(createData);
    return doc.toObject();
  }

  async findAll(
    organizationId: string,
    userId?: string,
    limit = 50,
  ): Promise<any> {
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const filter: any = { organizationId: orgObjectId };
    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    return NotificationModel.find(filter)
      .sort({ createdAt: "desc" })
      .limit(limit)
      .lean();
  }
}
