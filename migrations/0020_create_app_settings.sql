CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY NOT NULL,
  registration_open INTEGER NOT NULL DEFAULT 1,
  registration_open_until INTEGER,
  CONSTRAINT ck_app_settings_single_row CHECK (id = 1)
);
