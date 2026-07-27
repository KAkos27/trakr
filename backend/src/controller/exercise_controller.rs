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
    let exercises = sqlx::query_as::<_, Exercise>(include_str!("../../queries/get_exercises.sql"))
        .fetch_all(&pool)
        .await
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    Ok(Json(exercises))
}

pub async fn create_exercise(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateExercise>,
) -> Result<(StatusCode, Json<Exercise>), (StatusCode, String)> {
    let exercise = sqlx::query_as::<_, Exercise>(include_str!("../../queries/create_exercise.sql"))
        .bind(payload.name)
        .bind(payload.muscle_group)
        .bind(payload.category)
        .fetch_one(&pool)
        .await
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    Ok((StatusCode::CREATED, Json(exercise)))
}

pub async fn update_exercise(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
    Json(payload): Json<CreateExercise>,
) -> Result<Json<Exercise>, (StatusCode, String)> {
    let exercise = sqlx::query_as::<_, Exercise>(include_str!("../../queries/update_exercise.sql"))
        .bind(id)
        .bind(payload.name)
        .bind(payload.muscle_group)
        .bind(payload.category)
        .fetch_optional(&pool)
        .await
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    match exercise {
        Some(exercise) => Ok(Json(exercise)),
        None => Err((StatusCode::NOT_FOUND, "Exercise not found!".to_string())),
    }
}

pub async fn delete_exercise(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(include_str!("../../queries/delete_exercise.sql"))
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Exercise not found!".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}
