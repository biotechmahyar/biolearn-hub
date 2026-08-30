CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ai_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"base_url" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"max_tokens_per_request" integer NOT NULL,
	"temperature" double precision NOT NULL,
	"system_prompt" text NOT NULL,
	"updated_at" bigint,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"prompt_id" uuid,
	"model_id" uuid,
	"created_at" bigint,
	"updated_at" bigint
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"base_url" text NOT NULL,
	"api_key" text NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"daily_limit" integer NOT NULL,
	"price_per_message" double precision DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"system_prompt" text,
	"max_tokens" integer NOT NULL,
	"temperature" double precision NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "ai_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "ai_token_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"daily_limit" integer NOT NULL,
	"extra_tokens" integer DEFAULT 0 NOT NULL,
	"granted_at" bigint,
	"granted_by" uuid NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"messages_sent" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"author_role" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"target_title" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "article_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"body" text NOT NULL,
	"title" text NOT NULL,
	"saved_by" uuid NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"subtitle" text,
	"category" text NOT NULL,
	"tags" jsonb,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"author_name" text NOT NULL,
	"author_id" uuid,
	"featured_image" text,
	"accent" text NOT NULL,
	"read_time" integer NOT NULL,
	"level" text,
	"status" text,
	"scheduled_at" bigint,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"seo_keywords" jsonb,
	"seo_canonical" text,
	"og_title" text,
	"og_description" text,
	"og_image" text,
	"references" jsonb,
	"created_at" bigint,
	"updated_at" bigint,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"instructor_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"student_name" text NOT NULL,
	"present" boolean NOT NULL,
	"note" text,
	"marked_at" bigint
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"expire_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"content_id" text NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"accent" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "class_enroll_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "class_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"instructor_name" text NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"description" text NOT NULL,
	"proposed_date" text NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint,
	"reviewed_by" uuid,
	"reviewed_at" bigint,
	"platform_url" text
);
--> statement-breakpoint
CREATE TABLE "class_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"instructor_name" text NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"broadcasting" boolean DEFAULT false NOT NULL,
	"broadcast_kind" text,
	"board_bg" text,
	"created_at" bigint,
	"platform_url" text,
	"scheduled_date" text
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" text NOT NULL,
	"content_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" text,
	"text" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"rejected" boolean,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"percent" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"max_uses" integer NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" bigint,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "course_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"instructor_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" text NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"instructor_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"audience" jsonb NOT NULL,
	"prerequisites" jsonb NOT NULL,
	"syllabus" jsonb NOT NULL,
	"duration_text" text NOT NULL,
	"mode" text NOT NULL,
	"price" double precision NOT NULL,
	"discount_price" double precision,
	"rating" double precision DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"students_count" integer DEFAULT 0 NOT NULL,
	"accent" text NOT NULL,
	"bundle" text NOT NULL,
	"includes" jsonb NOT NULL,
	"has_sample_video" boolean DEFAULT false NOT NULL,
	"files" jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"created_at" bigint,
	"package_prices" jsonb,
	"author_id" uuid,
	"status" text,
	"review_note" text,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "daily_quiz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"question_id" uuid NOT NULL,
	"points" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_quiz_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"question_id" uuid NOT NULL,
	"chosen_index" integer NOT NULL,
	"correct" boolean NOT NULL,
	"points" integer NOT NULL,
	"answered_at" bigint
);
--> statement-breakpoint
CREATE TABLE "dictionary_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" text NOT NULL,
	"slug" text NOT NULL,
	"full_name" text NOT NULL,
	"gram_status" text NOT NULL,
	"shape" text NOT NULL,
	"oxygen" text NOT NULL,
	"habitat" text NOT NULL,
	"diseases" jsonb NOT NULL,
	"virulence" jsonb NOT NULL,
	"diagnosis" text NOT NULL,
	"characteristics" jsonb NOT NULL,
	"exam_notes" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	CONSTRAINT "dictionary_terms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"text" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"completed_lessons" jsonb NOT NULL,
	"enrolled_at" bigint,
	"last_active_at" bigint
);
--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"percent" double precision NOT NULL,
	"topic_breakdown" jsonb NOT NULL,
	"started_at" bigint,
	"finished_at" bigint
);
--> statement-breakpoint
CREATE TABLE "exam_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"comment" text NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"question_ids" jsonb NOT NULL,
	"free" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"diagnostic" boolean DEFAULT false NOT NULL,
	"accent" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "exams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"category" text NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "group_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"mentor_name" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" text NOT NULL,
	"joined_at" bigint
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_at" bigint,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "instructor_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"amount" double precision NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"receipt_url" text,
	"paid_at" bigint,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "instructors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"bio" text NOT NULL,
	"education" jsonb NOT NULL,
	"specialties" jsonb NOT NULL,
	"accent" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	CONSTRAINT "instructors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"alt" text,
	"caption" text,
	"category" text,
	"size" double precision NOT NULL,
	"mime_type" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "mentor_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid NOT NULL,
	"mentor_name" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"meeting_day" text NOT NULL,
	"meeting_time" text NOT NULL,
	"capacity" integer NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "mentor_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"student_name" text NOT NULL,
	"topic" text NOT NULL,
	"text" text NOT NULL,
	"status" text NOT NULL,
	"answer" text,
	"answered_by_name" text,
	"answered_at" bigint,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "mentor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid NOT NULL,
	"mentor_name" text NOT NULL,
	"student_id" uuid NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"notes" text NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "offline_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"tier" text NOT NULL,
	"amount" double precision NOT NULL,
	"tracking_number" text NOT NULL,
	"receipt_storage_id" text NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" text NOT NULL,
	"ref_id" text NOT NULL,
	"title" text NOT NULL,
	"price" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subtotal" double precision NOT NULL,
	"discount_amount" double precision DEFAULT 0 NOT NULL,
	"total" double precision NOT NULL,
	"coupon_code" text,
	"status" text NOT NULL,
	"invoice_number" text NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text,
	"role" text,
	"location" text,
	"last_seen" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"price" double precision NOT NULL,
	"accent" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" bigint,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text NOT NULL,
	"topic_id" uuid NOT NULL,
	"difficulty" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text NOT NULL,
	"shown_count" integer DEFAULT 0 NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "room_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"answer" text,
	"attachment_type" text,
	"attachment_name" text,
	"attachment_storage_id" text,
	"attachment_size" integer,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"from_user" uuid NOT NULL,
	"to_user" uuid,
	"type" text NOT NULL,
	"data" text NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "site_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"html_content" text NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" bigint,
	CONSTRAINT "site_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "site_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" bigint,
	CONSTRAINT "site_texts_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "super_admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_bot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_encrypted" text NOT NULL,
	"bot_id" text,
	"bot_name" text,
	"bot_username" text,
	"webhook_url" text,
	"connected" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"start_message" text NOT NULL,
	"last_tested_at" bigint,
	"last_test_result" text,
	"commands" jsonb,
	"commands_synced_at" bigint,
	"updated_by" uuid NOT NULL,
	"updated_at" bigint,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "telegram_linking_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"created_at" bigint,
	"expires_at" bigint,
	"used_at" bigint,
	"telegram_id" bigint
);
--> statement-breakpoint
CREATE TABLE "telegram_notif_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"key" text NOT NULL,
	"sent_at" bigint,
	"success" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_notif_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mentor_replies" boolean DEFAULT true NOT NULL,
	"tasks" boolean DEFAULT true NOT NULL,
	"deadlines" boolean DEFAULT true NOT NULL,
	"meetings" boolean DEFAULT true NOT NULL,
	"group_notifs" boolean DEFAULT true NOT NULL,
	"articles" boolean DEFAULT true NOT NULL,
	"system" boolean DEFAULT true NOT NULL,
	CONSTRAINT "telegram_notif_prefs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"rating" integer NOT NULL,
	"course" text NOT NULL,
	"accent" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint,
	"updated_at" bigint,
	"messages" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"password_hash" text,
	"image" text,
	"email_verification_time" bigint,
	"is_anonymous" boolean DEFAULT false,
	"role" text,
	"secondary_role" text,
	"university" text,
	"major" text,
	"first_name" text,
	"last_name" text,
	"avatar_url" text,
	"about" text,
	"suggested_course_ids" jsonb,
	"pending_profile" jsonb,
	"telegram_id" bigint,
	"telegram_username" text,
	"telegram_first_name" text,
	"telegram_linked_at" bigint,
	"telegram_notifications_enabled" boolean DEFAULT false,
	"bank_name" text,
	"bank_account_number" text,
	"bank_card_number" text,
	"bank_sheba" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
CREATE TABLE "whiteboard_strokes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"layer" text NOT NULL,
	"tool" text NOT NULL,
	"color" text NOT NULL,
	"size" double precision NOT NULL,
	"points" jsonb NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"instructor_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"capacity" integer NOT NULL,
	"registered_count" integer DEFAULT 0 NOT NULL,
	"price" double precision NOT NULL,
	"description" text NOT NULL,
	"agenda" jsonb NOT NULL,
	"free" boolean DEFAULT false NOT NULL,
	"expert_talk" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	CONSTRAINT "workshops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "ai_config" ADD CONSTRAINT "ai_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_prompt_id_ai_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."ai_prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_prompts" ADD CONSTRAINT "ai_prompts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_token_quotas" ADD CONSTRAINT "ai_token_quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_token_quotas" ADD CONSTRAINT "ai_token_quotas_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_saved_by_users_id_fk" FOREIGN KEY ("saved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_room_id_class_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enroll_requests" ADD CONSTRAINT "class_enroll_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enroll_requests" ADD CONSTRAINT "class_enroll_requests_room_id_class_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_requests" ADD CONSTRAINT "class_requests_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_requests" ADD CONSTRAINT "class_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_rooms" ADD CONSTRAINT "class_rooms_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_resources" ADD CONSTRAINT "course_resources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_resources" ADD CONSTRAINT "course_resources_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_quiz" ADD CONSTRAINT "daily_quiz_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_quiz_answers" ADD CONSTRAINT "daily_quiz_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_quiz_answers" ADD CONSTRAINT "daily_quiz_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_reports" ADD CONSTRAINT "exam_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_reports" ADD CONSTRAINT "exam_reports_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_reports" ADD CONSTRAINT "exam_reports_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_announcements" ADD CONSTRAINT "group_announcements_group_id_mentor_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."mentor_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_announcements" ADD CONSTRAINT "group_announcements_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_mentor_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."mentor_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_payments" ADD CONSTRAINT "instructor_payments_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_groups" ADD CONSTRAINT "mentor_groups_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_questions" ADD CONSTRAINT "mentor_questions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_sessions" ADD CONSTRAINT "mentor_sessions_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_sessions" ADD CONSTRAINT "mentor_sessions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_payments" ADD CONSTRAINT "offline_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_payments" ADD CONSTRAINT "offline_payments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence" ADD CONSTRAINT "presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_categories_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_room_id_class_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_room_id_class_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_from_user_users_id_fk" FOREIGN KEY ("from_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_to_user_users_id_fk" FOREIGN KEY ("to_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_texts" ADD CONSTRAINT "site_texts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "super_admin_sessions" ADD CONSTRAINT "super_admin_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot" ADD CONSTRAINT "telegram_bot_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_linking_codes" ADD CONSTRAINT "telegram_linking_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_notif_log" ADD CONSTRAINT "telegram_notif_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_notif_prefs" ADD CONSTRAINT "telegram_notif_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whiteboard_strokes" ADD CONSTRAINT "whiteboard_strokes_room_id_class_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admins_email" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_user" ON "ai_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_prompts_category" ON "ai_prompts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_ai_token_quotas_user" ON "ai_token_quotas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_user_date" ON "ai_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ai_usage_unique" ON "ai_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_announcements_created" ON "announcements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_announcements_author" ON "announcements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_article_versions_article" ON "article_versions" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "idx_articles_slug" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_articles_status" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_articles_author" ON "articles" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_room" ON "attendance" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_student" ON "attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_rate_limits_identifier" ON "auth_rate_limits" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_bookmarks_user" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bookmarks_user_content" ON "bookmarks" USING btree ("user_id","content_type","content_id");--> statement-breakpoint
CREATE INDEX "idx_categories_slug" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_class_enroll_room" ON "class_enroll_requests" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_class_enroll_user" ON "class_enroll_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_class_enroll_status" ON "class_enroll_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_class_requests_instructor" ON "class_requests" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "idx_class_requests_status" ON "class_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_class_rooms_instructor" ON "class_rooms" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "idx_class_rooms_status" ON "class_rooms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_comments_content" ON "comments" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "idx_comments_user" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_comments_approved" ON "comments" USING btree ("approved");--> statement-breakpoint
CREATE INDEX "idx_coupons_code" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_course_resources_course" ON "course_resources" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_courses_slug" ON "courses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_courses_category" ON "courses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_courses_published" ON "courses" USING btree ("published");--> statement-breakpoint
CREATE INDEX "idx_courses_featured" ON "courses" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "idx_courses_author" ON "courses" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_daily_quiz_date" ON "daily_quiz" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_dqa_user" ON "daily_quiz_answers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_dqa_date" ON "daily_quiz_answers" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_dict_slug" ON "dictionary_terms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_dict_term" ON "dictionary_terms" USING btree ("term");--> statement-breakpoint
CREATE INDEX "idx_dm_receiver" ON "direct_messages" USING btree ("receiver_id","read");--> statement-breakpoint
CREATE INDEX "idx_dm_sender" ON "direct_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_user" ON "enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_course" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_exam_attempts_user" ON "exam_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_exam_attempts_exam" ON "exam_attempts" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "idx_exam_reports_status" ON "exam_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_exam_reports_user" ON "exam_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_exam_reports_exam" ON "exam_reports" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "idx_exams_slug" ON "exams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_flashcards_user" ON "flashcards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_group_announcements_group" ON "group_announcements" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_group_members_group" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_group_members_user" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_group_members_group_user" ON "group_members" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_inbox_user" ON "inbox_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_inbox_created" ON "inbox_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_instructor_payments_instructor" ON "instructor_payments" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "idx_instructors_slug" ON "instructors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_instructors_user_id" ON "instructors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_media_items_uploader" ON "media_items" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_mentor_groups_mentor" ON "mentor_groups" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "idx_mentor_groups_created" ON "mentor_groups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_mentor_questions_student" ON "mentor_questions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_mentor_questions_status" ON "mentor_questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_mentor_questions_created" ON "mentor_questions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_mentor_sessions_mentor" ON "mentor_sessions" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "idx_mentor_sessions_student" ON "mentor_sessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_mentor_sessions_created" ON "mentor_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_offline_payments_user" ON "offline_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_offline_payments_status" ON "offline_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_offline_payments_course" ON "offline_payments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_user" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_otp_email" ON "otp_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_presence_user" ON "presence" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_presence_last_seen" ON "presence" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX "idx_products_slug" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_questions_topic" ON "questions" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_token" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_reminders_user" ON "reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_user_kind" ON "reminders" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "idx_room_messages_room" ON "room_messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_room_messages_room_created" ON "room_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_token" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_signals_room" ON "signals" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_site_pages_slug" ON "site_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_site_texts_key" ON "site_texts" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_super_admin_sessions_user" ON "super_admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tl_linking_codes_code" ON "telegram_linking_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_tl_linking_codes_user" ON "telegram_linking_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tl_notif_log_key" ON "telegram_notif_log" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_tl_notif_log_user_type" ON "telegram_notif_log" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tl_notif_log_unique_key" ON "telegram_notif_log" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_tl_notif_prefs_user" ON "telegram_notif_prefs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_user" ON "tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_status" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_telegram_id" ON "users" USING btree ("telegram_id");--> statement-breakpoint
CREATE INDEX "idx_wb_strokes_room_layer" ON "whiteboard_strokes" USING btree ("room_id","layer");--> statement-breakpoint
CREATE INDEX "idx_wb_strokes_room_layer_created" ON "whiteboard_strokes" USING btree ("room_id","layer","created_at");--> statement-breakpoint
CREATE INDEX "idx_workshops_slug" ON "workshops" USING btree ("slug");