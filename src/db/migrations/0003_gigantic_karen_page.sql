CREATE TABLE `budget` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`category_id` text NOT NULL,
	`period_type` text DEFAULT 'monthly' NOT NULL,
	`amount` integer NOT NULL,
	`rollover` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `budget_org_idx` ON `budget` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `budget_org_cat_period_uq` ON `budget` (`organization_id`,`category_id`,`period_type`);