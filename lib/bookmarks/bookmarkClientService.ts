interface BookmarkData {
  id: string;
  title: string;
  userId: string;
  updatedAt?: Date;
  createdAt?: Date;
}

interface CreateBookmarkRequest {
  title: string;
  userId: string;
}

interface EditBookmarkRequest {
  id: string;
  title: string;
  userId: string;
}

interface DeleteBookmarkRequest {
  id: string;
  userId: string;
}

export class BookmarkClientService {
  /**
   * Creates a new bookmark
   */
  static async createBookmark(data: CreateBookmarkRequest): Promise<BookmarkData> {
    const response = await fetch('/api/createBookmark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create bookmark');
    }

    return await response.json();
  }

  /**
   * Edits an existing bookmark
   */
  static async editBookmark(data: EditBookmarkRequest): Promise<BookmarkData> {
    const response = await fetch('/api/editBookmark', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to edit bookmark');
    }

    return await response.json();
  }

  /**
   * Deletes a bookmark
   */
  static async deleteBookmark(data: DeleteBookmarkRequest): Promise<void> {
    const response = await fetch('/api/deleteBookmark', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete bookmark');
    }
  }

  /**
   * Gets all bookmarks for a user
   */
  static async getBookmarks(userId: string): Promise<BookmarkData[]> {
    const response = await fetch(`/api/getBookmarks?userId=${userId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch bookmarks');
    }

    return await response.json();
  }

  /**
   * Validates bookmark title
   */
  static validateBookmarkTitle(title: string, reservedTitles: string[]): string | null {
    if (!title.trim()) {
      return 'Bookmark title cannot be empty';
    }

    if (reservedTitles.includes(title.trim())) {
      return 'This bookmark title is reserved';
    }

    return null;
  }
} 