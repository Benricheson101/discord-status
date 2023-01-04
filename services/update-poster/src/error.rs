use thiserror::Error;
use twilight_http::response::DeserializeBodyError;

#[derive(Debug, Error)]
pub enum ApplicationError {
    #[error("http request failed: {:?}", .source)]
    TwilightHTTPError {
        #[from]
        source: twilight_http::Error,
    },

    #[error("failed to send message to channel {}: {:?} (webhook: {:?})", .channel_id, .error, .webhook_id)]
    MessageSendError {
        channel_id: u64,
        webhook_id: Option<u64>,
        error: twilight_http::Error,
    },

    #[error("failed to edit message {}/{}: {:?} (webhook: {:?})", .channel_id, .message_id, .error, .webhook_id)]
    MessageEditError {
        channel_id: u64,
        message_id: u64,
        webhook_id: Option<u64>,
        error: twilight_http::Error,
    },

    #[error("failed to deserialize response body")]
    DeserializeBodyError {
        #[from]
        source: DeserializeBodyError,
    },

    #[error("database query failed: {:?}", .source)]
    SqlxError {
        #[from]
        source: sqlx::Error,
    },
}

pub type Result<T> = std::result::Result<T, ApplicationError>;
