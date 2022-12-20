-- migrate:up

CREATE TYPE subscription_kind AS ENUM ('post', 'edit');

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,

  guild_id BIGINT NOT NULL,
  channel_id BIGINT NOT NULL,

  kind subscription_kind NOT NULL DEFAULT 'edit',
  role_pings BIGINT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(guild_id, channel_id)
);

CREATE TABLE sent_updates (
  id SERIAL PRIMARY KEY,

  guild_id BIGINT NOT NULL,
  channel_id BIGINT NOT NULL,
  message_id BIGINT NOT NULL,

  incident_id TEXT NOT NULL,
  incident_update_id TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(incident_id, incident_update_id),
  UNIQUE(guild_id, channel_id, message_id, incident_id, incident_update_id)
);

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE
ON subscriptions
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE
ON sent_updates
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- TODO: legacy webhook support

-- migrate:down

DROP TRIGGER set_timestamp ON subscriptions;
DROP TRIGGER set_timestamp ON sent_updates;
DROP FUNCTION trigger_set_timestamp;

DROP TABLE subscriptions;
DROP TABLE sent_updates;

DROP TYPE subscription_kind;
