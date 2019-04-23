// @flow
import { Op } from '../sequelize';
import type { Event } from '../events';
import { Document, Collection, User, NotificationSetting } from '../models';
import mailer from '../mailer';

export default class Notifications {
  async on(event: Event) {
    switch (event.name) {
      case 'documents.publish':
      case 'documents.update':
        return this.documentUpdated(event);
      case 'collections.create':
        return this.collectionCreated(event);
      default:
    }
  }

  async documentUpdated(event: Event) {
    // lets not send a notification on every autosave update
    if (event.autosave) return;

    const document = await Document.findById(event.modelId);
    if (!document) return;

    const { collection } = document;
    if (!collection) return;

    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
          // $FlowFixMe
          [Op.ne]: document.lastModifiedById,
        },
        teamId: document.teamId,
        event: event.name,
      },
      include: [
        {
          model: User,
          required: true,
          as: 'user',
        },
      ],
    });

    const eventName =
      event.name === 'documents.publish' ? 'published' : 'updated';

    notificationSettings.forEach(setting => {
      // For document updates we only want to send notifications if
      // the document creator matches the notification setting.
      // This could be replaced with ability to "follow" in the future
      if (
        event.name === 'documents.update' &&
        document.createdById !== setting.userId
      ) {
        return;
      }

      mailer.documentNotification({
        to: setting.user.email,
        eventName,
        document,
        collection,
        actor: document.updatedBy,
        unsubscribeUrl: setting.unsubscribeUrl,
      });
    });
  }

  async collectionCreated(event: Event) {
    const collection = await Collection.findById(event.modelId, {
      include: [
        {
          model: User,
          required: true,
          as: 'user',
        },
      ],
    });
    if (!collection) return;
    if (collection.private) return;

    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
          // $FlowFixMe
          [Op.ne]: collection.createdById,
        },
        teamId: collection.teamId,
        event: event.name,
      },
      include: [
        {
          model: User,
          required: true,
          as: 'user',
        },
      ],
    });

    notificationSettings.forEach(setting =>
      mailer.collectionNotification({
        to: setting.user.email,
        eventName: 'created',
        collection,
        actor: collection.user,
        unsubscribeUrl: setting.unsubscribeUrl,
      })
    );
  }
}
