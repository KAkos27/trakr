mod controller;
mod model;

use anyhow::Result;
use axum::{
    Router,
    routing::{delete, get, post, put},
};
use sqlx::postgres::PgPoolOptions;
use std::{env, net::SocketAddr};
use tower_http::cors::CorsLayer;

use crate::controller::{exercise_controller, workout_controller};

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = env::var("DATABASE_URL")?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    let app = Router::new()
        .route("/exercises", get(exercise_controller::get_exercises))
        .route(
            "/exercises/create",
            post(exercise_controller::create_exercise),
        )
        .route("/exercises/{id}", put(exercise_controller::update_exercise))
        .route(
            "/exercises/{id}",
            delete(exercise_controller::delete_exercise),
        )
        .route("/workouts", get(workout_controller::get_workouts))
        .route("/workouts/create", post(workout_controller::create_workout))
        .route("/workouts/{id}", delete(workout_controller::delete_workout))
        .with_state(pool)
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));

    tracing::info!("listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
