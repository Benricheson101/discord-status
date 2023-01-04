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

--
-- Name: subscription_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_kind AS ENUM (
    'post',
    'edit'
);


--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: legacy_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legacy_subscriptions (
    id integer NOT NULL,
    webhook_id bigint NOT NULL,
    webhook_token text NOT NULL,
    subscription_id integer NOT NULL
);


--
-- Name: legacy_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.legacy_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: legacy_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.legacy_subscriptions_id_seq OWNED BY public.legacy_subscriptions.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: sent_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sent_updates (
    id integer NOT NULL,
    message_id bigint NOT NULL,
    kind public.subscription_kind NOT NULL,
    incident_id text NOT NULL,
    incident_update_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription_id integer NOT NULL,
    legacy_subscription_id integer
);


--
-- Name: sent_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sent_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sent_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sent_updates_id_seq OWNED BY public.sent_updates.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    guild_id bigint NOT NULL,
    channel_id bigint NOT NULL,
    kind public.subscription_kind DEFAULT 'edit'::public.subscription_kind NOT NULL,
    role_pings bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: legacy_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.legacy_subscriptions_id_seq'::regclass);


--
-- Name: sent_updates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sent_updates ALTER COLUMN id SET DEFAULT nextval('public.sent_updates_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: legacy_subscriptions legacy_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_subscriptions
    ADD CONSTRAINT legacy_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: legacy_subscriptions legacy_subscriptions_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_subscriptions
    ADD CONSTRAINT legacy_subscriptions_subscription_id_key UNIQUE (subscription_id);


--
-- Name: legacy_subscriptions legacy_subscriptions_webhook_id_webhook_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_subscriptions
    ADD CONSTRAINT legacy_subscriptions_webhook_id_webhook_token_key UNIQUE (webhook_id, webhook_token);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sent_updates sent_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sent_updates
    ADD CONSTRAINT sent_updates_pkey PRIMARY KEY (id);


--
-- Name: sent_updates sent_updates_subscription_id_incident_id_incident_update_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sent_updates
    ADD CONSTRAINT sent_updates_subscription_id_incident_id_incident_update_id_key UNIQUE (subscription_id, incident_id, incident_update_id);


--
-- Name: sent_updates sent_updates_subscription_id_message_id_incident_update_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sent_updates
    ADD CONSTRAINT sent_updates_subscription_id_message_id_incident_update_id_key UNIQUE (subscription_id, message_id, incident_update_id);


--
-- Name: subscriptions subscriptions_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_channel_id_key UNIQUE (channel_id);


--
-- Name: subscriptions subscriptions_guild_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_guild_id_key UNIQUE (guild_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: legacy_subscriptions set_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.legacy_subscriptions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: sent_updates set_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.sent_updates FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: subscriptions set_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: legacy_subscriptions legacy_subscriptions_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_subscriptions
    ADD CONSTRAINT legacy_subscriptions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: sent_updates sent_updates_legacy_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sent_updates
    ADD CONSTRAINT sent_updates_legacy_subscription_id_fkey FOREIGN KEY (legacy_subscription_id) REFERENCES public.legacy_subscriptions(id) ON DELETE SET NULL;


--
-- Name: sent_updates sent_updates_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sent_updates
    ADD CONSTRAINT sent_updates_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20221220055555');
