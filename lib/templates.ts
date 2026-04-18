export type ExerciseConfig = {
  name: string;
  sets: number;
  reps: string;       // "6", "AMRAP", "30 sec", "400m", etc.
  restSeconds: number;
  notes?: string;
};

export type ProgramDay = {
  dayOfWeek: number;  // 0=Sun … 6=Sat
  name: string;
  isRest: boolean;
  exercises: ExerciseConfig[];
};

export type ProgramTemplate = {
  id: string;
  name: string;
  tagline: string;
  daysPerWeek: number;
  focus: string;
  days: ProgramDay[];
};

export const TEMPLATES: ProgramTemplate[] = [
  // ── Runner ───────────────────────────────────────────────────────────────
  {
    id: "runner",
    name: "Runner",
    tagline: "Aerobic base + strength support",
    daysPerWeek: 5,
    focus: "Endurance",
    days: [
      { dayOfWeek: 0, name: "Rest",       isRest: true,  exercises: [] },
      {
        dayOfWeek: 1, name: "Easy Run", isRest: false,
        exercises: [
          { name: "Easy Run", sets: 1, reps: "30 min", restSeconds: 0 },
        ],
      },
      {
        dayOfWeek: 2, name: "Strength A", isRest: false,
        exercises: [
          { name: "Back Squat",    sets: 3, reps: "5", restSeconds: 180 },
          { name: "Overhead Press",sets: 3, reps: "5", restSeconds: 180 },
          { name: "Pull-Up",       sets: 3, reps: "5", restSeconds: 120 },
          { name: "Plank",         sets: 3, reps: "45 sec", restSeconds: 60 },
        ],
      },
      {
        dayOfWeek: 3, name: "Tempo Run", isRest: false,
        exercises: [
          { name: "Tempo Run", sets: 1, reps: "20 min", restSeconds: 0 },
        ],
      },
      {
        dayOfWeek: 4, name: "Strength B", isRest: false,
        exercises: [
          { name: "Deadlift",   sets: 3, reps: "5", restSeconds: 180 },
          { name: "Bench Press",sets: 3, reps: "5", restSeconds: 180 },
          { name: "Barbell Row",sets: 3, reps: "5", restSeconds: 120 },
        ],
      },
      {
        dayOfWeek: 5, name: "Intervals", isRest: false,
        exercises: [
          { name: "Intervals", sets: 6, reps: "400m", restSeconds: 90 },
        ],
      },
      {
        dayOfWeek: 6, name: "Long Run", isRest: false,
        exercises: [
          { name: "Long Run", sets: 1, reps: "50 min", restSeconds: 0 },
        ],
      },
    ],
  },

  // ── Calisthenics ─────────────────────────────────────────────────────────
  {
    id: "calisthenics",
    name: "Calisthenics",
    tagline: "Bodyweight strength — 4 days",
    daysPerWeek: 4,
    focus: "Bodyweight Strength",
    days: [
      { dayOfWeek: 0, name: "Rest",  isRest: true,  exercises: [] },
      {
        dayOfWeek: 1, name: "Push", isRest: false,
        exercises: [
          { name: "Push-Up",         sets: 4, reps: "15",     restSeconds: 60 },
          { name: "Diamond Push-Up", sets: 3, reps: "10",     restSeconds: 60 },
          { name: "Dip",             sets: 3, reps: "10",     restSeconds: 90 },
          { name: "Pike Push-Up",    sets: 3, reps: "10",     restSeconds: 60 },
          { name: "Hollow Body Hold",sets: 3, reps: "30 sec", restSeconds: 45 },
        ],
      },
      {
        dayOfWeek: 2, name: "Pull", isRest: false,
        exercises: [
          { name: "Pull-Up",        sets: 4, reps: "6",  restSeconds: 120 },
          { name: "Chin-Up",        sets: 3, reps: "8",  restSeconds: 90  },
          { name: "Inverted Row",   sets: 3, reps: "12", restSeconds: 60  },
          { name: "Hanging Leg Raise", sets: 3, reps: "10", restSeconds: 60 },
        ],
      },
      { dayOfWeek: 3, name: "Rest", isRest: true, exercises: [] },
      {
        dayOfWeek: 4, name: "Legs + Core", isRest: false,
        exercises: [
          { name: "Bodyweight Squat", sets: 4, reps: "20",     restSeconds: 60 },
          { name: "Lunge",            sets: 3, reps: "12 each",restSeconds: 60 },
          { name: "Pistol Squat",     sets: 3, reps: "5 each", restSeconds: 90 },
          { name: "Glute Bridge",     sets: 3, reps: "20",     restSeconds: 45 },
          { name: "Plank",            sets: 3, reps: "60 sec", restSeconds: 45 },
          { name: "V-Up",             sets: 3, reps: "12",     restSeconds: 45 },
        ],
      },
      {
        dayOfWeek: 5, name: "Full Body", isRest: false,
        exercises: [
          { name: "Burpee",          sets: 5, reps: "10",   restSeconds: 60 },
          { name: "Pull-Up",         sets: 3, reps: "AMRAP",restSeconds: 90 },
          { name: "Push-Up",         sets: 3, reps: "AMRAP",restSeconds: 60 },
          { name: "Box Jump",        sets: 3, reps: "10",   restSeconds: 60 },
          { name: "Mountain Climber",sets: 3, reps: "30 sec",restSeconds: 45 },
        ],
      },
      { dayOfWeek: 6, name: "Rest", isRest: true, exercises: [] },
    ],
  },

  // ── Body Builder ─────────────────────────────────────────────────────────
  {
    id: "bodybuilder",
    name: "Body Builder",
    tagline: "Push / Pull / Legs — 5 days",
    daysPerWeek: 5,
    focus: "Hypertrophy",
    days: [
      { dayOfWeek: 0, name: "Rest", isRest: true, exercises: [] },
      {
        dayOfWeek: 1, name: "Push", isRest: false,
        exercises: [
          { name: "Bench Press",         sets: 4, reps: "6",  restSeconds: 180 },
          { name: "Overhead Press",      sets: 3, reps: "8",  restSeconds: 150 },
          { name: "Incline Dumbbell Press", sets: 3, reps: "10", restSeconds: 90 },
          { name: "Lateral Raise",       sets: 3, reps: "15", restSeconds: 60  },
          { name: "Tricep Pushdown",     sets: 3, reps: "12", restSeconds: 60  },
        ],
      },
      {
        dayOfWeek: 2, name: "Pull", isRest: false,
        exercises: [
          { name: "Deadlift",    sets: 3, reps: "5",  restSeconds: 180 },
          { name: "Barbell Row", sets: 4, reps: "8",  restSeconds: 150 },
          { name: "Pull-Up",     sets: 3, reps: "8",  restSeconds: 120 },
          { name: "Barbell Curl",sets: 3, reps: "10", restSeconds: 60  },
          { name: "Face Pull",   sets: 3, reps: "15", restSeconds: 60  },
        ],
      },
      {
        dayOfWeek: 3, name: "Legs", isRest: false,
        exercises: [
          { name: "Back Squat",        sets: 4, reps: "6",  restSeconds: 180 },
          { name: "Romanian Deadlift", sets: 3, reps: "10", restSeconds: 150 },
          { name: "Leg Press",         sets: 3, reps: "12", restSeconds: 90  },
          { name: "Leg Curl",          sets: 3, reps: "12", restSeconds: 60  },
          { name: "Calf Raise",        sets: 4, reps: "15", restSeconds: 60  },
        ],
      },
      { dayOfWeek: 4, name: "Rest", isRest: true, exercises: [] },
      {
        dayOfWeek: 5, name: "Upper", isRest: false,
        exercises: [
          { name: "Incline Bench Press", sets: 4, reps: "8",  restSeconds: 150 },
          { name: "Barbell Row",         sets: 4, reps: "8",  restSeconds: 150 },
          { name: "Overhead Press",      sets: 3, reps: "10", restSeconds: 120 },
          { name: "Dumbbell Curl",       sets: 3, reps: "12", restSeconds: 60  },
          { name: "Skull Crusher",       sets: 3, reps: "12", restSeconds: 60  },
        ],
      },
      {
        dayOfWeek: 6, name: "Lower", isRest: false,
        exercises: [
          { name: "Front Squat",       sets: 4, reps: "6",  restSeconds: 180 },
          { name: "Romanian Deadlift", sets: 3, reps: "8",  restSeconds: 150 },
          { name: "Leg Press",         sets: 3, reps: "15", restSeconds: 90  },
          { name: "Hanging Leg Raise", sets: 3, reps: "12", restSeconds: 60  },
          { name: "Calf Raise",        sets: 4, reps: "20", restSeconds: 45  },
        ],
      },
    ],
  },
];
