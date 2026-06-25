


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_name" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "event_date" "date",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nearby_events"("center_lat" double precision, "center_lng" double precision, "radius_meters" double precision) RETURNS SETOF "public"."events"
    LANGUAGE "sql"
    AS $$
  select *
  from events
  where ST_DWithin(
    geography(ST_MakePoint(lng, lat)),
    geography(ST_MakePoint(center_lng, center_lat)),
    radius_meters
  )
  order by event_date asc;
$$;


ALTER FUNCTION "public"."nearby_events"("center_lat" double precision, "center_lng" double precision, "radius_meters" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_new_issue"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into notifications (user_id, issue_id, message)
  select p.id::text, NEW.id, 'New ' || NEW.category || ' issue reported nearby'
  from profiles p
  where p.is_authority = true;

  insert into notifications (user_id, issue_id, message)
  select a.device_id, NEW.id, 'New ' || NEW.category || ' issue reported in your area'
  from area_subscriptions a
  where ST_DWithin(
    geography(ST_MakePoint(NEW.lng, NEW.lat)),
    geography(ST_MakePoint(a.lng, a.lat)),
    a.radius_meters
  )
  and a.device_id is distinct from NEW.reporter_device_id;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."notify_on_new_issue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."area_subscriptions" (
    "device_id" "text" NOT NULL,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "radius_meters" double precision NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."area_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "issue_id" "uuid",
    "user_id" "uuid",
    "text" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "category" "text" NOT NULL,
    "description" "text",
    "photo_url" "text",
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "status" "text" DEFAULT 'Open'::"text",
    "is_anonymous" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "reporter_device_id" "text",
    "village" "text",
    "district" "text",
    "state" "text"
);


ALTER TABLE "public"."issues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text",
    "issue_id" "uuid",
    "message" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "is_authority" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "department" "text",
    "village" "text",
    "phone" "text",
    "home_lat" double precision,
    "home_lng" double precision
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "contact" "text",
    "rating" numeric DEFAULT 0,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL
);


ALTER TABLE "public"."service_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "issue_id" "uuid",
    "changed_by" "uuid",
    "authority_name" "text",
    "department" "text",
    "new_status" "text" NOT NULL,
    "changed_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."status_history" OWNER TO "postgres";


ALTER TABLE ONLY "public"."area_subscriptions"
    ADD CONSTRAINT "area_subscriptions_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_providers"
    ADD CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."status_history"
    ADD CONSTRAINT "status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."status_history"
    ADD CONSTRAINT "status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



CREATE POLICY "Allow authenticated insert on status_history" ON "public"."status_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow public insert on comments" ON "public"."comments" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert on events" ON "public"."events" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert on notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert on service_providers" ON "public"."service_providers" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read on area_subscriptions" ON "public"."area_subscriptions" FOR SELECT USING (true);



CREATE POLICY "Allow public read on comments" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Allow public read on events" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "Allow public read on notifications" ON "public"."notifications" FOR SELECT USING (true);



CREATE POLICY "Allow public read on profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow public read on service_providers" ON "public"."service_providers" FOR SELECT USING (true);



CREATE POLICY "Allow public read on status_history" ON "public"."status_history" FOR SELECT USING (true);



CREATE POLICY "Allow public update on area_subscriptions" ON "public"."area_subscriptions" FOR UPDATE USING (true);



CREATE POLICY "Allow public update on notifications" ON "public"."notifications" FOR UPDATE USING (true);



CREATE POLICY "Allow public upsert on area_subscriptions" ON "public"."area_subscriptions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow users to insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow users to update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."area_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."issues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."status_history" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON FUNCTION "public"."nearby_events"("center_lat" double precision, "center_lng" double precision, "radius_meters" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."nearby_events"("center_lat" double precision, "center_lng" double precision, "radius_meters" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."nearby_events"("center_lat" double precision, "center_lng" double precision, "radius_meters" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_new_issue"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_new_issue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_new_issue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."area_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."area_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."area_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."issues" TO "anon";
GRANT ALL ON TABLE "public"."issues" TO "authenticated";
GRANT ALL ON TABLE "public"."issues" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."service_providers" TO "anon";
GRANT ALL ON TABLE "public"."service_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."service_providers" TO "service_role";



GRANT ALL ON TABLE "public"."status_history" TO "anon";
GRANT ALL ON TABLE "public"."status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."status_history" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







