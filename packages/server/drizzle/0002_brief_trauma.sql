CREATE TABLE "department_ref" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "sub_category" varchar(100);--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "department" varchar(100);--> statement-breakpoint
ALTER TABLE "keyword_mapping" ADD COLUMN "sub_category" varchar(100);--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "department" varchar(100);--> statement-breakpoint
ALTER TABLE "workflow" ADD COLUMN "sub_category" varchar(100);