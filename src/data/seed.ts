import { nanoid } from 'nanoid';
import type { Exercise, Stretch } from '@/types';
import { db } from './db';

const now = Date.now();

const defaultExercises: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Chest
  { name: 'Bench Press', muscleGroups: ['chest', 'triceps', 'shoulders'], category: 'barbell', isCustom: false },
  { name: 'Incline Bench Press', muscleGroups: ['chest', 'shoulders'], category: 'barbell', isCustom: false },
  { name: 'Dumbbell Fly', muscleGroups: ['chest'], category: 'dumbbell', isCustom: false },
  { name: 'Dumbbell Bench Press', muscleGroups: ['chest', 'triceps'], category: 'dumbbell', isCustom: false },
  { name: 'Cable Crossover', muscleGroups: ['chest'], category: 'cable', isCustom: false },
  { name: 'Push-up', muscleGroups: ['chest', 'triceps', 'core'], category: 'bodyweight', isCustom: false },
  { name: 'Chest Dip', muscleGroups: ['chest', 'triceps'], category: 'bodyweight', isCustom: false },

  // Back
  { name: 'Deadlift', muscleGroups: ['back', 'hamstrings', 'glutes'], category: 'barbell', isCustom: false },
  { name: 'Barbell Row', muscleGroups: ['back', 'biceps'], category: 'barbell', isCustom: false },
  { name: 'Pull-up', muscleGroups: ['back', 'biceps'], category: 'bodyweight', isCustom: false },
  { name: 'Chin-up', muscleGroups: ['back', 'biceps'], category: 'bodyweight', isCustom: false },
  { name: 'Lat Pulldown', muscleGroups: ['back', 'biceps'], category: 'cable', isCustom: false },
  { name: 'Seated Cable Row', muscleGroups: ['back'], category: 'cable', isCustom: false },
  { name: 'Dumbbell Row', muscleGroups: ['back', 'biceps'], category: 'dumbbell', isCustom: false },
  { name: 'T-Bar Row', muscleGroups: ['back'], category: 'barbell', isCustom: false },

  // Shoulders
  { name: 'Overhead Press', muscleGroups: ['shoulders', 'triceps'], category: 'barbell', isCustom: false },
  { name: 'Dumbbell Shoulder Press', muscleGroups: ['shoulders', 'triceps'], category: 'dumbbell', isCustom: false },
  { name: 'Lateral Raise', muscleGroups: ['shoulders'], category: 'dumbbell', isCustom: false },
  { name: 'Front Raise', muscleGroups: ['shoulders'], category: 'dumbbell', isCustom: false },
  { name: 'Face Pull', muscleGroups: ['shoulders', 'traps'], category: 'cable', isCustom: false },
  { name: 'Reverse Fly', muscleGroups: ['shoulders', 'back'], category: 'dumbbell', isCustom: false },

  // Legs
  { name: 'Squat', muscleGroups: ['quadriceps', 'glutes', 'core'], category: 'barbell', isCustom: false },
  { name: 'Front Squat', muscleGroups: ['quadriceps', 'core'], category: 'barbell', isCustom: false },
  { name: 'Leg Press', muscleGroups: ['quadriceps', 'glutes'], category: 'machine', isCustom: false },
  { name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], category: 'barbell', isCustom: false },
  { name: 'Leg Curl', muscleGroups: ['hamstrings'], category: 'machine', isCustom: false },
  { name: 'Leg Extension', muscleGroups: ['quadriceps'], category: 'machine', isCustom: false },
  { name: 'Bulgarian Split Squat', muscleGroups: ['quadriceps', 'glutes'], category: 'dumbbell', isCustom: false },
  { name: 'Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], category: 'barbell', isCustom: false },
  { name: 'Calf Raise', muscleGroups: ['calves'], category: 'machine', isCustom: false },
  { name: 'Walking Lunge', muscleGroups: ['quadriceps', 'glutes'], category: 'dumbbell', isCustom: false },

  // Arms
  { name: 'Barbell Curl', muscleGroups: ['biceps'], category: 'barbell', isCustom: false },
  { name: 'Dumbbell Curl', muscleGroups: ['biceps'], category: 'dumbbell', isCustom: false },
  { name: 'Hammer Curl', muscleGroups: ['biceps', 'forearms'], category: 'dumbbell', isCustom: false },
  { name: 'Tricep Pushdown', muscleGroups: ['triceps'], category: 'cable', isCustom: false },
  { name: 'Skull Crusher', muscleGroups: ['triceps'], category: 'barbell', isCustom: false },
  { name: 'Overhead Tricep Extension', muscleGroups: ['triceps'], category: 'dumbbell', isCustom: false },

  // Core
  { name: 'Plank', muscleGroups: ['core'], category: 'bodyweight', isCustom: false },
  { name: 'Hanging Leg Raise', muscleGroups: ['core'], category: 'bodyweight', isCustom: false },
  { name: 'Ab Wheel Rollout', muscleGroups: ['core'], category: 'bodyweight', isCustom: false },
  { name: 'Cable Crunch', muscleGroups: ['core'], category: 'cable', isCustom: false },
  { name: 'Russian Twist', muscleGroups: ['core'], category: 'bodyweight', isCustom: false },
];

const defaultStretches: Omit<Stretch, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Dynamic (pre-workout)
  { name: 'Leg Swings (Front/Back)', category: 'dynamic', targetAreas: ['hamstrings', 'quadriceps'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Leg Swings (Side to Side)', category: 'dynamic', targetAreas: ['glutes', 'hamstrings'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Arm Circles', category: 'dynamic', targetAreas: ['shoulders'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Hip Circles', category: 'dynamic', targetAreas: ['glutes', 'core'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Walking Knee Hugs', category: 'dynamic', targetAreas: ['glutes', 'hamstrings'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'High Knees', category: 'dynamic', targetAreas: ['quadriceps', 'core'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Butt Kicks', category: 'dynamic', targetAreas: ['quadriceps', 'hamstrings'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Inchworm', category: 'dynamic', targetAreas: ['hamstrings', 'core', 'shoulders'], defaultDurationSeconds: 45, isCustom: false },
  { name: 'World\'s Greatest Stretch', category: 'dynamic', targetAreas: ['hamstrings', 'glutes', 'shoulders', 'core'], defaultDurationSeconds: 60, isCustom: false },
  { name: 'Cat-Cow', category: 'dynamic', targetAreas: ['back', 'core'], defaultDurationSeconds: 45, isCustom: false },

  // Static (post-workout)
  { name: 'Standing Hamstring Stretch', category: 'static', targetAreas: ['hamstrings'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Quad Stretch', category: 'static', targetAreas: ['quadriceps'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Pigeon Pose', category: 'static', targetAreas: ['glutes', 'hamstrings'], defaultDurationSeconds: 45, isCustom: false },
  { name: 'Chest Doorway Stretch', category: 'static', targetAreas: ['chest', 'shoulders'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Tricep Overhead Stretch', category: 'static', targetAreas: ['triceps'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Cross-Body Shoulder Stretch', category: 'static', targetAreas: ['shoulders'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Seated Forward Fold', category: 'static', targetAreas: ['hamstrings', 'back'], defaultDurationSeconds: 45, isCustom: false },
  { name: 'Child\'s Pose', category: 'static', targetAreas: ['back', 'shoulders'], defaultDurationSeconds: 45, isCustom: false },
  { name: 'Figure Four Stretch', category: 'static', targetAreas: ['glutes'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Hip Flexor Stretch', category: 'static', targetAreas: ['quadriceps', 'glutes'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Cobra Stretch', category: 'static', targetAreas: ['core', 'back'], defaultDurationSeconds: 30, isCustom: false },
  { name: 'Lat Stretch', category: 'static', targetAreas: ['back'], defaultDurationSeconds: 30, isCustom: false },

  // Foam Roll
  { name: 'Foam Roll Quads', category: 'foam_roll', targetAreas: ['quadriceps'], defaultDurationSeconds: 60, isCustom: false },
  { name: 'Foam Roll IT Band', category: 'foam_roll', targetAreas: ['quadriceps', 'glutes'], defaultDurationSeconds: 60, isCustom: false },
  { name: 'Foam Roll Upper Back', category: 'foam_roll', targetAreas: ['back', 'traps'], defaultDurationSeconds: 60, isCustom: false },
  { name: 'Foam Roll Calves', category: 'foam_roll', targetAreas: ['calves'], defaultDurationSeconds: 60, isCustom: false },
  { name: 'Foam Roll Glutes', category: 'foam_roll', targetAreas: ['glutes'], defaultDurationSeconds: 60, isCustom: false },
];

export async function seedDatabase() {
  const exerciseCount = await db.exercises.count();
  if (exerciseCount === 0) {
    const exercises: Exercise[] = defaultExercises.map((e) => ({
      ...e,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }));
    await db.exercises.bulkAdd(exercises);
  }

  const stretchCount = await db.stretches.count();
  if (stretchCount === 0) {
    const stretches: Stretch[] = defaultStretches.map((s) => ({
      ...s,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }));
    await db.stretches.bulkAdd(stretches);
  }

  const profileCount = await db.userProfile.count();
  if (profileCount === 0) {
    await db.userProfile.add({
      id: 'default',
      weightUnit: 'lbs',
      distanceUnit: 'mi',
      fitnessLevel: 'intermediate',
      goals: [],
      darkMode: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}
