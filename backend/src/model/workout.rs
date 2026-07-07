use serde::Serialize;
use sqlx::{prelude::FromRow, types::chrono::NaiveDate};

use crate::model::exercise::Exercise;

#[derive(Serialize, FromRow)]
pub struct Workout {
    pub id: i64,
    pub date: NaiveDate,
    pub day: String,
    pub exercise: Exercise,
    pub set_number: i64,
    pub weight: f64,
    pub reps: i64,
    pub reps_in_reserve: Option<i64>,
    pub set_type: String,
    pub volume: f64,
    pub estimated_one_rep_max: f64,
    pub notes: Option<String>,
}

pub struct WorkoutRow {
    pub id: i64,
    pub date: NaiveDate,
    pub day: String,
    pub set_number: i64,
    pub weight: f64,
    pub reps: i64,
    pub reps_in_reserve: Option<i64>,
    pub set_type: String,
    pub volume: f64,
    pub estimated_one_rep_max: f64,
    pub notes: Option<String>,

    pub exercise_id: i64,
    pub exercise_name: String,
    pub exercise_muscle_group: String,
    pub exercise_category: String,
    pub exercise_rep_low_range: i64,
    pub exercise_rep_high_range: i64,
}

impl From<WorkoutRow> for Workout {
    fn from(row: WorkoutRow) -> Self {
        Self {
            id: row.id,
            date: row.date,
            day: row.day,
            set_number: row.set_number,
            weight: row.weight,
            reps: row.reps,
            reps_in_reserve: row.reps_in_reserve,
            set_type: row.set_type,
            volume: row.volume,
            estimated_one_rep_max: row.estimated_one_rep_max,
            notes: row.notes,
            exercise: Exercise {
                id: row.exercise_id,
                name: row.exercise_name,
                muscle_group: row.exercise_muscle_group,
                category: row.exercise_category,
                rep_low_range: row.exercise_rep_low_range,
                rep_high_range: row.exercise_rep_high_range,
            },
        }
    }
}
