const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000";
const AUTH_TOKEN_KEY = "trakr-basic-auth";

export type ExerciseCategory = "isolation" | "compound";
export type WorkoutDay = "push" | "pull" | "leg";
export type SetType = "warm-up" | "working";

export type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  category: ExerciseCategory | string;
};

export type ExercisePayload = {
  name: string;
  muscle_group: string;
  category: ExerciseCategory;
};

export type Workout = {
  id: number;
  date: string;
  day: WorkoutDay | string;
  exercise: Exercise;
  set_number: number;
  weight: number;
  reps: number;
  reps_in_reserve: number | null;
  set_type: SetType | string;
  volume: number;
  estimated_one_rep_max: number;
  notes: string | null;
};

export type WorkoutPayload = {
  date?: string;
  day: WorkoutDay;
  exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
  reps_in_reserve: number | null;
  set_type: SetType;
  notes: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authToken = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Basic ${authToken}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }

    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function hasAuthToken() {
  return Boolean(getAuthToken());
}

export function setBasicAuthCredentials(username: string, password: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, window.btoa(`${username}:${password}`));
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getExercises() {
  return request<Exercise[]>("/exercises");
}

export function createExercise(payload: ExercisePayload) {
  return request<Exercise>("/exercises", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExercise(id: number, payload: ExercisePayload) {
  return request<Exercise>(`/exercises/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteExercise(id: number) {
  return request<void>(`/exercises/${id}`, { method: "DELETE" });
}

export function getWorkouts() {
  return request<Workout[]>("/workouts");
}

export function createWorkout(payload: WorkoutPayload) {
  return request<Workout>("/workouts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWorkout(id: number, payload: WorkoutPayload) {
  return request<Workout>(`/workouts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteWorkout(id: number) {
  return request<void>(`/workouts/${id}`, { method: "DELETE" });
}
