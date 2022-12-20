use sqlx::PgPool;

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

    pub async fn get_subscriptions(&self) {}
}
