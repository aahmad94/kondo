/**
 * @jest-environment node
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

jest.mock('../../../lib/database/prisma', () => ({
  __esModule: true,
  default: {
    language: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    bookmark: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    seedResponse: {
      findMany: jest.fn(),
    },
    gPTResponse: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    communityImport: {
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
  },
}))

import prisma from '../../../lib/database/prisma'
import { ensureDefaultDecksAndSeeds } from '../../../lib/bookmarks/seedProvisionService'
import { canonicalDefaultTitle } from '../../../lib/bookmarks/defaultDecks'

const mockPrisma = jest.mocked(prisma)

type Deck = {
  id: string
  title: string
  userId: string
  languageId: string
  seedProvisionedAt: Date | null
  createdAt: Date
  responseIds: string[]
}

describe('canonicalDefaultTitle', () => {
  it('matches trimmed, case-insensitive default titles', () => {
    expect(canonicalDefaultTitle('travel')).toBe('travel')
    expect(canonicalDefaultTitle(' Travel ')).toBe('travel')
    expect(canonicalDefaultTitle('INTRODUCTIONS')).toBe('introductions')
    expect(canonicalDefaultTitle('daily summary')).toBe('daily summary')
  })

  it('returns null for user-created titles', () => {
    expect(canonicalDefaultTitle('food')).toBeNull()
    expect(canonicalDefaultTitle('school')).toBeNull()
  })
})

describe('ensureDefaultDecksAndSeeds', () => {
  const userId = 'user-123'
  const languageId = 'lang-ja'
  const now = new Date('2026-01-01T00:00:00.000Z')

  let decks: Deck[]
  let seedCatalog: Array<{
    id: string
    deckTitle: string
    sortOrder: number
    content: string
    responseType: string
    rank: number
    furigana: string | null
    breakdown: string | null
    mobileBreakdown: string | null
  }>
  let responses: Array<{ id: string; userId: string; seedResponseId: string | null }>

  const makeDeck = (overrides: Partial<Deck> & Pick<Deck, 'id' | 'title'>): Deck => ({
    userId,
    languageId,
    seedProvisionedAt: null,
    createdAt: now,
    responseIds: [],
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
    decks = []
    seedCatalog = [
      {
        id: 'seed-travel-1',
        deckTitle: 'travel',
        sortOrder: 0,
        content: 'hello',
        responseType: 'response',
        rank: 1,
        furigana: null,
        breakdown: null,
        mobileBreakdown: null,
      },
    ]
    responses = []

    mockPrisma.language.findUnique.mockResolvedValue({ id: languageId, code: 'ja' } as never)

    mockPrisma.bookmark.findMany.mockImplementation(async ({ where }: any) =>
      decks
        .filter((deck) => deck.userId === where.userId && deck.languageId === where.languageId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map(({ responseIds: _responseIds, ...rest }) => rest)
    )

    mockPrisma.bookmark.findUnique.mockImplementation(async ({ where }: any) => {
      const deck = decks.find((candidate) => candidate.id === where.id)
      if (!deck) return null
      return { responses: deck.responseIds.map((id) => ({ id })) }
    })

    mockPrisma.bookmark.findFirst.mockImplementation(async ({ where }: any) => {
      const deck = decks.find(
        (candidate) =>
          candidate.userId === where.userId &&
          candidate.languageId === where.languageId &&
          candidate.title === where.title
      )
      return deck ? { id: deck.id } : null
    })

    mockPrisma.bookmark.createMany.mockImplementation(async ({ data }: any) => {
      const rows = Array.isArray(data) ? data : []
      for (const row of rows) {
        decks.push(
          makeDeck({
            id: `created-${row.title}`,
            title: row.title,
            userId: row.userId,
            languageId: row.languageId,
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
          })
        )
      }
      return { count: rows.length }
    })

    mockPrisma.bookmark.create.mockImplementation(async ({ data }: any) => {
      const deck = makeDeck({
        id: `created-${data.title}`,
        title: data.title,
        userId: data.userId,
        languageId: data.languageId,
      })
      decks.push(deck)
      return deck
    })

    mockPrisma.bookmark.update.mockImplementation(async ({ where, data }: any) => {
      const deck = decks.find((candidate) => candidate.id === where.id)
      if (!deck) throw new Error('Record to update not found.')
      if (data.seedProvisionedAt) {
        deck.seedProvisionedAt = data.seedProvisionedAt
      }
      if (data.responses?.connect) {
        for (const connected of data.responses.connect) {
          if (!deck.responseIds.includes(connected.id)) {
            deck.responseIds.push(connected.id)
          }
        }
      }
      return deck
    })

    mockPrisma.bookmark.delete.mockImplementation(async ({ where }: any) => {
      const index = decks.findIndex((candidate) => candidate.id === where.id)
      if (index === -1) throw new Error('Record to delete does not exist.')
      const [removed] = decks.splice(index, 1)
      return removed
    })

    mockPrisma.communityImport.updateMany.mockResolvedValue({ count: 0 } as never)
    mockPrisma.communityImport.deleteMany.mockResolvedValue({ count: 0 } as never)

    mockPrisma.seedResponse.findMany.mockImplementation(async ({ where }: any) =>
      seedCatalog.filter(
        (row) =>
          (!where.deckTitle?.in || where.deckTitle.in.includes(row.deckTitle))
      )
    )

    mockPrisma.gPTResponse.createMany.mockImplementation(async ({ data }: any) => {
      const rows = Array.isArray(data) ? data : []
      for (const row of rows) {
        if (responses.some((existing) => existing.userId === row.userId && existing.seedResponseId === row.seedResponseId)) {
          continue
        }
        responses.push({
          id: `resp-${row.seedResponseId}`,
          userId: row.userId,
          seedResponseId: row.seedResponseId,
        })
      }
      return { count: rows.length }
    })

    mockPrisma.gPTResponse.findMany.mockImplementation(async ({ where }: any) =>
      responses.filter(
        (response) =>
          response.userId === where.userId &&
          (!where.seedResponseId?.in ||
            (response.seedResponseId && where.seedResponseId.in.includes(response.seedResponseId)))
      )
    )

    mockPrisma.$executeRaw.mockResolvedValue(0 as never)
  })

  it('seeds into existing empty decks instead of creating new ones with the same title', async () => {
    decks = [
      makeDeck({ id: 'old-travel', title: 'travel', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'old-counting', title: 'counting', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'old-alphabet', title: 'alphabet', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'old-verbs', title: 'verbs', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'old-introductions', title: 'introductions', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'old-summary', title: 'daily summary', createdAt: new Date('2024-01-01') }),
    ]

    await ensureDefaultDecksAndSeeds(userId, languageId)

    expect(mockPrisma.bookmark.createMany).not.toHaveBeenCalled()
    expect(mockPrisma.bookmark.create).not.toHaveBeenCalled()
    expect(mockPrisma.$executeRaw).toHaveBeenCalled()
    expect(decks.find((deck) => deck.id === 'old-travel')?.seedProvisionedAt).toBeInstanceOf(Date)
    expect(decks.filter((deck) => deck.title === 'travel')).toHaveLength(1)
  })

  it('folds a later seeded duplicate into the original empty deck', async () => {
    const seedCopyId = 'resp-seed-travel-1'
    decks = [
      makeDeck({
        id: 'old-travel',
        title: 'travel',
        createdAt: new Date('2024-01-01'),
        seedProvisionedAt: null,
      }),
      makeDeck({
        id: 'new-travel',
        title: 'travel',
        createdAt: new Date('2026-08-29'),
        seedProvisionedAt: new Date('2026-08-29'),
        responseIds: [seedCopyId],
      }),
      makeDeck({ id: 'old-counting', title: 'counting', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'old-alphabet', title: 'alphabet', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'old-verbs', title: 'verbs', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'old-introductions', title: 'introductions', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'old-summary', title: 'daily summary', createdAt: new Date('2024-01-01') }),
    ]
    responses = [{ id: seedCopyId, userId, seedResponseId: 'seed-travel-1' }]

    await ensureDefaultDecksAndSeeds(userId, languageId)

    expect(decks.find((deck) => deck.id === 'new-travel')).toBeUndefined()
    expect(decks.filter((deck) => deck.title === 'travel')).toHaveLength(1)
    const original = decks.find((deck) => deck.id === 'old-travel')
    expect(original).toBeDefined()
    expect(original?.responseIds).toContain(seedCopyId)
    expect(original?.seedProvisionedAt).toBeInstanceOf(Date)
    expect(mockPrisma.bookmark.createMany).not.toHaveBeenCalled()
  })

  it('does not merge user-created decks that share no default title', async () => {
    decks = [
      makeDeck({ id: 'food-1', title: 'food', createdAt: new Date('2024-01-01') }),
      makeDeck({ id: 'food-2', title: 'food', createdAt: new Date('2026-01-01') }),
    ]

    await ensureDefaultDecksAndSeeds(userId, languageId)

    expect(decks.filter((deck) => deck.title === 'food')).toHaveLength(2)
    expect(mockPrisma.bookmark.createMany).toHaveBeenCalled()
    const createdTitles = (mockPrisma.bookmark.createMany.mock.calls[0][0] as any).data.map(
      (row: { title: string }) => row.title
    )
    expect(createdTitles).toEqual([
      'travel',
      'counting',
      'alphabet',
      'verbs',
      'introductions',
      'daily summary',
    ])
  })

  it('is a no-op when every seedable deck is already provisioned', async () => {
    const provisioned = new Date('2026-08-29')
    decks = [
      makeDeck({ id: 'travel', title: 'travel', seedProvisionedAt: provisioned }),
      makeDeck({ id: 'counting', title: 'counting', seedProvisionedAt: provisioned }),
      makeDeck({ id: 'alphabet', title: 'alphabet', seedProvisionedAt: provisioned }),
      makeDeck({ id: 'verbs', title: 'verbs', seedProvisionedAt: provisioned }),
      makeDeck({ id: 'introductions', title: 'introductions', seedProvisionedAt: provisioned }),
      makeDeck({ id: 'summary', title: 'daily summary', seedProvisionedAt: provisioned }),
    ]

    await ensureDefaultDecksAndSeeds(userId, languageId)

    expect(mockPrisma.bookmark.createMany).not.toHaveBeenCalled()
    expect(mockPrisma.seedResponse.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.gPTResponse.createMany).not.toHaveBeenCalled()
  })

  it('creates only missing default titles for a new user', async () => {
    await ensureDefaultDecksAndSeeds(userId, languageId)

    expect(mockPrisma.bookmark.createMany).toHaveBeenCalledTimes(1)
    const createdTitles = (mockPrisma.bookmark.createMany.mock.calls[0][0] as any).data.map(
      (row: { title: string }) => row.title
    )
    expect(createdTitles).toEqual([
      'travel',
      'counting',
      'alphabet',
      'verbs',
      'introductions',
      'daily summary',
    ])
    expect(decks.find((deck) => deck.id === 'created-travel')?.seedProvisionedAt).toBeInstanceOf(Date)
  })
})
