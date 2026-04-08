ALTER TABLE "keyword_mapping" ADD COLUMN "branch" varchar(255) DEFAULT 'All' NOT NULL;--> statement-breakpoint
ALTER TABLE "keyword_mapping" ADD COLUMN "offset_x" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "keyword_mapping" ADD COLUMN "offset_y" integer DEFAULT 0 NOT NULL;