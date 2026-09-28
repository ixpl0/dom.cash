CREATE TABLE doc_folder (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_doc_folder_user ON doc_folder(user_id);

CREATE TABLE doc_folder_share (
  id TEXT PRIMARY KEY NOT NULL,
  folder_id TEXT NOT NULL REFERENCES doc_folder(id) ON DELETE CASCADE,
  shared_with_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  CONSTRAINT uq_doc_folder_shared_with UNIQUE (folder_id, shared_with_id)
);

CREATE INDEX idx_doc_folder_share_folder ON doc_folder_share(folder_id);
CREATE INDEX idx_doc_folder_share_user ON doc_folder_share(shared_with_id);

CREATE TABLE doc_document (
  id TEXT PRIMARY KEY NOT NULL,
  folder_id TEXT NOT NULL REFERENCES doc_folder(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  fields TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CONSTRAINT ck_doc_document_fields_is_array CHECK (fields GLOB '[[]*]')
);

CREATE INDEX idx_doc_document_folder ON doc_document(folder_id);

CREATE TABLE doc_image (
  id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT NOT NULL REFERENCES doc_document(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  stored_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL,
  CONSTRAINT ck_doc_image_sizes CHECK (size > 0 AND stored_size >= size)
);

CREATE INDEX idx_doc_image_document ON doc_image(document_id);
