<template>
  <div data-testid="docs-document-page">
    <NuxtLink
      :to="`/docs/${folderId}`"
      class="btn btn-ghost btn-sm -ml-3 mb-2 max-w-full gap-1"
      data-testid="docs-back-to-folder"
    >
      <Icon
        name="heroicons:chevron-left"
        size="16"
        class="flex-shrink-0"
      />
      <span class="truncate">{{ details?.folder.name ?? t('docs.folder.back') }}</span>
    </NuxtLink>

    <div
      v-if="isLoading || isLeaving"
      class="flex justify-center py-8"
    >
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div
      v-else-if="!details"
      class="alert alert-error"
      data-testid="docs-folder-error"
    >
      {{ formatError(docsStore.detailsError, t('docs.folder.notFound')) }}
    </div>

    <div
      v-else-if="!document"
      class="alert"
      data-testid="docs-document-not-found"
    >
      {{ t('docs.document.notFound') }}
    </div>

    <template v-else>
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1 animate-fade-in-left">
          <input
            v-if="isEditing"
            v-model="draft.title"
            type="text"
            class="input input-bordered w-full text-lg font-bold"
            :maxlength="DOC_TITLE_MAX_LENGTH"
            :placeholder="t('docs.document.titlePlaceholder')"
            data-testid="docs-document-title-input"
          >
          <h1
            v-else
            class="text-2xl font-bold break-words"
            data-testid="docs-document-title"
          >
            {{ getDocumentTitle(document.title) }}
          </h1>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <template v-if="isEditing">
            <button
              type="button"
              class="btn btn-ghost"
              data-testid="docs-document-cancel-button"
              @click="stopEditing"
            >
              {{ t('docs.document.cancel') }}
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="isSaving || isBusy"
              data-testid="docs-document-save-button"
              @click="saveChanges"
            >
              <span
                v-if="isSaving"
                class="loading loading-spinner loading-sm"
              />
              {{ t('docs.document.save') }}
            </button>
          </template>

          <template v-else>
            <button
              type="button"
              class="btn btn-sm"
              :disabled="document.fields.length === 0"
              data-testid="docs-document-copy-all"
              @click="copyAllFields(document)"
            >
              <Icon
                name="heroicons:clipboard-document-list"
                size="16"
              />
              {{ t('docs.document.copyAll') }}
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :disabled="isBusy"
              data-testid="docs-document-edit-button"
              @click="startEditing"
            >
              <Icon
                name="heroicons:pencil-square"
                size="16"
              />
              {{ t('docs.document.edit') }}
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square hover:text-error"
              :disabled="isBusy"
              :aria-label="t('docs.document.delete')"
              :title="t('docs.document.delete')"
              data-testid="docs-document-delete-button"
              @click="handleDelete"
            >
              <Icon
                name="heroicons:trash"
                size="16"
              />
            </button>
          </template>
        </div>
      </div>

      <DocsActivityStatus
        class="mb-6"
        :document-id="documentId"
      />

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section class="min-w-0 animate-fade-in-up-delayed">
          <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
            {{ t('docs.document.photos') }}
            <span
              v-if="document.images.length > 0"
              class="badge badge-ghost"
              data-testid="docs-photo-count"
            >
              {{ document.images.length }}
            </span>
          </h2>
          <DocsPhotoGallery
            :document="document"
            :is-editing="isEditing"
            :can-add-photos="!isEditing && !isBusy && document.images.length < DOC_MAX_IMAGES"
            @add="docsModalsStore.openPhotosModal(document.id)"
          />
        </section>

        <section class="min-w-0 animate-fade-in-up-delayed-2">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-lg font-semibold">
              {{ t('docs.document.fields') }}
            </h2>
            <DocsRecognizeMenu
              v-if="!isEditing && details.isRecognitionAvailable && document.images.length > 0"
              :document="document"
            />
          </div>

          <template v-if="isEditing">
            <DocsFieldEditor
              v-model="draft.fields"
              :show-errors="hasTriedToSave"
            />
            <p
              v-if="hasTriedToSave && hasFieldWithoutName"
              class="mt-3 text-sm text-error"
              data-testid="docs-field-editor-error"
            >
              {{ t('docs.document.fieldNameRequired') }}
            </p>
          </template>

          <DocsFieldList
            v-else-if="document.fields.length > 0"
            :fields="document.fields"
          />

          <div
            v-else
            class="rounded-box border border-dashed border-base-300 p-6 text-center text-base-content/60"
            data-testid="docs-document-no-fields"
          >
            <p class="font-medium">
              {{ t('docs.document.noFields') }}
            </p>
            <p class="text-sm">
              {{ t('docs.document.noFieldsHint') }}
            </p>
          </div>
        </section>
      </div>
    </template>

    <DocsAddPhotosModal />
    <DocsPhotoViewer />
  </div>
</template>

<script setup lang="ts">
import { DOC_MAX_IMAGES, DOC_TITLE_MAX_LENGTH, docDocumentFormSchema } from '~~/shared/schemas/docs'
import type { DocDocument, DocField } from '~~/shared/types/docs'
import type { EditableDocField } from '~/types/docs'

interface Props {
  folderId: string
  documentId: string
}

interface DocumentDraft {
  title: string
  fields: EditableDocField[]
}

const props = defineProps<Props>()

const docsStore = useDocsStore()
const docsModalsStore = useDocsModalsStore()
const { confirmDocumentDeletion, copyAllFields, deleteDocument, getDocumentTitle, runAction } = useDocsActions()
const { confirmDiscardChanges } = useUnsavedChanges()
const { formatError } = useServerError()
const { t } = useI18n()

const isEditing = ref(false)
const isSaving = ref(false)
const isLeaving = ref(false)
const hasTriedToSave = ref(false)
const draft = ref<DocumentDraft>({ title: '', fields: [] })
const initialDraft = ref<DocumentDraft>({ title: '', fields: [] })

const details = computed(() => docsStore.details?.folder.id === props.folderId ? docsStore.details : null)
const document = computed(() => details.value?.documents.find(({ id }) => id === props.documentId) ?? null)
const isLoading = computed(() => !details.value && docsStore.detailsError?.folderId !== props.folderId)
const isBusy = computed(() => docsStore.isBusy(props.documentId))

const toDraft = ({ title, fields }: DocDocument): DocumentDraft => ({
  title,
  fields: fields.map(field => ({ key: crypto.randomUUID(), ...field })),
})

const toFields = (fields: readonly EditableDocField[]): DocField[] =>
  fields
    .filter(field => field.name.trim() !== '' || field.value.trim() !== '')
    .map(({ name, value }) => ({ name, value }))

const serializeDraft = ({ title, fields }: DocumentDraft): string => JSON.stringify({ title, fields: toFields(fields) })

const hasUnsavedChanges = computed(() => serializeDraft(draft.value) !== serializeDraft(initialDraft.value))

const hasFieldWithoutName = computed(() => toFields(draft.value.fields).some(field => field.name.trim() === ''))

const startEditing = (): void => {
  if (!document.value) {
    return
  }

  draft.value = toDraft(document.value)
  initialDraft.value = toDraft(document.value)
  hasTriedToSave.value = false
  isEditing.value = true
}

const confirmStopEditing = async (): Promise<boolean> => {
  if (!isEditing.value) {
    return true
  }

  const canStop = await confirmDiscardChanges(hasUnsavedChanges.value, 'stopEditing')

  if (canStop) {
    isEditing.value = false
  }

  return canStop
}

const stopEditing = async (): Promise<void> => {
  await confirmStopEditing()
}

const saveChanges = async (): Promise<void> => {
  hasTriedToSave.value = true
  const parsedDraft = docDocumentFormSchema.safeParse({ title: draft.value.title, fields: toFields(draft.value.fields) })

  if (!parsedDraft.success || isSaving.value) {
    return
  }

  isSaving.value = true

  try {
    const updated = await runAction(
      () => docsStore.updateDocument(props.documentId, parsedDraft.data),
      t('docs.errors.saveFailed'),
    )

    if (updated) {
      isEditing.value = false
    }
  }
  finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!document.value || !await confirmDocumentDeletion(document.value)) {
    return
  }

  isLeaving.value = true

  if (await deleteDocument(props.documentId)) {
    await navigateTo(`/docs/${props.folderId}`)
  }
  else {
    isLeaving.value = false
  }
}

useBackHandler(isEditing, () => {
  stopEditing()
})

onBeforeRouteLeave(confirmStopEditing)

watch(document, (currentDocument) => {
  if (!currentDocument) {
    isEditing.value = false
  }
})
</script>
