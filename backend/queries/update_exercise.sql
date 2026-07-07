UPDATE exercises
SET
    name = $2,
    muscle_group = $3,
    category = $4,
    rep_low_range = $5,
    rep_high_range = $6
WHERE id = $1
RETURNING id, name, muscle_group, category, rep_low_range, rep_high_range
