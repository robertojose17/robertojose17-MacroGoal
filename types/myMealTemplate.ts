
/**
 * My Meal Template Types
 * Simple data structures for saved meal templates
 */

export type FoodSource = 'library' | 'barcode' | 'quickadd' | 'ai' | 'custom';

export interface MyMealTemplateItem {
  id: string;
  my_meal_id: string;
  food_source: FoodSource;
  food_id?: string;
  barcode?: string;
  ai_snapshot_id?: string;
  food_name: string;
  brand?: string;
  amount_grams: number;
  amount_display: string;
  per100_calories: number;
  per100_protein: number;
  per100_carbs: number;
  per100_fat: number;
  per100_fiber: number;
  created_at: string;
  updated_at: string;
}

export interface MyMealTemplate {
  id: string;
  user_id: string;
  name: string;
  note?: string;
  items?: MyMealTemplateItem[];
  created_at: string;
  updated_at: string;
}

export interface MyMealTemplateSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  itemCount: number;
}
