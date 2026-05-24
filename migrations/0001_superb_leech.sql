CREATE TABLE "book_copies" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"book_id" varchar(50) NOT NULL,
	"accession_id" varchar(200) NOT NULL,
	"source_library_id" varchar(50),
	"source_library_name" varchar(300),
	"location" varchar(200),
	"condition" varchar(50) DEFAULT 'good',
	"status" varchar(30) DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "harvest_errors" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"source_library_id" varchar(50),
	"source_library_name" varchar(300),
	"isbn" varchar(30),
	"error_type" varchar(100) NOT NULL,
	"error_message" text NOT NULL,
	"raw_payload" text,
	"resolved_at" timestamp,
	"resolved_by" varchar(200),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_incoming" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"incoming_number" varchar(50) NOT NULL,
	"date" varchar(20) NOT NULL,
	"prepared_by" varchar(50),
	"reference_number" varchar(100),
	"purpose" varchar(100),
	"supplier" varchar(200),
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_outgoing" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"outgoing_number" varchar(50) NOT NULL,
	"date" varchar(20) NOT NULL,
	"prepared_by" varchar(50),
	"reference_number" varchar(100),
	"purpose" varchar(100),
	"supplier" varchar(200),
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_sources" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(300) NOT NULL,
	"url" varchar(1000) NOT NULL,
	"protocol" varchar(20) DEFAULT 'oai-pmh' NOT NULL,
	"auth_token" varchar(500),
	"metadata_prefix" varchar(50) DEFAULT 'oai_dc',
	"set_spec" varchar(200),
	"institution" varchar(300),
	"region" varchar(100),
	"last_harvested_at" timestamp,
	"last_harvest_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "att_date_idx";--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "tap_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "student_id" varchar(50);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "date" varchar(20);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "time_in" varchar(10);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "time_out" varchar(10);--> statement-breakpoint
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_source_library_id_library_sources_id_fk" FOREIGN KEY ("source_library_id") REFERENCES "public"."library_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_errors" ADD CONSTRAINT "harvest_errors_source_library_id_library_sources_id_fk" FOREIGN KEY ("source_library_id") REFERENCES "public"."library_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_incoming" ADD CONSTRAINT "inventory_incoming_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_outgoing" ADD CONSTRAINT "inventory_outgoing_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bc_book_idx" ON "book_copies" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "bc_source_idx" ON "book_copies" USING btree ("source_library_id");--> statement-breakpoint
CREATE INDEX "bc_status_idx" ON "book_copies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bc_accession_idx" ON "book_copies" USING btree ("accession_id");--> statement-breakpoint
CREATE INDEX "he_source_idx" ON "harvest_errors" USING btree ("source_library_id");--> statement-breakpoint
CREATE INDEX "he_status_idx" ON "harvest_errors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "he_date_idx" ON "harvest_errors" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inv_inc_date_idx" ON "inventory_incoming" USING btree ("date");--> statement-breakpoint
CREATE INDEX "inv_inc_status_idx" ON "inventory_incoming" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inv_out_date_idx" ON "inventory_outgoing" USING btree ("date");--> statement-breakpoint
CREATE INDEX "inv_out_status_idx" ON "inventory_outgoing" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lib_src_protocol_idx" ON "library_sources" USING btree ("protocol");--> statement-breakpoint
CREATE INDEX "lib_src_status_idx" ON "library_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "att_date_idx" ON "attendance" USING btree ("created_at");