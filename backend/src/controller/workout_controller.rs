use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::PgPool;

use crate::model::workout::{CreateWorkout, SetType, Workout, WorkoutRow};

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
    let volume = calculate_volume(&payload.set_type, payload.weight, payload.reps);
    let estimated_one_rep_max =
        calculate_one_rep_max(&payload.set_type, payload.weight, payload.reps);

    let row = sqlx::query_file_as!(
        WorkoutRow,
        "queries/create_workout.sql",
        payload.date,
        payload.day.as_str(),
        payload.exercise_id,
        payload.set_number,
        payload.weight,
        payload.reps,
        payload.reps_in_reserve,
        payload.set_type.as_str(),
        volume,
        estimated_one_rep_max,
        payload.notes,
    )
    .fetch_one(&pool)
    .await
    .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    Ok((StatusCode::CREATED, Json(Workout::from(row))))
}

pub async fn update_workout(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
    Json(payload): Json<CreateWorkout>,
) -> Result<Json<Workout>, (StatusCode, String)> {
    let volume = calculate_volume(&payload.set_type, payload.weight, payload.reps);
    let estimated_one_rep_max =
        calculate_one_rep_max(&payload.set_type, payload.weight, payload.reps);

    let row = sqlx::query_file_as!(
        WorkoutRow,
        "queries/update_workout.sql",
        id,
        payload.date,
        payload.day.as_str(),
        payload.exercise_id,
        payload.set_number,
        payload.weight,
        payload.reps,
        payload.reps_in_reserve,
        payload.set_type.as_str(),
        volume,
        estimated_one_rep_max,
        payload.notes
    )
    .fetch_optional(&pool)
    .await
    .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    match row {
        Some(row) => Ok(Json(Workout::from(row))),
        None => Err((StatusCode::NOT_FOUND, "Workout not found!".to_string())),
    }
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

fn calculate_volume(set_type: &SetType, weight: f64, reps: i64) -> f64 {
    if !set_type.is_working() {
        return 0.0;
    }

    weight * reps as f64
}

fn calculate_one_rep_max(set_type: &SetType, weight: f64, reps: i64) -> f64 {
    if !set_type.is_working() {
        return 0.0;
    }

    weight * (1.0 + reps as f64 / 30.0)
}
