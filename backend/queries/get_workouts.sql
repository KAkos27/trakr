SELECT
    w.id,
    w.date,
    w.day,
    w.set_number,
    w.weight,
    w.reps,
    w.reps_in_reserve,
    w.set_type,
    w.volume,
    w.estimated_one_rep_max,
    w.notes,

    e.id AS exercise_id,
    e.name AS exercise_name,
    e.muscle_group AS exercise_muscle_group,
    e.category AS exercise_category,
    e.rep_low_range AS exercise_rep_low_range,
    e.rep_high_range AS exercise_rep_high_range
FROM workouts w
INNER JOIN exercises e ON w.exercise_id = e.id
ORDER BY w.date;
