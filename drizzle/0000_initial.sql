CREATE TABLE `budget_share` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`shared_with_id` text NOT NULL,
	`access` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shared_with_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_no_self_share" CHECK("budget_share"."owner_id" <> "budget_share"."shared_with_id")
);
--> statement-breakpoint
CREATE INDEX `idx_budget_share_owner` ON `budget_share` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_budget_share_shared_with` ON `budget_share` (`shared_with_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_owner_shared_with` ON `budget_share` (`owner_id`,`shared_with_id`);--> statement-breakpoint
CREATE TABLE `currency` (
	`date` text PRIMARY KEY NOT NULL,
	`rates` text NOT NULL,
	CONSTRAINT "ck_currency_date_format" CHECK("currency"."date" GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "ck_currency_rates_is_object" CHECK("currency"."rates" GLOB '{*}')
);
--> statement-breakpoint
CREATE TABLE `entry` (
	`id` text PRIMARY KEY NOT NULL,
	`month_id` text NOT NULL,
	`kind` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`date` text,
	FOREIGN KEY (`month_id`) REFERENCES `month`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_amount_nonneg" CHECK("entry"."amount" >= 0),
	CONSTRAINT "ck_entry_currency_3_upper" CHECK("entry"."currency" GLOB '[A-Z][A-Z][A-Z]')
);
--> statement-breakpoint
CREATE INDEX `idx_entry_month` ON `entry` (`month_id`);--> statement-breakpoint
CREATE INDEX `idx_entry_date` ON `entry` (`date`);--> statement-breakpoint
CREATE TABLE `month` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_month_range" CHECK("month"."month" between 0 and 11)
);
--> statement-breakpoint
CREATE INDEX `idx_month_user` ON `month` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_year_month` ON `month` (`user_id`,`year`,`month`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_session_time_order" CHECK("session"."expires_at" >= "session"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_hash_unique` ON `session` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_session_user` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_session_expires` ON `session` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`main_currency` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "ck_user_currency_3_upper" CHECK("user"."main_currency" GLOB '[A-Z][A-Z][A-Z]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);