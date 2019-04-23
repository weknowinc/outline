/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '../app';
import { Document, View, Star, Revision } from '../models';
import { flushdb, seed } from '../test/support';
import {
  buildShare,
  buildCollection,
  buildUser,
  buildDocument,
} from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#documents.info', async () => {
  it('should return published document', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it('should return archived document', async () => {
    const { user, document } = await seed();
    await document.archive(user.id);
    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it('should not return published document in collection not a member of', async () => {
    const { user, document, collection } = await seed();
    collection.private = true;
    await collection.save();

    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), id: document.id },
    });

    expect(res.status).toEqual(403);
  });

  it('should return drafts', async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();

    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it('should return document from shareId without token', async () => {
    const { document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });

    const res = await server.post('/api/documents.info', {
      body: { shareId: share.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
    expect(body.data.createdBy).toEqual(undefined);
    expect(body.data.updatedBy).toEqual(undefined);
  });

  it('should not return document from revoked shareId', async () => {
    const { document, user } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await share.revoke(user.id);

    const res = await server.post('/api/documents.info', {
      body: { shareId: share.id },
    });
    expect(res.status).toEqual(400);
  });

  it('should not return document from archived shareId', async () => {
    const { document, user } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await document.archive(user.id);

    const res = await server.post('/api/documents.info', {
      body: { shareId: share.id },
    });
    expect(res.status).toEqual(400);
  });

  it('should return document from shareId with token', async () => {
    const { user, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });

    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), shareId: share.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
    expect(body.data.createdBy.id).toEqual(user.id);
    expect(body.data.updatedBy.id).toEqual(user.id);
  });

  it('should return document from shareId in collection not a member of', async () => {
    const { user, document, collection } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });

    collection.private = true;
    await collection.save();

    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), shareId: share.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it('should require authorization without token', async () => {
    const { document } = await seed();
    const res = await server.post('/api/documents.info', {
      body: { id: document.id },
    });
    expect(res.status).toEqual(403);
  });

  it('should require authorization with incorrect token', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });

  it('should require a valid shareId', async () => {
    const res = await server.post('/api/documents.info', {
      body: { shareId: 123 },
    });
    expect(res.status).toEqual(400);
  });
});

describe('#documents.list', async () => {
  it('should return documents', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].id).toEqual(document.id);
  });

  it('should not return unpublished documents', async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();

    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it('should not return documents in private collections not a member of', async () => {
    const { user, collection } = await seed();
    collection.private = true;
    await collection.save();

    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should allow changing sort direction', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken(), direction: 'ASC' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data[1].id).toEqual(document.id);
  });

  it('should allow filtering by collection', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.list', {
      body: {
        token: user.getJwtToken(),
        collection: document.collectionId,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#documents.drafts', async () => {
  it('should return unpublished documents', async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();

    const res = await server.post('/api/documents.drafts', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it('should not return documents in private collections not a member of', async () => {
    const { user, document, collection } = await seed();
    document.publishedAt = null;
    await document.save();

    collection.private = true;
    await collection.save();

    const res = await server.post('/api/documents.drafts', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });
});

describe('#documents.revision', async () => {
  it("should return a document's revisions", async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.revisions', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).not.toEqual(document.id);
    expect(body.data[0].title).toEqual(document.title);
  });

  it('should not return revisions for document in collection not a member of', async () => {
    const { user, document, collection } = await seed();
    collection.private = true;
    await collection.save();

    const res = await server.post('/api/documents.revisions', {
      body: { token: user.getJwtToken(), id: document.id },
    });

    expect(res.status).toEqual(403);
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.revisions', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.search', async () => {
  it('should return results', async () => {
    const { user } = await seed();
    const res = await server.post('/api/documents.search', {
      body: { token: user.getJwtToken(), query: 'much' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.text).toEqual('# Much guidance');
  });

  it('should return results in ranked order', async () => {
    const { user } = await seed();
    const firstResult = await buildDocument({
      title: 'search term',
      text: 'random text',
      userId: user.id,
      teamId: user.teamId,
    });
    const secondResult = await buildDocument({
      title: 'random text',
      text: 'search term',
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post('/api/documents.search', {
      body: { token: user.getJwtToken(), query: 'search term' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].document.id).toEqual(firstResult.id);
    expect(body.data[1].document.id).toEqual(secondResult.id);
  });

  it('should return partial results in ranked order', async () => {
    const { user } = await seed();
    const firstResult = await buildDocument({
      title: 'search term',
      text: 'random text',
      userId: user.id,
      teamId: user.teamId,
    });
    const secondResult = await buildDocument({
      title: 'random text',
      text: 'search term',
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post('/api/documents.search', {
      body: { token: user.getJwtToken(), query: 'sear &' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].document.id).toEqual(firstResult.id);
    expect(body.data[1].document.id).toEqual(secondResult.id);
  });

  it('should strip junk from search term', async () => {
    const { user } = await seed();
    const firstResult = await buildDocument({
      title: 'search term',
      text: 'this is some random text of the document body',
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post('/api/documents.search', {
      body: { token: user.getJwtToken(), query: 'rando &\\;:()' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(firstResult.id);
  });

  it('should return draft documents created by user', async () => {
    const { user } = await seed();
    const document = await buildDocument({
      title: 'search term',
      text: 'search term',
      publishedAt: null,
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post('/api/documents.search', {
      body: { token: user.getJwtToken(), query: 'search term' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(document.id);
  });

  it('should not return draft documents created by other users', async () => {
    const { user } = await seed();
    await buildDocument({
      title: 'search term',
      text: 'search term',
      publishedAt: null,
      teamId: user.teamId,
    });
    const res = await server.post('/api/documents.search', {
      body: { token: user.getJwtToken(), query: 'search term' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should not return archived documents', async () => {
    const { user } = await seed();
    const document = await buildDocument({
      title: 'search term',
      text: 'search term',
      teamId: user.teamId,
    });
    await document.archive(user.id);

    const res = await server.post('/api/documents.search', {
      body: { token: user.getJwtToken(), query: 'search term' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should return archived documents if chosen', async () => {
    const { user } = await seed();
    const document = await buildDocument({
      title: 'search term',
      text: 'search term',
      teamId: user.teamId,
    });
    await document.archive(user.id);

    const res = await server.post('/api/documents.search', {
      body: {
        token: user.getJwtToken(),
        query: 'search term',
        includeArchived: 'true',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(document.id);
  });

  it('should return documents for a specific user', async () => {
    const { user } = await seed();

    const document = await buildDocument({
      title: 'search term',
      text: 'search term',
      teamId: user.teamId,
      userId: user.id,
    });

    // This one will be filtered out
    await buildDocument({
      title: 'search term',
      text: 'search term',
      teamId: user.teamId,
    });

    const res = await server.post('/api/documents.search', {
      body: {
        token: user.getJwtToken(),
        query: 'search term',
        userId: user.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(document.id);
  });

  it('should return documents for a specific collection', async () => {
    const { user } = await seed();
    const collection = await buildCollection();

    const document = await buildDocument({
      title: 'search term',
      text: 'search term',
      teamId: user.teamId,
    });

    // This one will be filtered out
    await buildDocument({
      title: 'search term',
      text: 'search term',
      teamId: user.teamId,
      collectionId: collection.id,
    });

    const res = await server.post('/api/documents.search', {
      body: {
        token: user.getJwtToken(),
        query: 'search term',
        collectionId: document.collectionId,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].document.id).toEqual(document.id);
  });

  it('should not return documents in private collections not a member of', async () => {
    const { user } = await seed();
    const collection = await buildCollection({ private: true });

    await buildDocument({
      title: 'search term',
      text: 'search term',
      publishedAt: null,
      teamId: user.teamId,
      collectionId: collection.id,
    });
    const res = await server.post('/api/documents.search', {
      body: { token: user.getJwtToken(), query: 'search term' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should not allow unknown dateFilter values', async () => {
    const { user } = await seed();

    const res = await server.post('/api/documents.search', {
      body: {
        token: user.getJwtToken(),
        query: 'search term',
        dateFilter: 'DROP TABLE students;',
      },
    });

    expect(res.status).toEqual(400);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.search');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#documents.archived', async () => {
  it('should return archived documents', async () => {
    const { user } = await seed();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await document.archive(user.id);

    const res = await server.post('/api/documents.archived', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it('should not return deleted documents', async () => {
    const { user } = await seed();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await document.delete();

    const res = await server.post('/api/documents.archived', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should not return documents in private collections not a member of', async () => {
    const { user } = await seed();
    const collection = await buildCollection({ private: true });

    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
    });
    await document.archive(user.id);

    const res = await server.post('/api/documents.archived', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.archived');
    expect(res.status).toEqual(401);
  });
});

describe('#documents.viewed', async () => {
  it('should return empty result if no views', async () => {
    const { user } = await seed();
    const res = await server.post('/api/documents.viewed', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should return recently viewed documents', async () => {
    const { user, document } = await seed();
    await View.increment({ documentId: document.id, userId: user.id });

    const res = await server.post('/api/documents.viewed', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(document.id);
  });

  it('should not return recently viewed but deleted documents', async () => {
    const { user, document } = await seed();
    await View.increment({ documentId: document.id, userId: user.id });
    await document.destroy();

    const res = await server.post('/api/documents.viewed', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should not return recently viewed documents in collection not a member of', async () => {
    const { user, document, collection } = await seed();
    await View.increment({ documentId: document.id, userId: user.id });
    collection.private = true;
    await collection.save();

    const res = await server.post('/api/documents.viewed', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.viewed');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#documents.starred', async () => {
  it('should return empty result if no stars', async () => {
    const { user } = await seed();
    const res = await server.post('/api/documents.starred', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should return starred documents', async () => {
    const { user, document } = await seed();
    await Star.create({ documentId: document.id, userId: user.id });

    const res = await server.post('/api/documents.starred', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(document.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.starred');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#documents.pin', async () => {
  it('should pin the document', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.pin', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();
    expect(body.data.pinned).toEqual(true);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.pin');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.pin', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.restore', () => {
  it('should allow restore of archived documents', async () => {
    const { user, document } = await seed();
    await document.archive(user.id);

    const res = await server.post('/api/documents.restore', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();
    expect(body.data.archivedAt).toEqual(null);
  });

  it('should restore archived when previous parent is archived', async () => {
    const { user, document } = await seed();
    const childDocument = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: document.collectionId,
      parentDocumentId: document.id,
    });
    await childDocument.archive(user.id);
    await document.archive(user.id);

    const res = await server.post('/api/documents.restore', {
      body: { token: user.getJwtToken(), id: childDocument.id },
    });
    const body = await res.json();
    expect(body.data.parentDocumentId).toEqual(undefined);
    expect(body.data.archivedAt).toEqual(null);
  });

  it('should restore the document to a previous version', async () => {
    const { user, document } = await seed();
    const revision = await Revision.findOne({
      where: { documentId: document.id },
    });
    const previousText = revision.text;
    const revisionId = revision.id;

    // update the document contents
    document.text = 'UPDATED';
    await document.save();

    const res = await server.post('/api/documents.restore', {
      body: { token: user.getJwtToken(), id: document.id, revisionId },
    });
    const body = await res.json();
    expect(body.data.text).toEqual(previousText);
  });

  it('should not allow restoring a revision in another document', async () => {
    const { user, document } = await seed();
    const anotherDoc = await buildDocument();
    const revision = await Revision.findOne({
      where: { documentId: anotherDoc.id },
    });
    const revisionId = revision.id;

    const res = await server.post('/api/documents.restore', {
      body: { token: user.getJwtToken(), id: document.id, revisionId },
    });
    expect(res.status).toEqual(403);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.restore');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const revision = await Revision.findOne({
      where: { documentId: document.id },
    });
    const revisionId = revision.id;

    const user = await buildUser();
    const res = await server.post('/api/documents.restore', {
      body: { token: user.getJwtToken(), id: document.id, revisionId },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.unpin', async () => {
  it('should unpin the document', async () => {
    const { user, document } = await seed();
    document.pinnedBy = user;
    await document.save();

    const res = await server.post('/api/documents.unpin', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();
    expect(body.data.pinned).toEqual(false);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.unpin');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.unpin', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.star', async () => {
  it('should star the document', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.star', {
      body: { token: user.getJwtToken(), id: document.id },
    });

    const stars = await Star.findAll();
    expect(res.status).toEqual(200);
    expect(stars.length).toEqual(1);
    expect(stars[0].documentId).toEqual(document.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.star');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.star', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.unstar', async () => {
  it('should unstar the document', async () => {
    const { user, document } = await seed();
    await Star.create({ documentId: document.id, userId: user.id });

    const res = await server.post('/api/documents.unstar', {
      body: { token: user.getJwtToken(), id: document.id },
    });

    const stars = await Star.findAll();
    expect(res.status).toEqual(200);
    expect(stars.length).toEqual(0);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.star');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.unstar', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.create', async () => {
  it('should create as a new document', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        title: 'new document',
        text: 'hello',
        publish: true,
      },
    });
    const body = await res.json();
    const newDocument = await Document.findById(body.data.id);
    expect(res.status).toEqual(200);
    expect(newDocument.parentDocumentId).toBe(null);
    expect(newDocument.collection.id).toBe(collection.id);
  });

  it('should fallback to a default title', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        title: ' ',
        text: ' ',
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Untitled document');
    expect(body.data.text).toBe('# Untitled document');
  });

  it('should not allow very long titles', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        title:
          'This is a really long title that is not acceptable to Outline because it is so ridiculously long that we need to have a limit somewhere',
        text: ' ',
      },
    });
    expect(res.status).toEqual(400);
  });

  it('should create as a child and add to collection if published', async () => {
    const { user, document, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        parentDocumentId: document.id,
        title: 'new document',
        text: 'hello',
        publish: true,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('new document');
  });

  it('should error with invalid parentDocument', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        parentDocumentId: 'd7a4eb73-fac1-4028-af45-d7e34d54db8e',
        title: 'new document',
        text: 'hello',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it('should create as a child and not add to collection', async () => {
    const { user, document, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        parentDocumentId: document.id,
        title: 'new document',
        text: 'hello',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('new document');
  });
});

describe('#documents.update', async () => {
  it('should update document details in the root', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: 'Updated title',
        text: 'Updated text',
        lastRevision: document.revision,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Updated title');
    expect(body.data.text).toBe('Updated text');
  });

  it('should not edit archived document', async () => {
    const { user, document } = await seed();
    await document.archive();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: 'Updated title',
        text: 'Updated text',
        lastRevision: document.revision,
      },
    });
    expect(res.status).toEqual(403);
  });

  it('should not create new version when autosave=true', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: 'Updated title',
        text: 'Updated text',
        lastRevision: document.revision,
        autosave: true,
      },
    });

    const prevRevisionRecords = await Revision.count();
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Updated title');
    expect(body.data.text).toBe('Updated text');

    const revisionRecords = await Revision.count();
    expect(revisionRecords).toBe(prevRevisionRecords);
  });

  it('should fallback to a default title', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: ' ',
        text: ' ',
        lastRevision: document.revision,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Untitled document');
    expect(body.data.text).toBe('# Untitled document');
  });

  it('should fail if document lastRevision does not match', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        text: 'Updated text',
        lastRevision: 123,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  it('should update document details for children', async () => {
    const { user, document, collection } = await seed();
    collection.documentStructure = [
      {
        id: 'af1da94b-9591-4bab-897c-11774b804b77',
        url: '/d/some-beef-RSZwQDsfpc',
        title: 'some beef',
        children: [
          {
            id: 'ab1da94b-9591-4bab-897c-11774b804b66',
            url: '/d/another-doc-RSZwQDsfpc',
            title: 'Another doc',
            children: [],
          },
          { ...document.toJSON(), children: [] },
        ],
      },
    ];
    await collection.save();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: 'Updated title',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Updated title');
  });

  it('should require authentication', async () => {
    const { document } = await seed();
    const res = await server.post('/api/documents.update', {
      body: { id: document.id, text: 'Updated' },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.update', {
      body: { token: user.getJwtToken(), id: document.id, text: 'Updated' },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.archive', async () => {
  it('should allow archiving document', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.archive', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.updatedBy.id).toEqual(user.id);
    expect(body.data.archivedAt).toBeTruthy();
  });

  it('should require authentication', async () => {
    const { document } = await seed();
    const res = await server.post('/api/documents.archive', {
      body: { id: document.id },
    });
    expect(res.status).toEqual(401);
  });
});

describe('#documents.delete', async () => {
  it('should allow deleting document', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.delete', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it('should allow deleting document without collection', async () => {
    const { user, document, collection } = await seed();

    // delete collection without hooks to trigger document deletion
    await collection.destroy({ hooks: false });
    const res = await server.post('/api/documents.delete', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it('should require authentication', async () => {
    const { document } = await seed();
    const res = await server.post('/api/documents.delete', {
      body: { id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});
