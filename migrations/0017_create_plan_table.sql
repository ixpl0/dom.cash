CREATE TABLE plan (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  planned_balance_change INTEGER NOT NULL,
  CONSTRAINT uq_plan_user_year_month UNIQUE (user_id, year, month),
  CONSTRAINT ck_plan_month_range CHECK (month BETWEEN 0 AND 11)
);

CREATE INDEX idx_plan_user ON plan(user_id);

INSERT INTO plan (id, user_id, year, month, planned_balance_change)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', abs(random()) % 4 + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  lower(hex(randomblob(6))) AS id,
  user_id,
  year,
  month,
  planned_balance_change
FROM month
WHERE planned_balance_change IS NOT NULL;
ALTER TABLE month DROP COLUMN planned_balance_change;
