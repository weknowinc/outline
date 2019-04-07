/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb, seed } from '../test/support';
import { Collection, Document } from '../models';
import uuid from 'uuid';

beforeEach(flushdb);
beforeEach(jest.resetAllMocks);

describe('#url', () => {
  test('should return correct url for the collection', () => {
    const collection = new Collection({ id: '1234' });
    expect(collection.url).toBe('/collections/1234');
  });
});

describe('#addDocumentToStructure', async () => {
  test('should add as last element without index', async () => {
    const { collection } = await seed();
    const id = uuid.v4();
    const newDocument = new Document({
      id,
      title: 'New end node',
      parentDocumentId: null,
    });

    await collection.addDocumentToStructure(newDocument);
    expect(collection.documentStructure.length).toBe(3);
    expect(collection.documentStructure[2].id).toBe(id);
  });

  test('should add with an index', async () => {
    const { collection } = await seed();
    const id = uuid.v4();
    const newDocument = new Document({
      id,
      title: 'New end node',
      parentDocumentId: null,
    });

    await collection.addDocumentToStructure(newDocument, 1);
    expect(collection.documentStructure.length).toBe(3);
    expect(collection.documentStructure[1].id).toBe(id);
  });

  test('should add as a child if with parent', async () => {
    const { collection, document } = await seed();
    const id = uuid.v4();
    const newDocument = new Document({
      id,
      title: 'New end node',
      parentDocumentId: document.id,
    });

    await collection.addDocumentToStructure(newDocument, 1);
    expect(collection.documentStructure.length).toBe(2);
    expect(collection.documentStructure[1].id).toBe(document.id);
    expect(collection.documentStructure[1].children.length).toBe(1);
    expect(collection.documentStructure[1].children[0].id).toBe(id);
  });

  test('should add as a child if with parent with index', async () => {
    const { collection, document } = await seed();
    const newDocument = new Document({
      id: uuid.v4(),
      title: 'node',
      parentDocumentId: document.id,
    });
    const id = uuid.v4();
    const secondDocument = new Document({
      id,
      title: 'New start node',
      parentDocumentId: document.id,
    });

    await collection.addDocumentToStructure(newDocument);
    await collection.addDocumentToStructure(secondDocument, 0);
    expect(collection.documentStructure.length).toBe(2);
    expect(collection.documentStructure[1].id).toBe(document.id);
    expect(collection.documentStructure[1].children.length).toBe(2);
    expect(collection.documentStructure[1].children[0].id).toBe(id);
  });

  describe('options: documentJson', async () => {
    test("should append supplied json over document's own", async () => {
      const { collection } = await seed();
      const id = uuid.v4();
      const newDocument = new Document({
        id: uuid.v4(),
        title: 'New end node',
        parentDocumentId: null,
      });

      await collection.addDocumentToStructure(newDocument, undefined, {
        documentJson: {
          children: [
            {
              id,
              title: 'Totally fake',
              children: [],
            },
          ],
        },
      });
      expect(collection.documentStructure[2].children.length).toBe(1);
      expect(collection.documentStructure[2].children[0].id).toBe(id);
    });
  });
});

describe('#updateDocument', () => {
  test("should update root document's data", async () => {
    const { collection, document } = await seed();

    document.title = 'Updated title';
    await document.save();

    await collection.updateDocument(document);

    expect(collection.documentStructure[1].title).toBe('Updated title');
  });

  test("should update child document's data", async () => {
    const { collection, document } = await seed();
    // Add a child for testing
    const newDocument = await Document.create({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.creatorId,
      lastModifiedById: collection.creatorId,
      createdById: collection.creatorId,
      title: 'Child document',
      text: 'content',
    });
    await collection.addDocumentToStructure(newDocument);

    newDocument.title = 'Updated title';
    await newDocument.save();

    await collection.updateDocument(newDocument);

    expect(collection.documentStructure[1].children[0].title).toBe(
      'Updated title'
    );
  });
});

describe('#moveDocument', () => {
  test('should move a document without children', async () => {
    const { collection, document } = await seed();

    expect(collection.documentStructure[1].id).toBe(document.id);
    await collection.moveDocument(document, 0);
    expect(collection.documentStructure[0].id).toBe(document.id);
  });

  test('should move a document with children', async () => {
    const { collection, document } = await seed();
    const newDocument = await Document.create({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.creatorId,
      lastModifiedById: collection.creatorId,
      createdById: collection.creatorId,
      title: 'Child document',
      text: 'content',
    });
    await collection.addDocumentToStructure(newDocument);

    await collection.moveDocument(document, 0);
    expect(collection.documentStructure[0].children[0].id).toBe(newDocument.id);
  });
});

describe('#removeDocument', () => {
  const destroyMock = jest.fn();

  test('should save if removing', async () => {
    const { collection, document } = await seed();
    jest.spyOn(collection, 'save');

    await collection.deleteDocument(document);
    expect(collection.save).toBeCalled();
  });

  test('should remove documents from root', async () => {
    const { collection, document } = await seed();

    await collection.deleteDocument(document);
    expect(collection.documentStructure.length).toBe(1);

    // Verify that the document was removed
    const collectionDocuments = await Document.findAndCountAll({
      where: {
        collectionId: collection.id,
      },
    });
    expect(collectionDocuments.count).toBe(1);
  });

  test('should remove a document with child documents', async () => {
    const { collection, document } = await seed();

    // Add a child for testing
    const newDocument = await Document.create({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.creatorId,
      lastModifiedById: collection.creatorId,
      createdById: collection.creatorId,
      title: 'Child document',
      text: 'content',
    });
    await collection.addDocumentToStructure(newDocument);
    expect(collection.documentStructure[1].children.length).toBe(1);

    // Remove the document
    await collection.deleteDocument(document);
    expect(collection.documentStructure.length).toBe(1);
    const collectionDocuments = await Document.findAndCountAll({
      where: {
        collectionId: collection.id,
      },
    });
    expect(collectionDocuments.count).toBe(1);
  });

  test('should remove a child document', async () => {
    const { collection, document } = await seed();

    // Add a child for testing
    const newDocument = await Document.create({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.creatorId,
      lastModifiedById: collection.creatorId,
      createdById: collection.creatorId,
      publishedAt: new Date(),
      title: 'Child document',
      text: 'content',
    });
    await collection.addDocumentToStructure(newDocument);
    expect(collection.documentStructure.length).toBe(2);
    expect(collection.documentStructure[1].children.length).toBe(1);

    // Remove the document
    await collection.deleteDocument(newDocument);

    expect(collection.documentStructure.length).toBe(2);
    expect(collection.documentStructure[0].children.length).toBe(0);
    expect(collection.documentStructure[1].children.length).toBe(0);

    const collectionDocuments = await Document.findAndCountAll({
      where: {
        collectionId: collection.id,
      },
    });
    expect(collectionDocuments.count).toBe(2);
  });

  describe('options: deleteDocument = false', () => {
    test('should remove documents from the structure but not destroy them from the DB', async () => {
      const { collection, document } = await seed();
      jest.spyOn(collection, 'save');

      const removedNode = await collection.removeDocumentInStructure(document);
      expect(collection.documentStructure.length).toBe(1);
      expect(destroyMock).not.toBeCalled();
      expect(collection.save).not.toBeCalled();
      expect(removedNode.id).toBe(document.id);
      expect(removedNode.children).toEqual([]);
    });
  });
});
