CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`person_id` text NOT NULL,
	`duty_type_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`date` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`duty_type_id`) REFERENCES `duty_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`date`) REFERENCES `calendar_days`(`date`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `calendar_days` (
	`date` text PRIMARY KEY NOT NULL,
	`day_type` text NOT NULL,
	`label` text
);
--> statement-breakpoint
CREATE TABLE `duty_type_ranks` (
	`duty_type_id` text NOT NULL,
	`rank_id` text NOT NULL,
	PRIMARY KEY(`duty_type_id`, `rank_id`),
	FOREIGN KEY (`duty_type_id`) REFERENCES `duty_types`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rank_id`) REFERENCES `ranks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `duty_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`default_per_day` integer DEFAULT 1 NOT NULL,
	`color` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`rank_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`service_start_date` text,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`rank_id`) REFERENCES `ranks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ranks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`settings` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `unavailabilities` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`person_id` text NOT NULL,
	`date` text NOT NULL,
	`reason` text,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_home` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
