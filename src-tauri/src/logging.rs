// Lyrica — File-based logging
// Uses tracing + tracing-appender for rolling daily log files.
// Logs land in: %AppData%\lyrica\logs\lyrica.log.YYYY-MM-DD

use std::path::Path;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Initialize the logging system.
/// Call this once at the very start of `run()`.
///
/// # Arguments
/// * `data_dir` - App data directory (e.g. `%AppData%\lyrica`)
/// * `level`    - Log level string: "error", "warn", "info", "debug", "trace"
pub fn init_logging(data_dir: &Path, level: &str) {
    let log_dir = data_dir.join("logs");

    // Rolling daily log: lyrica.log.2026-07-22
    let file_appender = RollingFileAppender::new(Rotation::DAILY, &log_dir, "lyrica.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    // Leak the guard so logs are flushed on shutdown.
    // In a production app you'd store this in AppState or use a global.
    std::mem::forget(_guard);

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(level));

    tracing_subscriber::registry()
        // JSON file logs (structured, machine-readable)
        .with(
            fmt::layer()
                .json()
                .with_writer(non_blocking)
                .with_target(true)
                .with_thread_ids(false),
        )
        // Human-readable stderr logs (dev mode)
        .with(
            fmt::layer()
                .pretty()
                .with_writer(std::io::stderr)
                .with_target(true),
        )
        .with(filter)
        .init();

    tracing::info!(log_dir = %log_dir.display(), level = %level, "Lyrica logging initialized");
}
