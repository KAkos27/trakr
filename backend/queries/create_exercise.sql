INSERT INTO exercises
(name, muscle_group, category, rep_low_range, rep_high_range)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, muscle_group, category, rep_low_range, rep_high_range

