CREATE TABLE `article_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` integer NOT NULL,
	`revision_number` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`body_md` text NOT NULL,
	`editor_name` text NOT NULL,
	`change_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_revisions_unique` ON `article_revisions` (`article_id`,`revision_number`);--> statement-breakpoint
CREATE INDEX `article_revisions_article_idx` ON `article_revisions` (`article_id`,`revision_number`);--> statement-breakpoint
CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text,
	`body_md` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','published','archived')),
	`category_id` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`published_at` integer,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `articles_status_updated_idx` ON `articles` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `articles_category_idx` ON `articles` (`category_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_nocase_unique` ON `categories` (lower("name"));