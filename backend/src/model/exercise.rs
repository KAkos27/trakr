use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Serialize, FromRow)]
pub struct Exercise {
    pub id: i64,
    pub name: String,
    pub muscle_group: String,
    pub category: String,
}

#[derive(Deserialize)]
pub struct CreateExercise {
    pub name: String,
    pub muscle_group: String,
    pub category: String,
}
