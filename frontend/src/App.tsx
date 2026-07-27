import { useEffect, useState } from "react";
import "./App.css";
import {
  clearAuthToken,
  createExercise,
  createWorkout,
  deleteExercise,
  deleteWorkout,
  getExercises,
  getWorkouts,
  hasAuthToken,
  setBasicAuthCredentials,
  updateExercise,
  updateWorkout,
  type Exercise,
  type ExerciseCategory,
  type ExercisePayload,
  type SetType,
  type Workout,
  type WorkoutDay,
  type WorkoutPayload,
} from "./api";

type ExerciseForm = {
  name: string;
  muscle_group: string;
  category: ExerciseCategory;
};

type WorkoutForm = {
  date: string;
  day: WorkoutDay;
  exercise_id: string;
  set_number: string;
  weight: string;
  weight_unit: WeightUnit;
  reps: string;
  reps_in_reserve: string;
  set_type: SetType;
  notes: string;
};

type ExerciseProgressPoint = {
  date: string;
  volume: number;
  maxWeight: number;
};

type ExerciseSession = {
  date: string;
  day: string;
  exercise: Exercise;
  sets: Workout[];
  totalVolume: number;
  maxWeight: number;
};

type PlannerTarget = {
  weight: number;
  reps: number;
  volume: number;
  deltaVolume: number;
  action: string;
  reason: string;
};

type ChartMode = "both" | "volume" | "weight";
type WeightUnit = "kg" | "lbs";
type AppView = "dashboard" | "log" | "exercises" | "history" | "exercise-detail";

const POUNDS_PER_KILOGRAM = 2.2046226218;

const emptyExerciseForm: ExerciseForm = {
  name: "",
  muscle_group: "",
  category: "compound",
};

const emptyWorkoutForm: WorkoutForm = {
  date: "",
  day: "push",
  exercise_id: "",
  set_number: "1",
  weight: "",
  weight_unit: "kg",
  reps: "",
  reps_in_reserve: "",
  set_type: "working",
  notes: "",
};

function App() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exerciseForm, setExerciseForm] = useState<ExerciseForm>(emptyExerciseForm);
  const [workoutForm, setWorkoutForm] = useState<WorkoutForm>(emptyWorkoutForm);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | "all">("all");
  const [selectedExerciseId, setSelectedExerciseId] = useState("all");
  const [selectedSetType, setSelectedSetType] = useState<SetType | "all">("all");
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [chartMode, setChartMode] = useState<ChartMode>("both");
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [selectedExerciseDetailId, setSelectedExerciseDetailId] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(hasAuthToken);
  const [isLoading, setIsLoading] = useState(hasAuthToken);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);
      const [loadedExercises, loadedWorkouts] = await Promise.all([
        getExercises(),
        getWorkouts(),
      ]);
      setExercises([...loadedExercises].sort(sortExercises));
      setWorkouts([...loadedWorkouts].sort(sortWorkouts));
      setWorkoutForm((form) => ({
        ...form,
        exercise_id: form.exercise_id || loadedExercises[0]?.id.toString() || "",
      }));
    } catch (err) {
      if (errorMessage(err) === "Unauthorized") {
        clearAuthToken();
        setIsAuthenticated(false);
        setError(null);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated]);

  function handleLogin(username: string, password: string) {
    setBasicAuthCredentials(username, password);
    setIsAuthenticated(true);
  }

  function handleLogout() {
    clearAuthToken();
    setIsAuthenticated(false);
    setExercises([]);
    setWorkouts([]);
    setError(null);
  }

  async function handleExerciseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: ExercisePayload = {
      name: exerciseForm.name.trim(),
      muscle_group: exerciseForm.muscle_group.trim(),
      category: exerciseForm.category,
    };

    if (!payload.name || !payload.muscle_group) {
      setError("Exercise name and muscle group are required.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const savedExercise = editingExerciseId
        ? await updateExercise(editingExerciseId, payload)
        : await createExercise(payload);

      setExercises((current) => {
        if (!editingExerciseId) {
          return [...current, savedExercise].sort(sortExercises);
        }

        return current.map((exercise) =>
          exercise.id === savedExercise.id ? savedExercise : exercise,
        );
      });
      setWorkouts((current) =>
        current.map((workout) =>
          workout.exercise.id === savedExercise.id
            ? { ...workout, exercise: savedExercise }
            : workout,
        ),
      );
      setExerciseForm(emptyExerciseForm);
      setEditingExerciseId(null);
      setWorkoutForm((form) => ({
        ...form,
        exercise_id: form.exercise_id || savedExercise.id.toString(),
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleWorkoutSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedDate = normalizeDateInput(workoutForm.date);

    if (normalizedDate === null) {
      setError("Date must use YYYY-MM-DD or YYYYMMDD format.");
      return;
    }

    const payload = buildWorkoutPayload({ ...workoutForm, date: normalizedDate });

    if (!payload.exercise_id || payload.weight <= 0 || payload.reps <= 0) {
      setError("Exercise, weight, and reps are required for a workout set.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const savedWorkout = editingWorkoutId
        ? await updateWorkout(editingWorkoutId, payload)
        : await createWorkout(payload);

      setWorkouts((current) => {
        if (!editingWorkoutId) {
          return [savedWorkout, ...current].sort(sortWorkouts);
        }

        return current
          .map((workout) =>
            workout.id === savedWorkout.id ? savedWorkout : workout,
          )
          .sort(sortWorkouts);
      });
      setWorkoutForm({
        ...emptyWorkoutForm,
        date: normalizedDate,
        day: workoutForm.day,
        exercise_id: workoutForm.exercise_id,
        set_number: String(Number(workoutForm.set_number || 0) + 1),
        weight_unit: workoutForm.weight_unit,
      });
      setEditingWorkoutId(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteExercise(id: number) {
    if (!confirm("Delete this exercise and its linked workouts?")) {
      return;
    }

    try {
      setError(null);
      await deleteExercise(id);
      setExercises((current) => current.filter((exercise) => exercise.id !== id));
      setWorkouts((current) => current.filter((workout) => workout.exercise.id !== id));
      if (editingExerciseId === id) {
        setEditingExerciseId(null);
        setExerciseForm(emptyExerciseForm);
      }
      if (selectedExerciseDetailId === id) {
        setSelectedExerciseDetailId(null);
        setActiveView("exercises");
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDeleteWorkout(id: number) {
    try {
      setError(null);
      await deleteWorkout(id);
      setWorkouts((current) => current.filter((workout) => workout.id !== id));
      if (editingWorkoutId === id) {
        setEditingWorkoutId(null);
        setWorkoutForm(emptyWorkoutForm);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function startExerciseEdit(exercise: Exercise) {
    setEditingExerciseId(exercise.id);
    setActiveView("exercises");
    setExerciseForm({
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      category: normalizeCategory(exercise.category),
    });
  }

  function openExerciseDetail(exercise: Exercise) {
    setSelectedExerciseDetailId(exercise.id);
    setActiveView("exercise-detail");
  }

  function startWorkoutEdit(workout: Workout) {
    setEditingWorkoutId(workout.id);
    setActiveView("log");
    setWorkoutForm({
      date: workout.date,
      day: normalizeDay(workout.day),
      exercise_id: workout.exercise.id.toString(),
      set_number: workout.set_number.toString(),
      weight: workout.weight.toString(),
      weight_unit: "kg",
      reps: workout.reps.toString(),
      reps_in_reserve: workout.reps_in_reserve?.toString() ?? "",
      set_type: normalizeSetType(workout.set_type),
      notes: workout.notes ?? "",
    });
  }

  function applyTargetSet(exercise: Exercise, set: Workout, target: PlannerTarget) {
    setWorkoutForm((form) => ({
      ...form,
      day: normalizeDay(set.day),
      exercise_id: exercise.id.toString(),
      set_number: set.set_number.toString(),
      weight: target.weight.toString(),
      weight_unit: "kg",
      reps: target.reps.toString(),
      reps_in_reserve: set.reps_in_reserve?.toString() ?? "",
      set_type: "working",
      notes: form.notes,
    }));
  }

  const filteredWorkouts = workouts
    .filter((workout) => selectedDay === "all" || workout.day === selectedDay)
    .filter((workout) => selectedExerciseId === "all" || workout.exercise.id === Number(selectedExerciseId))
    .filter((workout) => selectedSetType === "all" || workout.set_type === selectedSetType)
    .filter((workout) => workoutMatchesSearch(workout, workoutSearch))
    .toSorted(sortWorkouts);
  const workingSets = workouts.filter((workout) => workout.set_type === "working");
  const totalVolume = workingSets.reduce((sum, workout) => sum + workout.volume, 0);
  const topSet = workingSets.toSorted((a, b) => b.estimated_one_rep_max - a.estimated_one_rep_max)[0];
  const workoutPreview = buildWorkoutPreview(workoutForm);
  const selectedPlannerExercise = exercises.find((exercise) => exercise.id === Number(workoutForm.exercise_id));
  const selectedPlannerSessions = selectedPlannerExercise
    ? buildExerciseSessions(selectedPlannerExercise, workouts)
    : [];
  const currentPlannerSessionDate = normalizeDateInput(workoutForm.date) || todayDateString();
  const referencePlannerSessions = selectedPlannerSessions.filter(
    (session) => session.date !== currentPlannerSessionDate || session.day !== workoutForm.day,
  );
  const lastPlannerSession = referencePlannerSessions[0];
  const previousPlannerSession = referencePlannerSessions[1];
  const overallProgress = buildOverallProgress(workouts);
  const selectedExerciseDetail = exercises.find((exercise) => exercise.id === selectedExerciseDetailId);
  const selectedExerciseDetailWorkouts = selectedExerciseDetail
    ? workouts.filter((workout) => workout.exercise.id === selectedExerciseDetail.id).toSorted(sortWorkouts)
    : [];
  const selectedExerciseDetailWorkingSets = selectedExerciseDetailWorkouts.filter((workout) => workout.set_type === "working");
  const selectedExerciseDetailProgress = selectedExerciseDetail
    ? buildExerciseProgress(selectedExerciseDetail, workouts)
    : [];
  const selectedExerciseDetailSessions = selectedExerciseDetail
    ? buildExerciseSessions(selectedExerciseDetail, workouts)
    : [];
  const selectedExerciseDetailVolume = selectedExerciseDetailWorkingSets.reduce((sum, workout) => sum + workout.volume, 0);
  const selectedExerciseDetailMaxWeight = selectedExerciseDetailWorkingSets.reduce((max, workout) => Math.max(max, workout.weight), 0);
  const selectedExerciseDetailBestOneRepMax = selectedExerciseDetailWorkingSets.reduce((max, workout) => Math.max(max, workout.estimated_one_rep_max), 0);
  const activeFilterCount = [
    selectedDay !== "all",
    selectedExerciseId !== "all",
    selectedSetType !== "all",
    workoutSearch.trim() !== "",
  ].filter(Boolean).length;

  return (
    <main className="app-shell">
      {!isAuthenticated ? <AuthScreen onLogin={handleLogin} /> : null}

      {isAuthenticated ? <>
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Trakr</p>
          <h1>Log hard sets without opening Excel.</h1>
          <p className="hero-copy">
            Track exercises, push/pull/leg days, working-set volume, and estimated strength from one fast screen.
          </p>
        </div>
        <div className="hero-stats" aria-label="Training summary">
          <StatCard label="Exercises" value={exercises.length.toString()} />
          <StatCard label="Logged sets" value={workouts.length.toString()} />
          <StatCard label="Working volume" value={formatNumber(totalVolume)} />
          <StatCard label="Best est. 1RM" value={topSet ? `${formatNumber(topSet.estimated_one_rep_max)} kg` : "-"} />
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <nav className="app-nav" aria-label="Main navigation">
        {([
          ["dashboard", "Dashboard"],
          ["log", "Log set"],
          ["exercises", "Exercises"],
          ["history", "History"],
        ] as const).map(([view, label]) => (
          <button
            className={activeView === view || (view === "exercises" && activeView === "exercise-detail") ? "nav-button active" : "nav-button"}
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
          >
            {label}
          </button>
        ))}
        <button className="nav-button logout-button" type="button" onClick={handleLogout}>
          Logout
        </button>
      </nav>

      {activeView === "dashboard" ? <section className="panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Overall progress</p>
            <h2>Total training trend</h2>
          </div>
          <div className="panel-tools">
            <div className="filter-row compact" aria-label="Overall chart metric">
              {(["both", "volume", "weight"] as const).map((mode) => (
                <button
                  className={chartMode === mode ? "filter-button active" : "filter-button"}
                  key={mode}
                  type="button"
                  onClick={() => setChartMode(mode)}
                >
                  {mode === "weight" ? "max weight" : mode}
                </button>
              ))}
            </div>
            <span className="pill">running best</span>
          </div>
        </div>
        <ProgressChart mode={chartMode} points={overallProgress} title="Overall" />
      </section> : null}

      {activeView === "exercises" || activeView === "log" ? <section className="workspace-grid single-panel">
        {activeView === "exercises" ? (
        <div className="panel form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Exercise library</p>
              <h2>{editingExerciseId ? "Edit exercise" : "Add exercise"}</h2>
            </div>
            {editingExerciseId ? (
              <button className="ghost-button" type="button" onClick={() => {
                setEditingExerciseId(null);
                setExerciseForm(emptyExerciseForm);
              }}>
                Cancel
              </button>
            ) : null}
          </div>

          <form className="stack-form" onSubmit={handleExerciseSubmit}>
            <label>
              Name
              <input
                value={exerciseForm.name}
                onChange={(event) => setExerciseForm({ ...exerciseForm, name: event.target.value })}
                placeholder="Bench press"
              />
            </label>
            <label>
              Muscle group
              <input
                value={exerciseForm.muscle_group}
                onChange={(event) => setExerciseForm({ ...exerciseForm, muscle_group: event.target.value })}
                placeholder="Chest"
              />
            </label>
            <label>
              Category
              <select
                value={exerciseForm.category}
                onChange={(event) => setExerciseForm({ ...exerciseForm, category: event.target.value as ExerciseCategory })}
              >
                <option value="compound">Compound</option>
                <option value="isolation">Isolation</option>
              </select>
            </label>
            <button disabled={isSaving} type="submit">
              {editingExerciseId ? "Save exercise" : "Create exercise"}
            </button>
          </form>
        </div>
        ) : null}

        {activeView === "log" ? (
        <>
        <div className="panel form-panel workout-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Workout log</p>
              <h2>{editingWorkoutId ? "Edit set" : "Log a set"}</h2>
            </div>
            {editingWorkoutId ? (
              <button className="ghost-button" type="button" onClick={() => {
                setEditingWorkoutId(null);
                setWorkoutForm(emptyWorkoutForm);
              }}>
                Cancel
              </button>
            ) : null}
          </div>

          <form className="stack-form workout-form" onSubmit={handleWorkoutSubmit}>
            <label>
              Date
              <div className="date-input-row">
                <input
                  inputMode="numeric"
                  placeholder="YYYYMMDD"
                  value={workoutForm.date}
                  onChange={(event) => setWorkoutForm({ ...workoutForm, date: event.target.value })}
                />
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setWorkoutForm({ ...workoutForm, date: todayDateString() })}
                >
                  Today
                </button>
              </div>
              <span className="field-hint">Example: 20260726 also works.</span>
            </label>
            <label>
              Day
              <select
                value={workoutForm.day}
                onChange={(event) => setWorkoutForm({ ...workoutForm, day: event.target.value as WorkoutDay })}
              >
                <option value="push">Push</option>
                <option value="pull">Pull</option>
                <option value="leg">Leg</option>
              </select>
            </label>
            <label className="wide-field">
              Exercise
              <select
                value={workoutForm.exercise_id}
                onChange={(event) => setWorkoutForm({ ...workoutForm, exercise_id: event.target.value })}
                disabled={exercises.length === 0}
              >
                <option value="">Select exercise</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Set
              <input
                min="1"
                type="number"
                value={workoutForm.set_number}
                onChange={(event) => setWorkoutForm({ ...workoutForm, set_number: event.target.value })}
              />
            </label>
            <label>
              Weight
              <input
                min="0"
                step="0.5"
                type="number"
                value={workoutForm.weight}
                onChange={(event) => setWorkoutForm({ ...workoutForm, weight: event.target.value })}
                placeholder={workoutForm.weight_unit === "kg" ? "100" : "225"}
              />
            </label>
            <label>
              Unit
              <select
                value={workoutForm.weight_unit}
                onChange={(event) => setWorkoutForm({ ...workoutForm, weight_unit: event.target.value as WeightUnit })}
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </label>
            <label>
              Reps
              <input
                min="1"
                type="number"
                value={workoutForm.reps}
                onChange={(event) => setWorkoutForm({ ...workoutForm, reps: event.target.value })}
                placeholder="8"
              />
            </label>
            <label>
              RIR
              <input
                min="0"
                type="number"
                value={workoutForm.reps_in_reserve}
                onChange={(event) => setWorkoutForm({ ...workoutForm, reps_in_reserve: event.target.value })}
                placeholder="2"
              />
            </label>
            <label>
              Set type
              <select
                value={workoutForm.set_type}
                onChange={(event) => setWorkoutForm({ ...workoutForm, set_type: event.target.value as SetType })}
              >
                <option value="working">Working</option>
                <option value="warm-up">Warm-up</option>
              </select>
            </label>
            <label className="wide-field">
              Notes
              <textarea
                value={workoutForm.notes}
                onChange={(event) => setWorkoutForm({ ...workoutForm, notes: event.target.value })}
                placeholder="Paused reps, form cue, pain, etc."
              />
            </label>

            <div className="preview-card wide-field">
              <span>Preview</span>
              <strong>{formatNumber(workoutPreview.weightKg)} kg saved</strong>
              <strong>{formatNumber(workoutPreview.volume)} volume</strong>
              <strong>{formatNumber(workoutPreview.oneRepMax)} kg est. 1RM</strong>
            </div>

            <button className="wide-field" disabled={isSaving || exercises.length === 0} type="submit">
              {editingWorkoutId ? "Save set" : "Log set"}
            </button>
          </form>
        </div>

        <section className="panel planner-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Beat last session</p>
              <h2>Set planner</h2>
            </div>
            <span className="pill">uses selected exercise</span>
          </div>

          {selectedPlannerExercise && lastPlannerSession ? (
            <div className="planner-content">
              <div className="planner-summary">
                <div>
                  <span>Last session</span>
                  <strong>{lastPlannerSession.date}</strong>
                </div>
                <div>
                  <span>Exercise</span>
                  <strong>{selectedPlannerExercise.name}</strong>
                </div>
                <div>
                  <span>Last volume</span>
                  <strong>{formatNumber(lastPlannerSession.totalVolume)}</strong>
                </div>
                <div>
                  <span>Target volume</span>
                  <strong>{formatNumber(targetSessionVolume(selectedPlannerExercise, lastPlannerSession, previousPlannerSession))}</strong>
                </div>
              </div>

              <div className="planner-table" role="table" aria-label="Last workout set planner">
                <div className="planner-row planner-header" role="row">
                  <span>Set</span>
                  <span>Last</span>
                  <span>Suggestion</span>
                  <span>Why</span>
                  <span>Delta</span>
                  <span></span>
                </div>
                {lastPlannerSession.sets.map((set) => {
                  const previousSet = previousPlannerSession?.sets.find((candidate) => candidate.set_number === set.set_number);
                  const target = buildPlannerTarget(selectedPlannerExercise, set, previousSet);

                  return (
                    <div className="planner-row" key={set.id} role="row">
                      <span>#{set.set_number}</span>
                      <strong>{formatNumber(set.weight)} kg x {set.reps}</strong>
                      <strong>{target.action}: {formatNumber(target.weight)} kg x {target.reps}</strong>
                      <span className="planner-reason">{target.reason}</span>
                      <span className="positive-delta">+{formatNumber(target.deltaVolume)} vol</span>
                      <button className="ghost-button" type="button" onClick={() => applyTargetSet(selectedPlannerExercise, set, target)}>
                        Use target
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState title="No previous working sets" text="Select an exercise with logged working sets to get set-by-set targets." />
          )}
        </section>
        </>
        ) : null}
      </section> : null}

      {activeView === "exercises" || activeView === "history" || activeView === "exercise-detail" ? <section className="content-grid single-panel">
        {activeView === "exercises" ? (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Library</p>
              <h2>Exercises</h2>
            </div>
            <div className="panel-tools">
              <div className="filter-row compact" aria-label="Chart metric">
                {(["both", "volume", "weight"] as const).map((mode) => (
                  <button
                    className={chartMode === mode ? "filter-button active" : "filter-button"}
                    key={mode}
                    type="button"
                    onClick={() => setChartMode(mode)}
                  >
                    {mode === "weight" ? "max weight" : mode}
                  </button>
                ))}
              </div>
              <span className="pill">{exercises.length} total</span>
            </div>
          </div>
          <div className="exercise-list">
            {isLoading ? <EmptyState title="Loading exercises" text="Fetching your library from the backend." /> : null}
            {!isLoading && exercises.length === 0 ? <EmptyState title="No exercises yet" text="Create your first exercise, then log sets against it." /> : null}
            {exercises.map((exercise) => {
              const progress = buildExerciseProgress(exercise, workouts);

              return (
                <article className="exercise-card" key={exercise.id}>
                  <div>
                    <h3>{exercise.name}</h3>
                    <p>{exercise.muscle_group}</p>
                  </div>
                  <span className="pill">{exercise.category}</span>
                  <div className="card-actions">
                    <button className="ghost-button" type="button" onClick={() => openExerciseDetail(exercise)}>Details</button>
                    <button className="ghost-button" type="button" onClick={() => startExerciseEdit(exercise)}>Edit</button>
                    <button className="ghost-button" type="button" onClick={() => {
                      setWorkoutForm((form) => ({ ...form, exercise_id: exercise.id.toString() }));
                      setActiveView("log");
                    }}>Plan</button>
                    <button className="danger-button" type="button" onClick={() => void handleDeleteExercise(exercise.id)}>Delete</button>
                  </div>
                  <ProgressChart mode={chartMode} points={progress} title={exercise.name} />
                </article>
              );
            })}
          </div>
        </div>
        ) : null}

        {activeView === "exercise-detail" ? (
        <div className="panel exercise-detail-panel">
          {selectedExerciseDetail ? (
            <>
              <div className="panel-heading detail-heading">
                <div>
                  <p className="eyebrow">Exercise detail</p>
                  <h2>{selectedExerciseDetail.name}</h2>
                  <p className="detail-subtitle">{selectedExerciseDetail.muscle_group} · {selectedExerciseDetail.category}</p>
                </div>
                <div className="panel-tools">
                  <button className="ghost-button" type="button" onClick={() => setActiveView("exercises")}>Back</button>
                  <button className="ghost-button" type="button" onClick={() => startExerciseEdit(selectedExerciseDetail)}>Edit</button>
                  <button className="ghost-button" type="button" onClick={() => {
                    setWorkoutForm((form) => ({ ...form, exercise_id: selectedExerciseDetail.id.toString() }));
                    setActiveView("log");
                  }}>Plan</button>
                </div>
              </div>

              <div className="detail-metrics metric-strip">
                <Metric label="Working sets" value={selectedExerciseDetailWorkingSets.length.toString()} />
                <Metric label="Volume" value={formatNumber(selectedExerciseDetailVolume)} />
                <Metric label="Max weight" value={selectedExerciseDetailMaxWeight ? `${formatNumber(selectedExerciseDetailMaxWeight)} kg` : "-"} />
                <Metric label="Best est. 1RM" value={selectedExerciseDetailBestOneRepMax ? `${formatNumber(selectedExerciseDetailBestOneRepMax)} kg` : "-"} />
              </div>

              <ProgressChart mode={chartMode} points={selectedExerciseDetailProgress} title={selectedExerciseDetail.name} />

              <div className="detail-grid">
                <section className="detail-section">
                  <div className="detail-section-heading">
                    <h3>Recent sessions</h3>
                    <span className="pill">{selectedExerciseDetailSessions.length} total</span>
                  </div>
                  <div className="session-list">
                    {selectedExerciseDetailSessions.length === 0 ? <EmptyState title="No working sessions" text="Log working sets for this exercise to build a session history." /> : null}
                    {selectedExerciseDetailSessions.slice(0, 6).map((session) => (
                      <article className="session-card" key={`${session.date}-${session.day}`}>
                        <div>
                          <strong>{session.date}</strong>
                          <span>{session.day} · {session.sets.length} sets</span>
                        </div>
                        <div>
                          <strong>{formatNumber(session.totalVolume)}</strong>
                          <span>volume</span>
                        </div>
                        <div>
                          <strong>{formatNumber(session.maxWeight)} kg</strong>
                          <span>top weight</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="detail-section">
                  <div className="detail-section-heading">
                    <h3>Recent sets</h3>
                    <span className="pill">{selectedExerciseDetailWorkouts.length} logged</span>
                  </div>
                  <div className="set-list">
                    {selectedExerciseDetailWorkouts.length === 0 ? <EmptyState title="No sets yet" text="Log a set for this exercise and it will show up here." /> : null}
                    {selectedExerciseDetailWorkouts.slice(0, 10).map((workout) => (
                      <article className="set-card" key={workout.id}>
                        <div>
                          <strong>{workout.date}</strong>
                          <span>{workout.day} · set {workout.set_number} · {workout.set_type}</span>
                        </div>
                        <span>{formatNumber(workout.weight)} kg x {workout.reps}</span>
                        <button className="ghost-button" type="button" onClick={() => startWorkoutEdit(workout)}>Edit</button>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <EmptyState title="Exercise not found" text="Go back to the library and pick an exercise." />
          )}
        </div>
        ) : null}

        {activeView === "history" ? (
        <div className="panel log-panel">
          <div className="panel-heading log-heading">
            <div>
              <p className="eyebrow">History</p>
              <h2>Workout log</h2>
            </div>
            <span className="pill">{filteredWorkouts.length} shown</span>
          </div>

          <div className="advanced-filters">
            <label className="search-field">
              Search
              <input
                value={workoutSearch}
                onChange={(event) => setWorkoutSearch(event.target.value)}
                placeholder="exercise, note, date..."
              />
            </label>
            <label>
              Exercise
              <select
                value={selectedExerciseId}
                onChange={(event) => setSelectedExerciseId(event.target.value)}
              >
                <option value="all">All exercises</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                ))}
              </select>
            </label>
            <label>
              Set type
              <select
                value={selectedSetType}
                onChange={(event) => setSelectedSetType(event.target.value as SetType | "all")}
              >
                <option value="all">All sets</option>
                <option value="working">Working</option>
                <option value="warm-up">Warm-up</option>
              </select>
            </label>
            <div className="filter-block">
              <span>Day</span>
              <div className="filter-row" aria-label="Filter workouts by day">
                {(["all", "push", "pull", "leg"] as const).map((day) => (
                  <button
                    className={selectedDay === day ? "filter-button active" : "filter-button"}
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="ghost-button reset-button"
              disabled={activeFilterCount === 0}
              type="button"
              onClick={() => {
                setSelectedDay("all");
                setSelectedExerciseId("all");
                setSelectedSetType("all");
                setWorkoutSearch("");
              }}
            >
              Reset filters {activeFilterCount ? `(${activeFilterCount})` : ""}
            </button>
          </div>

          <div className="workout-list">
            {isLoading ? <EmptyState title="Loading workouts" text="Pulling your latest sets." /> : null}
            {!isLoading && filteredWorkouts.length === 0 ? <EmptyState title="No sets here" text="Log a set or change the day filter." /> : null}
            {filteredWorkouts.map((workout) => (
              <article className="workout-row" key={workout.id}>
                <div className="workout-main">
                  <span className={`day-badge ${workout.day}`}>{workout.day}</span>
                  <div>
                    <h3>{workout.exercise.name}</h3>
                    <p>{workout.date} · set {workout.set_number} · {workout.set_type}</p>
                  </div>
                </div>
                <div className="metric-strip">
                  <Metric label="Weight" value={`${formatNumber(workout.weight)} kg`} />
                  <Metric label="Reps" value={workout.reps.toString()} />
                  <Metric label="Volume" value={formatNumber(workout.volume)} />
                  <Metric label="Est. 1RM" value={`${formatNumber(workout.estimated_one_rep_max)} kg`} />
                </div>
                {workout.notes ? <p className="notes">{workout.notes}</p> : null}
                <div className="card-actions workout-actions">
                  <button className="ghost-button" type="button" onClick={() => startWorkoutEdit(workout)}>Edit</button>
                  <button className="danger-button" type="button" onClick={() => void handleDeleteWorkout(workout.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </div>
        ) : null}
      </section> : null}
      </> : null}
    </main>
  );
}

function AuthScreen({ onLogin }: { onLogin: (username: string, password: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="auth-shell">
      <form
        className="auth-card"
        onSubmit={(event) => {
          event.preventDefault();
          onLogin(username, password);
        }}
      >
        <p className="eyebrow">Private Trakr</p>
        <h1>Login</h1>
        <label>
          Username
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />
        </label>
        <button disabled={!username || !password} type="submit">Enter</button>
      </form>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function ProgressChart({
  mode,
  points,
  title,
}: {
  mode: ChartMode;
  points: ExerciseProgressPoint[];
  title: string;
}) {
  const latest = points.at(-1);
  const first = points[0];
  const volumePoints = chartPoints(points, (point) => point.volume);
  const weightPoints = chartPoints(points, (point) => point.maxWeight);
  const showVolume = mode === "both" || mode === "volume";
  const showWeight = mode === "both" || mode === "weight";

  if (!latest) {
    return (
      <div className="progress-chart chart-empty">
        <span>No working-set data yet</span>
      </div>
    );
  }

  return (
    <div className="progress-chart">
      <div className="chart-heading">
        <span>{title}</span>
        <div className="chart-legend">
          {showVolume ? <span className="volume-dot">Volume</span> : null}
          {showWeight ? <span className="weight-dot">Max weight</span> : null}
        </div>
      </div>
      <svg className="chart-svg" viewBox="0 0 640 220" role="img" aria-label="Exercise progress chart">
        <line className="chart-grid" x1="0" x2="640" y1="42" y2="42" />
        <line className="chart-grid" x1="0" x2="640" y1="110" y2="110" />
        <line className="chart-grid" x1="0" x2="640" y1="178" y2="178" />
        {showVolume ? <polyline className="volume-line" points={chartLine(volumePoints)} /> : null}
        {showWeight ? <polyline className="weight-line" points={chartLine(weightPoints)} /> : null}
        {showVolume ? volumePoints.map((point, index) => (
          <circle className="volume-point" cx={point.x} cy={point.y} key={`volume-${index}`} r="4.5" />
        )) : null}
        {showWeight ? weightPoints.map((point, index) => (
          <circle className="weight-point" cx={point.x} cy={point.y} key={`weight-${index}`} r="4.5" />
        )) : null}
      </svg>
      <div className="chart-meta">
        <span>{points[0].date}</span>
        <strong>{chartSummary(mode, first, latest)}</strong>
        <span>{latest.date}</span>
      </div>
    </div>
  );
}

function buildWorkoutPayload(form: WorkoutForm): WorkoutPayload {
  const weightKg = convertWeightToKilograms(Number(form.weight), form.weight_unit);

  return {
    date: form.date || undefined,
    day: form.day,
    exercise_id: Number(form.exercise_id),
    set_number: Number(form.set_number || 1),
    weight: weightKg,
    reps: Number(form.reps),
    reps_in_reserve: form.reps_in_reserve === "" ? null : Number(form.reps_in_reserve),
    set_type: form.set_type,
    notes: form.notes.trim() || null,
  };
}

function buildWorkoutPreview(form: WorkoutForm) {
  const weight = convertWeightToKilograms(Number(form.weight || 0), form.weight_unit);
  const reps = Number(form.reps || 0);

  if (form.set_type !== "working") {
    return { volume: 0, oneRepMax: 0, weightKg: weight };
  }

  return {
    volume: weight * reps,
    oneRepMax: weight * (1 + reps / 30),
    weightKg: weight,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function chartSummary(mode: ChartMode, first: ExerciseProgressPoint, latest: ExerciseProgressPoint) {
  if (mode === "volume") {
    return `${formatNumber(latest.volume)} vol ${formatDelta(latest.volume - first.volume)}`;
  }

  if (mode === "weight") {
    return `${formatNumber(latest.maxWeight)} kg ${formatDelta(latest.maxWeight - first.maxWeight)}`;
  }

  return `${formatNumber(latest.volume)} vol ${formatDelta(latest.volume - first.volume)} · ${formatNumber(latest.maxWeight)} kg ${formatDelta(latest.maxWeight - first.maxWeight)}`;
}

function formatDelta(value: number) {
  if (value === 0) {
    return "(+0)";
  }

  return `(${value > 0 ? "+" : ""}${formatNumber(value)})`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
  }).format(value);
}

function convertWeightToKilograms(weight: number, unit: WeightUnit) {
  if (!Number.isFinite(weight)) {
    return 0;
  }

  if (unit === "lbs") {
    return weight / POUNDS_PER_KILOGRAM;
  }

  return weight;
}

function todayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDateInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const dateString = /^\d{8}$/.test(trimmedValue)
    ? `${trimmedValue.slice(0, 4)}-${trimmedValue.slice(4, 6)}-${trimmedValue.slice(6, 8)}`
    : trimmedValue;

  return isValidDateString(dateString) ? dateString : null;
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function normalizeCategory(value: string): ExerciseCategory {
  return value === "isolation" ? "isolation" : "compound";
}

function normalizeDay(value: string): WorkoutDay {
  if (value === "pull" || value === "leg") {
    return value;
  }

  return "push";
}

function normalizeSetType(value: string): SetType {
  return value === "warm-up" ? "warm-up" : "working";
}

function sortExercises(a: Exercise, b: Exercise) {
  return a.name.localeCompare(b.name);
}

function sortWorkouts(a: Workout, b: Workout) {
  return b.date.localeCompare(a.date) || b.id - a.id;
}

function buildExerciseProgress(exercise: Exercise, workouts: Workout[]) {
  const dailyProgress = new Map<string, ExerciseProgressPoint>();

  for (const workout of workouts) {
    if (workout.exercise.id !== exercise.id || workout.set_type !== "working") {
      continue;
    }

    const current = dailyProgress.get(workout.date) ?? {
      date: workout.date,
      volume: 0,
      maxWeight: 0,
    };

    current.volume += workout.volume;
    current.maxWeight = Math.max(current.maxWeight, workout.weight);
    dailyProgress.set(workout.date, current);
  }

  return [...dailyProgress.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildOverallProgress(workouts: Workout[]) {
  const dailyProgress = new Map<string, ExerciseProgressPoint>();

  for (const workout of workouts) {
    if (workout.set_type !== "working") {
      continue;
    }

    const current = dailyProgress.get(workout.date) ?? {
      date: workout.date,
      volume: 0,
      maxWeight: 0,
    };

    current.volume += workout.volume;
    current.maxWeight = Math.max(current.maxWeight, workout.weight);
    dailyProgress.set(workout.date, current);
  }

  let bestVolume = 0;
  let bestWeight = 0;

  return [...dailyProgress.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point) => {
      bestVolume = Math.max(bestVolume, point.volume);
      bestWeight = Math.max(bestWeight, point.maxWeight);

      return {
        date: point.date,
        volume: bestVolume,
        maxWeight: bestWeight,
      };
    });
}

function buildExerciseSessions(exercise: Exercise, workouts: Workout[]) {
  const sessions = new Map<string, ExerciseSession>();

  for (const workout of workouts) {
    if (workout.exercise.id !== exercise.id || workout.set_type !== "working") {
      continue;
    }

    const key = `${workout.date}-${workout.day}`;
    const current = sessions.get(key) ?? {
      date: workout.date,
      day: workout.day,
      exercise,
      sets: [],
      totalVolume: 0,
      maxWeight: 0,
    };

    current.sets.push(workout);
    current.totalVolume += workout.volume;
    current.maxWeight = Math.max(current.maxWeight, workout.weight);
    sessions.set(key, current);
  }

  return [...sessions.values()]
    .map((session) => ({
      ...session,
      sets: session.sets.toSorted((a, b) => a.set_number - b.set_number),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function targetSessionVolume(
  exercise: Exercise,
  session: ExerciseSession,
  previousSession: ExerciseSession | undefined,
) {
  return session.sets.reduce((sum, set) => {
    const previousSet = previousSession?.sets.find((candidate) => candidate.set_number === set.set_number);
    return sum + buildPlannerTarget(exercise, set, previousSet).volume;
  }, 0);
}

function buildPlannerTarget(
  exercise: Exercise,
  set: Workout,
  previousSet: Workout | undefined,
): PlannerTarget {
  const increment = suggestedWeightIncrement(exercise, set.weight);
  const improvedVsPrevious = previousSet ? set.volume > previousSet.volume : true;
  let weight = set.weight;
  let reps = set.reps + 1;
  let action = "Add reps";
  let reason = "Smallest reliable progression: same weight, one extra rep.";

  if (previousSet && !improvedVsPrevious) {
    reason = "You have not beaten the comparable set before this yet.";
  } else if ((set.reps_in_reserve ?? 0) >= 3 && set.reps >= 6) {
    weight = roundToHalf(set.weight + increment);
    reps = set.reps;
    action = "Raise weight";
    reason = `RIR ${set.reps_in_reserve} suggests the set had room to load more.`;
  } else if (set.reps >= 10) {
    weight = roundToHalf(set.weight + increment);
    reps = Math.max(6, set.reps - 2);
    action = "Raise weight";
    reason = `High reps hit; use a ${formatNumber(increment)} kg jump and keep quality.`;
  } else if (set.reps <= 5) {
    reps = set.reps + 2;
    action = "Build reps";
    reason = "Low-rep set: build the rep base before loading heavier.";
  }

  while (weight * reps <= set.volume) {
    reps += 1;
  }

  const volume = weight * reps;

  return {
    weight,
    reps,
    volume,
    deltaVolume: volume - set.volume,
    action,
    reason,
  };
}

function suggestedWeightIncrement(exercise: Exercise, weight: number) {
  if (weight < 10) {
    return 0.5;
  }

  if (exercise.category.toLocaleLowerCase() === "isolation") {
    return 1;
  }

  if (weight >= 80) {
    return 5;
  }

  return 2.5;
}

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
}

function workoutMatchesSearch(workout: Workout, search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    workout.exercise.name,
    workout.exercise.muscle_group,
    workout.exercise.category,
    workout.date,
    workout.day,
    workout.set_type,
    workout.notes ?? "",
  ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
}

function chartPoints(
  points: ExerciseProgressPoint[],
  valueForPoint: (point: ExerciseProgressPoint) => number,
) {
  const values = points.map(valueForPoint);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const width = 600;
  const height = 170;
  const left = 20;
  const top = 24;
  const step = points.length > 1 ? width / (points.length - 1) : 0;

  return values.map((value, index) => {
      const x = points.length > 1 ? left + index * step : left + width / 2;
      const y = top + height - ((value - min) / range) * height;

      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });
}

function chartLine(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export default App;
