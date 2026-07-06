use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::PgPool;

use crate::model::exercise::{CreateExercise, Exercise};

pub async fn get_exercises(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Exercise>>, (StatusCode, String)> {
    let exercises = sqlx::query_file_as!(Exercise, "queries/get_exercises.sql")
        .fetch_all(&pool)
        .await
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    Ok(Json(exercises))
}

pub async fn create_exercise(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateExercise>,
) -> Result<(StatusCode, Json<Exercise>), (StatusCode, String)> {
    let exercise = sqlx::query_file_as!(
        Exercise,
        "queries/create_exercise.sql",
        payload.name,
        payload.muscle_group,
        payload.category,
        payload.rep_low_range,
        payload.rep_high_range
    )
    .fetch_one(&pool)
    .await
    .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    Ok((StatusCode::CREATED, Json(exercise)))
}

pub async fn delete_exercise(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query_file!("queries/delete_exercise.sql", id)
        .execute(&pool)
        .await
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "exercise not found!".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}
