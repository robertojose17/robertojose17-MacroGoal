export interface Goals {
  id: string;
  user_id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodLog {
  id: string;
  user_id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number;
  serving_unit: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logged_at: string;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number;
  serving_unit: string;
  barcode?: string;
  is_custom?: boolean;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  items: MealItem[];
}

export interface MealItem {
  food_id?: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number;
  serving_unit: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  date: string;
  weight: number;
  body_fat?: number;
  notes?: string;
  photo_url?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}
