UPDATE exercises
SET
    name = $2,
    muscle_group = $3,
    category = $4
WHERE id = $1
RETURNING id, name, muscle_group, category
