interface TodoModalState {
  isOpen: boolean
  editingTodoId: string | null
}

export const useTodoModalsStore = defineStore('todoModals', () => {
  const todoModal = ref<TodoModalState>({
    isOpen: false,
    editingTodoId: null,
  })

  const isNotificationsModalOpen = ref(false)

  const openTodoModal = (todoId?: string) => {
    todoModal.value = {
      isOpen: true,
      editingTodoId: todoId ?? null,
    }
  }

  const closeTodoModal = () => {
    todoModal.value = {
      isOpen: false,
      editingTodoId: null,
    }
  }

  const openNotificationsModal = () => {
    isNotificationsModalOpen.value = true
  }

  const closeNotificationsModal = () => {
    isNotificationsModalOpen.value = false
  }

  return {
    todoModal,
    isNotificationsModalOpen,
    openTodoModal,
    closeTodoModal,
    openNotificationsModal,
    closeNotificationsModal,
  }
})
