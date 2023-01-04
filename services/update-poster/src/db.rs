use sqlx::{
    postgres::PgQueryResult,
    types::time::OffsetDateTime,
    PgPool,
    Postgres,
    QueryBuilder,
};

use crate::error::Result;

pub struct Database {
    pg: PgPool,
}

impl Database {
    pub fn new(pg_pool: PgPool) -> Self {
        Self { pg: pg_pool }
    }

    pub async fn get_guild_subscriptions(
        &self,
        guild_id: i64,
    ) -> Result<Subscription> {
        sqlx::query_as!(
            Subscription,
            r#"
                SELECT
                    id,
                    guild_id,
                    channel_id,
                    mode as "mode: _",
                    role_pings,
                    created_at,
                    updated_at
                FROM subscriptions
                WHERE guild_id = $1
            "#,
            guild_id
        )
        .fetch_one(&self.pg)
        .await
        .map_err(|e| e.into())
    }

    pub async fn get_all_subscriptions(&self) -> Result<Vec<Subscription>> {
        sqlx::query_as!(
            Subscription,
            r#"
                SELECT
                    id,
                    guild_id,
                    channel_id,
                    mode as "mode: _",
                    role_pings,
                    created_at,
                    updated_at
                FROM subscriptions"#
        )
        .fetch_all(&self.pg)
        .await
        .map_err(|e| e.into())
    }

    pub async fn get_incident_created_subscriptions(
        &self,
        incident_id: &String,
    ) -> Result<Vec<SelectSubsForIncidentCreated>> {
        sqlx::query_as!(
            SelectSubsForIncidentCreated,
            r#"
                SELECT
                    s.id AS "subscription_id!",
                    s.mode AS "mode!: _",
                    s.role_pings AS "role_pings!",
                    s.channel_id AS "channel_id!",
                    s.webhook_id AS "webhook_id?",
                    s.webhook_token AS "webhook_token?"
                FROM subscriptions AS s
                LEFT JOIN sent_updates AS u
                    ON s.id = u.subscription_id
                    AND u.incident_id = $1
                WHERE u.incident_id IS NULL
                GROUP BY s.id
            "#,
            incident_id,
        )
        .fetch_all(&self.pg)
        .await
        .map_err(|e| e.into())
    }

    pub async fn get_incident_update_created_subscriptions(
        &self,
        incident_id: &String,
        incident_update_id: &String,
    ) -> Result<Vec<SelectSubForUpdateCreated>> {
        sqlx::query_as!(
            SelectSubForUpdateCreated,
            r#"
                SELECT
                    s.channel_id as "channel_id!",
                    s.id as "subscription_id!",
                    s.mode as "mode!: _",
                    s.role_pings as "role_pings!",
                    s.webhook_id as "webhook_id?",
                    s.webhook_token as "webhook_token?",
                    u.message_id as "message_id?"
                FROM subscriptions AS s
                LEFT JOIN (
                    SELECT DISTINCT ON (incident_id, subscription_id)
                        subscription_id,
                        message_id
                    FROM sent_updates
                    WHERE mode = 'edit'
                    AND incident_id = $1
                ) AS u
                    ON u.subscription_id = s.id
                LEFT JOIN sent_updates AS u2
                   ON s.id = u2.subscription_id
                   AND u2.incident_id = $1
                   AND u2.incident_update_id = $2
                WHERE u2.incident_update_id IS NULL
            "#,
            incident_id,
            incident_update_id,
        )
        .fetch_all(&self.pg)
        .await
        .map_err(|e| e.into())
    }

    pub async fn get_incident_update_modified_subscriptions(
        &self,
        incident_id: &String,
        incident_update_id: &String,
    ) -> Result<Vec<SelectSubsForUpdateModified>> {
        sqlx::query_as!(
            SelectSubsForUpdateModified,
            r#"
                SELECT
                    s.channel_id as "channel_id!",
                    s.id as "subscription_id!",
                    s.mode as "mode!: _",
                    s.webhook_id as "webhook_id?",
                    s.webhook_token as "webhook_token?",
                    u.message_id as "message_id!"
                FROM subscriptions AS s
                INNER JOIN sent_updates AS u
                    ON s.id = u.subscription_id
                    AND u.incident_id = $1
                    AND u.incident_update_id = $2
            "#,
            incident_id,
            incident_update_id,
        )
        .fetch_all(&self.pg)
        .await
        .map_err(|e| e.into())
    }

    pub async fn create_sent_update(
        &self,
        data: CreateSentUpdate<'_>,
    ) -> Result<()> {
        sqlx::query!(
            r#"
                INSERT INTO sent_updates (
                    message_id,
                    mode,
                    incident_id,
                    incident_update_id,
                    subscription_id
                )
                VALUES ($1, $2, $3, $4, $5)
            "#,
            data.message_id,
            data.mode as SubscriptionMode,
            data.incident_id,
            data.incident_update_id,
            data.subscription_id,
        )
        .execute(&self.pg)
        .await?;

        Ok(())
    }

    pub async fn create_many_sent_updates(
        &self,
        data: Vec<CreateSentUpdate<'_>>,
    ) -> Result<PgQueryResult> {
        let mut qb: QueryBuilder<Postgres> = QueryBuilder::new(
            r#"
                INSERT INTO sent_updates (
                    message_id,
                    mode,
                    incident_id,
                    incident_update_id,
                    subscription_id
                )
        "#,
        );

        qb.push_values(data, |mut b, d| {
            b.push_bind(d.message_id)
                .push_bind(d.mode)
                .push_bind(d.incident_id)
                .push_bind(d.incident_update_id)
                .push_bind(d.subscription_id);
        });

        qb.build().execute(&self.pg).await.map_err(|e| e.into())
    }

    pub async fn create_subscription(
        &self,
        subscription: CreateSubscription,
    ) -> Result<Subscription> {
        sqlx::query_as!(
            Subscription,
            r#"
                INSERT INTO subscriptions (guild_id, channel_id, mode)
                VALUES ($1, $2, $3)
                RETURNING
                    id,
                    guild_id,
                    channel_id,
                    mode as "mode: _",
                    role_pings,
                    created_at,
                    updated_at
            "#,
            subscription.guild_id,
            subscription.channel_id,
            subscription.mode.unwrap_or_default() as SubscriptionMode,
        )
        .fetch_one(&self.pg)
        .await
        .map_err(|e| e.into())
    }

    pub async fn delete_subscription(&self, id: i32) -> Result<()> {
        sqlx::query!("DELETE FROM subscriptions WHERE id = $1", id)
            .execute(&self.pg)
            .await?;

        Ok(())
    }
}

#[derive(Debug, sqlx::Type, Copy, Clone)]
#[sqlx(type_name = "subscription_mode", rename_all = "lowercase")]
pub enum SubscriptionMode {
    Post,
    Edit,
}

impl Default for SubscriptionMode {
    fn default() -> Self {
        Self::Edit
    }
}

#[derive(Debug)]
pub struct Subscription {
    pub id: i32,

    pub guild_id: i64,
    pub channel_id: i64,

    pub mode: SubscriptionMode,
    pub role_pings: Vec<i64>,

    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug)]
pub struct CreateSubscription {
    pub guild_id: i64,
    pub channel_id: i64,

    pub mode: Option<SubscriptionMode>,
    pub role_pings: Option<Vec<i64>>,
}

#[derive(Debug)]
pub struct SentUpdate {
    pub id: i32,
    pub message_id: i64,
    pub mode: SubscriptionMode,
    pub incident_id: String,
    pub incident_update_id: String,
    pub subscription_id: i32,
}

#[derive(Debug)]
pub struct CreateSentUpdate<'a> {
    pub message_id: i64,
    pub mode: SubscriptionMode,
    pub incident_id: &'a String,
    pub incident_update_id: &'a String,
    pub subscription_id: i32,
}

#[derive(Debug)]
pub struct SelectSubsForIncidentCreated {
    pub subscription_id: i32,
    pub mode: SubscriptionMode,
    pub role_pings: Vec<i64>,
    pub channel_id: i64,
    pub webhook_id: Option<i64>,
    pub webhook_token: Option<String>,
}

#[derive(Debug)]
pub struct SelectSubForUpdateCreated {
    pub channel_id: i64,
    pub subscription_id: i32,
    pub mode: SubscriptionMode,
    pub role_pings: Vec<i64>,
    pub webhook_id: Option<i64>,
    pub webhook_token: Option<String>,
    pub message_id: Option<i64>,
}

#[derive(Debug)]
pub struct SelectSubsForUpdateModified {
    pub subscription_id: i32,
    pub channel_id: i64,
    pub mode: SubscriptionMode,
    pub webhook_id: Option<i64>,
    pub webhook_token: Option<String>,
    pub message_id: i64,
}
