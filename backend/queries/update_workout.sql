WITH updated AS (
    UPDATE workouts
    SET
        date = COALESCE($2::date, date),
        day = $3,
        exercise_id = $4,
        set_number = $5,
        weight = $6,
        reps = $7,
        reps_in_reserve = $8,
        set_type = $9,
        volume = $10,
        estimated_one_rep_max = $11,
        notes = $12
    WHERE id = $1
    RETURNING
        id,
        date,
        day,
        exercise_id,
        set_number,
        weight,
        reps,
        reps_in_reserve,
        set_type,
        volume,
        estimated_one_rep_max,
        notes
)
SELECT
    u.id,
    u.date,
    u.day,
    u.set_number,
    u.weight,
    u.reps,
    u.reps_in_reserve,
    u.set_type,
    u.volume,
    u.estimated_one_rep_max,
    u.notes,

    e.id AS exercise_id,
    e.name AS exercise_name,
    e.muscle_group AS exercise_muscle_group,
    e.category AS exercise_category
FROM updated u
INNER JOIN exercises e ON u.exercise_id = e.id;
