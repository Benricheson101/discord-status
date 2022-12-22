use sqlx::{types::time::OffsetDateTime, FromRow, PgPool};

pub struct Database {
    pg: PgPool,
}

impl Database {
    pub fn new(pg_pool: PgPool) -> Self {
        Self { pg: pg_pool }
    }

    pub async fn get_webhooks(&self) {
        let num = sqlx::query!("SELECT $1::int as num", 1i32)
            .fetch_one(&self.pg)
            .await
            .unwrap();

        println!("{}", num.num.unwrap());
    }

    pub async fn get_guild_subscriptions(
        &self,
        guild_id: i64,
    ) -> sqlx::Result<SubscriptionModel> {
        sqlx::query_as!(
            SubscriptionModel,
            r#"
                SELECT
                    id,
                    guild_id,
                    channel_id,
                    kind as "kind: _",
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
    }

    pub async fn get_all_subscriptions(
        &self,
    ) -> sqlx::Result<Vec<SubscriptionModel>> {
        sqlx::query_as!(
            SubscriptionModel,
            r#"
                SELECT
                    id,
                    guild_id,
                    channel_id,
                    kind as "kind: _",
                    role_pings,
                    created_at,
                    updated_at
                FROM subscriptions"#
        )
        .fetch_all(&self.pg)
        .await
    }

    pub async fn get_incident_created_subscriptions(
        &self,
    ) -> sqlx::Result<Vec<SelectSubscriptionWithWebhookModel>> {
        sqlx::query_as!(
            SelectSubscriptionWithWebhookModel,
            r#"
                SELECT
                    subscriptions.id AS "subscription_id!",
                    subscriptions.kind AS "kind!: _",
                    legacy_subscriptions.id AS "legacy_subscription_id?",
                    subscriptions.channel_id AS "channel_id!",
                    legacy_subscriptions.webhook_id AS "webhook_id?",
                    legacy_subscriptions.webhook_token AS "webhook_token?"
                FROM subscriptions
                LEFT JOIN legacy_subscriptions
                ON subscriptions.id = legacy_subscriptions.subscription_id
            "#
        )
        .fetch_all(&self.pg)
        .await
    }

    pub async fn get_incident_update_created_subscriptions(
        &self,
        incident_id: &String,
    ) -> sqlx::Result<Vec<SelectSubWithWehookMsgModel>> {
        // FIXME: the second LEFT JOIN will probably join multiple columns instead of just one
        sqlx::query_as!(
            SelectSubWithWehookMsgModel,
            r#"
                SELECT
                    s.channel_id as "channel_id!",
                    s.id as "subscription_id!",
                    s.kind as "kind!: _",
                    l.id as "legacy_subscription_id?",
                    l.webhook_id as "webhook_id?",
                    l.webhook_token as "webhook_token?",
                    u.message_id as "message_id?"
                FROM subscriptions AS s
                LEFT JOIN legacy_subscriptions AS l
                    ON s.id = l.subscription_id
                LEFT JOIN (
                    SELECT
                        a.message_id,
                        b.subscription_id
                    FROM sent_updates AS a
                    INNER JOIN (
                        SELECT
                            MAX(created_at) AS max_created_at,
                            subscription_id,
                            incident_id
                        FROM sent_updates
                        GROUP BY subscription_id, incident_id
                    ) AS b
                    ON a.subscription_id = b.subscription_id
                    AND a.created_at = b.max_created_at
                    WHERE a.incident_id = $1
                ) AS u
                ON u.subscription_id = s.id;
            "#,
            incident_id,
        )
        .fetch_all(&self.pg)
        .await
    }

    pub async fn create_sent_update(&self, data: CreateSentUpdateModel) {
        let created = sqlx::query!(
            r#"
                INSERT INTO sent_updates (
                    message_id,
                    kind,
                    incident_id,
                    incident_update_id,
                    subscription_id,
                    legacy_subscription_id
                )
                VALUES ($1, $2, $3, $4, $5, $6)
            "#,
            data.message_id,
            data.kind as SubscriptionKind,
            data.incident_id,
            data.incident_update_id,
            data.subscription_id,
            data.legacy_subscription_id,
        )
        .execute(&self.pg)
        .await
        .unwrap();

        println!("{:#?}", created);
    }

    pub async fn get_edit_subscriptions(
        &self,
        incident_id: &String,
        incident_update_id: &String,
    ) -> sqlx::Result<()> {
        let res = sqlx::query!(
            r#"
                SELECT subscriptions.id, sent_updates.message_id, sent_updates.incident_id
                FROM subscriptions
                INNER JOIN sent_updates
                ON subscriptions.id = sent_updates.subscription_id
                LEFT JOIN legacy_subscriptions
                ON subscriptions.id = legacy_subscriptions.subscription_id
                WHERE
                    subscriptions.kind = 'edit'::subscription_kind
                    AND sent_updates.incident_id = $1
                    AND sent_updates.incident_update_id = $2
            "#,
            incident_id,
            incident_update_id
        )
        .fetch_all(&self.pg)
        .await?;

        println!("{:#?}", res);

        Ok(())
    }

    pub async fn create_subscription(
        &self,
        subscription: CreateSubscriptionModel,
    ) -> sqlx::Result<SubscriptionModel> {
        sqlx::query_as!(
            SubscriptionModel,
            r#"
                INSERT INTO subscriptions (guild_id, channel_id, kind)
                VALUES ($1, $2, $3)
                RETURNING
                    id,
                    guild_id,
                    channel_id,
                    kind as "kind: _",
                    role_pings,
                    created_at,
                    updated_at
            "#,
            subscription.guild_id,
            subscription.channel_id,
            subscription.kind.unwrap_or_default() as SubscriptionKind,
        )
        .fetch_one(&self.pg)
        .await
    }

    pub async fn delete_subscription(&self, id: i32) -> sqlx::Result<()> {
        sqlx::query!("DELETE FROM subscriptions WHERE id = $1", id)
            .execute(&self.pg)
            .await?;

        Ok(())
    }
}

#[derive(Debug, sqlx::Type, Copy, Clone)]
#[sqlx(type_name = "subscription_kind", rename_all = "lowercase")]
pub enum SubscriptionKind {
    Post,
    Edit,
}

impl Default for SubscriptionKind {
    fn default() -> Self {
        Self::Edit
    }
}

#[derive(Debug)]
pub struct SubscriptionModel {
    pub id: i32,

    pub guild_id: i64,
    pub channel_id: i64,

    pub kind: SubscriptionKind,
    pub role_pings: Vec<i64>,

    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug)]
pub struct CreateSubscriptionModel {
    pub guild_id: i64,
    pub channel_id: i64,

    pub kind: Option<SubscriptionKind>,
    pub role_pings: Option<Vec<i64>>,
}

#[derive(Debug)]
pub struct LegacySubscriptionModel {
    pub id: i32,
    pub webhook_id: i64,
    pub webhook_token: String,
    pub subscription_id: i32,
}

#[derive(Debug)]
pub struct SentUpdateModel {
    pub id: i32,
    pub message_id: i64,
    pub kind: SubscriptionKind,
    pub incident_id: String,
    pub incident_update_id: String,
    pub subscription_id: i32,
    pub legacy_subscription_id: Option<i32>,
}

#[derive(Debug)]
pub struct CreateSentUpdateModel {
    pub message_id: i64,
    pub kind: SubscriptionKind,
    pub incident_id: String,
    pub incident_update_id: String,
    pub subscription_id: i32,
    pub legacy_subscription_id: Option<i32>,
}

#[derive(Debug)]
pub struct SelectSubscriptionWithWebhookModel {
    pub subscription_id: i32,
    pub kind: SubscriptionKind,
    pub legacy_subscription_id: Option<i32>,
    pub channel_id: i64,
    pub webhook_id: Option<i64>,
    pub webhook_token: Option<String>,
}

#[derive(Debug)]
pub struct SelectSubWithWehookMsgModel {
    pub channel_id: i64,
    pub subscription_id: i32,
    pub kind: SubscriptionKind,
    pub legacy_subscription_id: Option<i32>,
    pub webhook_id: Option<i64>,
    pub webhook_token: Option<String>,
    pub message_id: Option<i64>,
}
