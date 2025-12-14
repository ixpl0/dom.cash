interface TodoModalState {
  isOpen: boolean
  editingTodoId: string | null
}

export const useTodoModalsStore = defineStore('todoModals', () => {
  const todoModal = ref<TodoModalState>({
    isOpen: false,
    editingTodoId: null,
  })

  const openTodoModal = (todoId?: string) => {
    todoModal.value = {
      isOpen: true,
      editingTodoId: todoId ?? null,
    }
  }

  const closeTodoModal = () => {
    todoModal.value = {
      ...todoModal.value,
      isOpen: false,
    }
  }

  return {
    todoModal,
    openTodoModal,
    closeTodoModal,
  }
})
