export interface MemoListItem {
  id: string
  content: string
  isCompleted: boolean
  plannedDate: string | null
  createdAt: string
  updatedAt: string
  isOwner: boolean
  ownerUsername: string
  sharedWith: Array<{ id: string, username: string }>
}

export interface CreateMemoPayload {
  content: string
  plannedDate?: string
  sharedWithUserIds?: string[]
}

export interface UpdateMemoPayload {
  content?: string
  plannedDate?: string | null
  sharedWithUserIds?: string[]
}

export interface MemoConnection {
  id: string
  username: string
}

export interface MemoData {
  items: MemoListItem[]
}
