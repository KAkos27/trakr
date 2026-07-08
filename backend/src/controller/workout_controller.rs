use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::PgPool;

use crate::model::workout::{CreateWorkout, Workout, WorkoutRow};

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

pub async fn create_workout(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateWorkout>,
) -> Result<(StatusCode, Json<Workout>), (StatusCode, String)> {
    let mut volume = 0.0;
    let mut estimated_one_rep_max = 0.0;

    if payload.set_type == "working" {
        volume = payload.weight * payload.reps as f64;
        estimated_one_rep_max = payload.weight * (1.0 + payload.reps as f64 / 30.0);
    }

    let row = sqlx::query_file_as!(
        WorkoutRow,
        "queries/create_workout.sql",
        payload.day,
        payload.exercise_id,
        payload.set_number,
        payload.weight,
        payload.reps,
        payload.reps_in_reserve,
        payload.set_type,
        volume,
        estimated_one_rep_max,
        payload.notes,
    )
    .fetch_one(&pool)
    .await
    .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    Ok((StatusCode::CREATED, Json(Workout::from(row))))
}

pub async fn delete_workout(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<StatusCode, (StatusCode, String)> {
    let query = sqlx::query_file!("queries/delete_workout.sql", id)
        .execute(&pool)
        .await
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    if query.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "No workout found!".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}
