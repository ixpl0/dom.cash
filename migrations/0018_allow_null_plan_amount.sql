CREATE TABLE plan_new (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  planned_balance_change INTEGER,
  CONSTRAINT uq_plan_user_year_month UNIQUE (user_id, year, month),
  CONSTRAINT ck_plan_month_range CHECK (month BETWEEN 0 AND 11)
);

INSERT INTO plan_new (id, user_id, year, month, planned_balance_change)
SELECT id, user_id, year, month, planned_balance_change FROM plan;

DROP TABLE plan;

ALTER TABLE plan_new RENAME TO plan;

CREATE INDEX idx_plan_user ON plan(user_id);
