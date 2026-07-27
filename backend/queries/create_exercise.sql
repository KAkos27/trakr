INSERT INTO exercises
(name, muscle_group, category)
VALUES ($1, $2, $3)
RETURNING id, name, muscle_group, category

