CREATE TABLE IF NOT EXISTS `articles` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `content` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `categories` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `description` text DEFAULT '',
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `article_categories` (
  `article_id` text NOT NULL,
  `category_id` text NOT NULL,
  PRIMARY KEY (`article_id`, `category_id`),
  FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
);
