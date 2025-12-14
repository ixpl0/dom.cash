-- Rename memo table to todo
ALTER TABLE memo RENAME TO todo;

-- Rename memo_share table to todo_share
ALTER TABLE memo_share RENAME TO todo_share;

-- Rename memo_id column to todo_id in todo_share table
ALTER TABLE todo_share RENAME COLUMN memo_id TO todo_id;
