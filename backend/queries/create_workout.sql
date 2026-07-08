WITH inserted AS (
    INSERT INTO workouts (
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
    VALUES (COALESCE($1, CURRENT_DATE), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    i.id,
    i.date,
    i.day,
    i.set_number,
    i.weight,
    i.reps,
    i.reps_in_reserve,
    i.set_type,
    i.volume,
    i.estimated_one_rep_max,
    i.notes,

    e.id AS exercise_id,
    e.name AS exercise_name,
    e.muscle_group AS exercise_muscle_group,
    e.category AS exercise_category,
    e.rep_low_range AS exercise_rep_low_range,
    e.rep_high_range AS exercise_rep_high_range
FROM inserted i
INNER JOIN exercises e ON i.exercise_id = e.id;
