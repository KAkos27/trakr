mod controller;
mod model;

use anyhow::{Context, Result};
use axum::{
    Router, middleware,
    body::Body,
    extract::{Request, State},
    http::{StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
};
use base64::{Engine as _, engine::general_purpose};
use sqlx::postgres::PgPoolOptions;
use std::{env, net::SocketAddr};
use tower_http::cors::CorsLayer;

use crate::controller::{exercise_controller, workout_controller};

#[derive(Clone)]
struct AuthConfig {
    username: String,
    password: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = env::var("DATABASE_URL")?;
    let auth_config = AuthConfig {
        username: env::var("AUTH_USERNAME").context("AUTH_USERNAME is missing")?,
        password: env::var("AUTH_PASSWORD").context("AUTH_PASSWORD is missing")?,
    };

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    let app = Router::new()
        .route("/exercises", get(exercise_controller::get_exercises))
        .route("/exercises", post(exercise_controller::create_exercise))
        .route("/exercises/{id}", put(exercise_controller::update_exercise))
        .route(
            "/exercises/{id}",
            delete(exercise_controller::delete_exercise),
        )
        .route("/workouts", get(workout_controller::get_workouts))
        .route("/workouts", post(workout_controller::create_workout))
        .route("/workouts/{id}", put(workout_controller::update_workout))
        .route("/workouts/{id}", delete(workout_controller::delete_workout))
        .route_layer(middleware::from_fn_with_state(
            auth_config,
            require_basic_auth,
        ))
        .with_state(pool)
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));

    tracing::info!("listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn require_basic_auth(
    State(auth_config): State<AuthConfig>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let Some(header_value) = request.headers().get(header::AUTHORIZATION) else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let Ok(header_value) = header_value.to_str() else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let Some(encoded_credentials) = header_value.strip_prefix("Basic ") else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let Ok(decoded_credentials) = general_purpose::STANDARD.decode(encoded_credentials) else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let Ok(decoded_credentials) = String::from_utf8(decoded_credentials) else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let Some((username, password)) = decoded_credentials.split_once(':') else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    if username != auth_config.username || password != auth_config.password {
        return Err(StatusCode::UNAUTHORIZED);
    }

    Ok(next.run(request).await.into_response())
}
