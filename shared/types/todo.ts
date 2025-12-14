export interface TodoListItem {
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

export interface CreateTodoPayload {
  content: string
  plannedDate?: string
  sharedWithUserIds?: string[]
}

export interface UpdateTodoPayload {
  content?: string
  plannedDate?: string | null
  sharedWithUserIds?: string[]
}

export interface TodoConnection {
  id: string
  username: string
}

export interface TodoData {
  items: TodoListItem[]
}
