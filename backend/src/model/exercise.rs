use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Serialize, FromRow)]
pub struct Exercise {
    pub id: i64,
    pub name: String,
    pub muscle_group: String,
    pub category: String,
    pub rep_low_range: i32,
    pub rep_high_range: i32,
}

#[derive(Deserialize)]
pub struct CreateExercise {
    pub name: String,
    pub muscle_group: String,
    pub category: String,
    pub rep_low_range: i32,
    pub rep_high_range: i32,
}
