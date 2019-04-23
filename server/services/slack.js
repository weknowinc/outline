// @flow
import type { Event } from '../events';
import { Document, Integration, Collection, Team } from '../models';
import { presentSlackAttachment } from '../presenters';

export default class Slack {
  async on(event: Event) {
    switch (event.name) {
      case 'documents.publish':
      case 'documents.update':
        return this.documentUpdated(event);
      case 'integrations.create':
        return this.integrationCreated(event);
      default:
    }
  }

  async integrationCreated(event: Event) {
    const integration = await Integration.findOne({
      where: {
        id: event.modelId,
        service: 'slack',
        type: 'post',
      },
      include: [
        {
          model: Collection,
          required: true,
          as: 'collection',
        },
      ],
    });
    if (!integration) return;

    const collection = integration.collection;
    if (!collection) return;

    await fetch(integration.settings.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `👋 Hey there! When documents are published or updated in the *${
          collection.name
        }* collection on Outline they will be posted to this channel!`,
        attachments: [
          {
            color: collection.color,
            title: collection.name,
            title_link: `${process.env.URL}${collection.url}`,
            text: collection.description,
          },
        ],
      }),
    });
  }

  async documentUpdated(event: Event) {
    // lets not send a notification on every autosave update
    if (event.autosave) return;

    const document = await Document.findById(event.modelId);
    if (!document) return;

    // never send information on draft documents
    if (!document.publishedAt) return;

    const integration = await Integration.findOne({
      where: {
        teamId: document.teamId,
        collectionId: document.collectionId,
        service: 'slack',
        type: 'post',
      },
    });
    if (!integration) return;

    const team = await Team.findById(document.teamId);

    let text = `${document.createdBy.name} published a new document`;

    if (event.name === 'documents.update') {
      text = `${document.updatedBy.name} updated a document`;
    }

    await fetch(integration.settings.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        attachments: [presentSlackAttachment(document, team)],
      }),
    });
  }
}
