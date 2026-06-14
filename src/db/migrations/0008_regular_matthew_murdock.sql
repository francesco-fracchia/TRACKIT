CREATE TABLE `monthly_review` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`period` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`snapshot` text,
	`notes` text,
	`created_by` text,
	`closed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_review_org_period_uq` ON `monthly_review` (`organization_id`,`period`);--> statement-breakpoint
CREATE TABLE `review_action_item` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`text` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`assignee` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `monthly_review`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `review_action_item_review_idx` ON `review_action_item` (`review_id`);