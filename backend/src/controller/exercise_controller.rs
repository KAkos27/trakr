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
    let exercises = sqlx::query_as::<_, Exercise>(
        "
        SELECT id, name, muscle_group, category, rep_low_range, rep_high_range
        FROM exercises
        ORDER BY name
        ",
    )
    .fetch_all(&pool)
    .await
    .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    Ok(Json(exercises))
}

pub async fn create_exercise(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateExercise>,
) -> Result<(StatusCode, Json<Exercise>), (StatusCode, String)> {
    let exercise = sqlx::query_as::<_, Exercise>(
        "
        INSERT INTO exercises
            (name, muscle_group, category, rep_low_range, rep_high_range)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, muscle_group, category, rep_low_range, rep_high_range
        ",
    )
    .bind(payload.name)
    .bind(payload.muscle_group)
    .bind(payload.category)
    .bind(payload.rep_low_range)
    .bind(payload.rep_high_range)
    .fetch_one(&pool)
    .await
    .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    Ok((StatusCode::CREATED, Json(exercise)))
}

pub async fn delete_exercise(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(
        "
        DELETE FROM exercises
        WHERE id = $1
        ",
    )
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "exercise not found!".to_string()));
    }
    Ok(StatusCode::NO_CONTENT)
}
