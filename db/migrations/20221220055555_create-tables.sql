-- migrate:up

CREATE TYPE subscription_kind AS ENUM ('post', 'edit');

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,

  guild_id BIGINT UNIQUE NOT NULL,
  channel_id BIGINT UNIQUE NOT NULL,

  kind subscription_kind NOT NULL DEFAULT 'edit',
  role_pings BIGINT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE legacy_subscriptions (
  id SERIAL PRIMARY KEY,

  webhook_id BIGINT NOT NULL,
  webhook_token TEXT NOT NULL,

  subscription_id INT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  UNIQUE(webhook_id, webhook_token)
);

CREATE TABLE sent_updates (
  id SERIAL PRIMARY KEY,

  message_id BIGINT NOT NULL,
  kind subscription_kind NOT NULL,

  incident_id TEXT NOT NULL,
  incident_update_id TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  subscription_id INT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  legacy_subscription_id INT REFERENCES legacy_subscriptions(id) ON DELETE SET NULL,

  UNIQUE(subscription_id, message_id, incident_id, incident_update_id)
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
ON legacy_subscriptions
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE
ON sent_updates
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- migrate:down

DROP TRIGGER set_timestamp ON subscriptions;
DROP TRIGGER set_timestamp ON legacy_subscriptions;
DROP TRIGGER set_timestamp ON sent_updates;
DROP FUNCTION trigger_set_timestamp;

DROP TABLE sent_updates;
DROP TABLE legacy_subscriptions;
DROP TABLE subscriptions;

DROP TYPE subscription_kind;
