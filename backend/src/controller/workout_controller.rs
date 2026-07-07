use axum::{Json, extract::State, http::StatusCode};
use sqlx::PgPool;

use crate::model::workout::{Workout, WorkoutRow};

pub async fn get_workouts(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Workout>>, (StatusCode, String)> {
    let row = sqlx::query_file_as!(WorkoutRow, "queries/get_workouts.sql")
        .fetch_all(&pool)
        .await
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    let workouts = row.into_iter().map(Workout::from).collect();

    Ok(Json(workouts))
}
