CREATE TABLE `attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attachment_org_idx` ON `attachment` (`organization_id`);--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`parent_id` text,
	`icon` text,
	`color` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `category_org_idx` ON `category` (`organization_id`);--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `category` (`parent_id`);--> statement-breakpoint
CREATE TABLE `financial_account` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'bank' NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`initial_balance` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `financial_account_org_idx` ON `financial_account` (`organization_id`);--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_org_name_uq` ON `tag` (`organization_id`,`name`);--> statement-breakpoint
CREATE TABLE `transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`account_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`booked_at` integer NOT NULL,
	`value_date` text NOT NULL,
	`category_id` text,
	`payee` text,
	`note` text,
	`attachment_id` text,
	`counter_account_id` text,
	`counter_amount` integer,
	`fx_rate` real,
	`recurring_rule_id` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `financial_account`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachment`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`counter_account_id`) REFERENCES `financial_account`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transaction_org_date_idx` ON `transaction` (`organization_id`,`value_date`);--> statement-breakpoint
CREATE INDEX `transaction_account_date_idx` ON `transaction` (`account_id`,`value_date`);--> statement-breakpoint
CREATE INDEX `transaction_category_idx` ON `transaction` (`category_id`);--> statement-breakpoint
CREATE TABLE `transaction_tag` (
	`transaction_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`transaction_id`, `tag_id`),
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
