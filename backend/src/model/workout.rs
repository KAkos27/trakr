use serde::{Deserialize, Serialize};
use sqlx::{prelude::FromRow, types::chrono::NaiveDate};

use crate::model::exercise::Exercise;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum WorkoutDay {
    Push,
    Pull,
    Leg,
}

impl WorkoutDay {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Push => "push",
            Self::Pull => "pull",
            Self::Leg => "leg",
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum SetType {
    WarmUp,
    Working,
}

impl SetType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::WarmUp => "warm-up",
            Self::Working => "working",
        }
    }

    pub fn is_working(&self) -> bool {
        matches!(self, Self::Working)
    }
}

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

#[derive(Deserialize, Serialize)]
pub struct CreateWorkout {
    pub date: Option<NaiveDate>,
    pub day: WorkoutDay,
    pub exercise_id: i64,
    pub set_number: i64,
    pub weight: f64,
    pub reps: i64,
    pub reps_in_reserve: Option<i64>,
    pub set_type: SetType,
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
            },
        }
    }
}
