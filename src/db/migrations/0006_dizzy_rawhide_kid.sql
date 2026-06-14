CREATE TABLE `expense_split` (
	`id` text PRIMARY KEY NOT NULL,
	`shared_expense_id` text NOT NULL,
	`user_id` text NOT NULL,
	`share_kind` text NOT NULL,
	`share_value` integer NOT NULL,
	`computed_amount` integer NOT NULL,
	FOREIGN KEY (`shared_expense_id`) REFERENCES `shared_expense`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `expense_split_expense_idx` ON `expense_split` (`shared_expense_id`);--> statement-breakpoint
CREATE TABLE `settlement` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`from_user` text NOT NULL,
	`to_user` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_user`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_user`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `settlement_org_idx` ON `settlement` (`organization_id`);--> statement-breakpoint
CREATE TABLE `shared_expense` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`description` text NOT NULL,
	`total_amount` integer NOT NULL,
	`paid_by` text NOT NULL,
	`date` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paid_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `shared_expense_org_idx` ON `shared_expense` (`organization_id`);