// backend/pages/api/getBookmarks.test.ts
const handler = require('./getBookmarks');
const { createMocks } = require('node-mocks-http');


describe('GET /api/getBookmarks', () => {
  it('should return 400 if userId is not provided', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'Invalid userId' });
  });

  it('should return 200 and bookmarks if userId is valid', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        userId: 'validUserId',
      },
    });

    // Mock the Prisma client
    jest.mock('@prisma/client', () => {
      return {
        PrismaClient: jest.fn().mockImplementation(() => {
          return {
            bookmark: {
              findMany: jest.fn().mockResolvedValue([
                { id: 1, userId: 'validUserId', title: 'Bookmark 1' },
              ]),
            },
          };
        }),
      };
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual([
      { id: 1, userId: 'validUserId', title: 'Bookmark 1' },
    ]);
  });

  it('should return 500 if there is a server error', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        userId: 'validUserId',
      },
    });

    // Mock the Prisma client to throw an error
    jest.mock('@prisma/client', () => {
      return {
        PrismaClient: jest.fn().mockImplementation(() => {
          return {
            bookmark: {
              findMany: jest.fn().mockRejectedValue(new Error('Server error')),
            },
          };
        }),
      };
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Failed to fetch bookmarks' });
  });
});

