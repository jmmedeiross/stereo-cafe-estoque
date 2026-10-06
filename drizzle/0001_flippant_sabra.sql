CREATE TABLE `backups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`actor` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`ts` text NOT NULL,
	`business_day` text NOT NULL,
	`type` text NOT NULL,
	`actor` text NOT NULL,
	`data` text NOT NULL,
	`reverse_of` text
);
--> statement-breakpoint
CREATE INDEX `idx_ledger_day_ts` ON `ledger` (`business_day`,`ts`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ledger_reverse_of` ON `ledger` (`reverse_of`);--> statement-breakpoint
CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`digest` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `cafe_state` ADD `last_operation` text;