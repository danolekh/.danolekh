CREATE TABLE `books` (
	`id` integer PRIMARY KEY,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`cover_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `books_title_author_unique` UNIQUE(`title`,`author`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`book_id` integer NOT NULL,
	`reference_text` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_notes_book_id_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`book_id` integer NOT NULL,
	`rating` real,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_reviews_book_id_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`)
);
