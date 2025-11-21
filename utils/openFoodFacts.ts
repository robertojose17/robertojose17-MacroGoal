
/**
 * OpenFoodFacts API Integration
 * Public API for food database lookup
 * This is the ONLY food data provider for the app
 */

export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal_serving'?: number;
    'proteins_100g'?: number;
    'proteins_serving'?: number;
    'carbohydrates_100g'?: number;
    'carbohydrates_serving'?: number;
    'fat_100g'?: number;
    'fat_serving'?: number;
    'fiber_100g'?: number;
    'fiber_serving'?: number;
    'sugars_100g'?: number;
    'sugars_serving'?: number;
  };
}

export interface OpenFoodFactsSearchResult {
  products: OpenFoodFactsProduct[];
  count: number;
  page: number;
  page_size: number;
}

export interface ServingSizeInfo {
  description: string; // e.g., "1 egg", "2 slices", "1 bar"
  grams: number; // gram equivalent
  displayText: string; // e.g., "1 egg (50 g)", "2 slices (28 g)"
  hasValidGrams: boolean; // true if grams were successfully parsed, false if using fallback
}

/**
 * Extract serving size information from OpenFoodFacts product
 * Returns the serving description and gram equivalent
 * NEVER throws errors or blocks - always returns a valid ServingSizeInfo
 */
export function extractServingSize(product: OpenFoodFactsProduct): ServingSizeInfo {
  console.log('[OpenFoodFacts] extractServingSize called with:', {
    serving_size: product.serving_size,
    serving_quantity: product.serving_quantity,
  });

  // Default to 100g if no serving info available
  const defaultServing: ServingSizeInfo = {
    description: '100 g',
    grams: 100,
    displayText: '100 g',
    hasValidGrams: false,
  };

  // If no serving_size at all, return default immediately
  if (!product.serving_size || typeof product.serving_size !== 'string') {
    console.log('[OpenFoodFacts] No serving_size found, using default 100g');
    return defaultServing;
  }

  const servingSize = product.serving_size.trim();
  
  // Empty string check
  if (servingSize.length === 0) {
    console.log('[OpenFoodFacts] Empty serving_size, using default 100g');
    return defaultServing;
  }

  console.log('[OpenFoodFacts] Parsing serving size:', servingSize);

  try {
    // Try to extract grams from serving_size
    // Examples:
    // "1 egg (50g)" -> description: "1 egg", grams: 50
    // "2 slices (28g)" -> description: "2 slices", grams: 28
    // "1 bar (40 g)" -> description: "1 bar", grams: 40
    // "30g" -> description: "30 g", grams: 30
    // "100 g" -> description: "100 g", grams: 100

    // Pattern 1: "X unit (Yg)" or "X unit (Y g)"
    const pattern1 = /^(.+?)\s*\((\d+\.?\d*)\s*g\)$/i;
    const match1 = servingSize.match(pattern1);
    if (match1) {
      const description = match1[1].trim();
      const grams = parseFloat(match1[2]);
      
      if (!isNaN(grams) && grams > 0) {
        console.log('[OpenFoodFacts] Pattern 1 matched:', { description, grams });
        return {
          description,
          grams,
          displayText: `${description} (${Math.round(grams)} g)`,
          hasValidGrams: true,
        };
      }
    }

    // Pattern 2: Just grams "Yg" or "Y g"
    const pattern2 = /^(\d+\.?\d*)\s*g$/i;
    const match2 = servingSize.match(pattern2);
    if (match2) {
      const grams = parseFloat(match2[1]);
      
      if (!isNaN(grams) && grams > 0) {
        console.log('[OpenFoodFacts] Pattern 2 matched (pure grams):', grams);
        return {
          description: `${Math.round(grams)} g`,
          grams,
          displayText: `${Math.round(grams)} g`,
          hasValidGrams: true,
        };
      }
    }

    // Pattern 3: "X unit - Yg" or "X unit Yg"
    const pattern3 = /^(.+?)\s*[-–—]\s*(\d+\.?\d*)\s*g$/i;
    const match3 = servingSize.match(pattern3);
    if (match3) {
      const description = match3[1].trim();
      const grams = parseFloat(match3[2]);
      
      if (!isNaN(grams) && grams > 0) {
        console.log('[OpenFoodFacts] Pattern 3 matched:', { description, grams });
        return {
          description,
          grams,
          displayText: `${description} (${Math.round(grams)} g)`,
          hasValidGrams: true,
        };
      }
    }

    // Pattern 4: Try to find any number followed by g anywhere in the string
    const pattern4 = /(\d+\.?\d*)\s*g/i;
    const match4 = servingSize.match(pattern4);
    if (match4) {
      const grams = parseFloat(match4[1]);
      
      if (!isNaN(grams) && grams > 0) {
        // Try to extract description before the grams
        const description = servingSize.replace(pattern4, '').trim();
        console.log('[OpenFoodFacts] Pattern 4 matched:', { description, grams });
        
        if (description && description.length > 0) {
          return {
            description,
            grams,
            displayText: `${description} (${Math.round(grams)} g)`,
            hasValidGrams: true,
          };
        }
        
        return {
          description: `${Math.round(grams)} g`,
          grams,
          displayText: `${Math.round(grams)} g`,
          hasValidGrams: true,
        };
      }
    }

    // If we can't parse grams from serving_size, try serving_quantity
    if (product.serving_quantity) {
      const quantityStr = String(product.serving_quantity).trim();
      const grams = parseFloat(quantityStr);
      
      if (!isNaN(grams) && grams > 0) {
        console.log('[OpenFoodFacts] Using serving_quantity:', grams);
        return {
          description: servingSize,
          grams,
          displayText: `${servingSize} (${Math.round(grams)} g)`,
          hasValidGrams: true,
        };
      }
    }

    // Fallback: We have a serving description but no parseable grams
    // Return the description as-is with 100g default for calculations
    console.log('[OpenFoodFacts] Could not parse grams, using description with 100g fallback');
    return {
      description: servingSize,
      grams: 100,
      displayText: `${servingSize} (100 g)`,
      hasValidGrams: false,
    };
  } catch (error) {
    // If ANY error occurs during parsing, return default
    console.error('[OpenFoodFacts] Error parsing serving size:', error);
    return defaultServing;
  }
}

/**
 * Extract nutrition data from OpenFoodFacts product
 * Returns calories and macros per 100g
 */
export function extractNutrition(product: OpenFoodFactsProduct): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugars: number;
} {
  console.log('[OpenFoodFacts] Extracting nutrition for:', product.product_name);

  const nutriments = product.nutriments || {};

  const calories = nutriments['energy-kcal_100g'] || 0;
  const protein = nutriments['proteins_100g'] || 0;
  const carbs = nutriments['carbohydrates_100g'] || 0;
  const fat = nutriments['fat_100g'] || 0;
  const fiber = nutriments['fiber_100g'] || 0;
  const sugars = nutriments['sugars_100g'] || 0;

  console.log('[OpenFoodFacts] Extracted nutrition:', { calories, protein, carbs, fat, fiber, sugars });

  return { calories, protein, carbs, fat, fiber, sugars };
}

/**
 * Fetch with timeout wrapper
 * Ensures requests never hang indefinitely
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }
    throw error;
  }
}

/**
 * Fetch product by barcode from OpenFoodFacts
 * NEVER throws errors - always returns null on failure
 */
export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    console.log(`[OpenFoodFacts] 📷 Fetching product by barcode: ${barcode}`);
    const response = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {},
      8000
    );
    
    if (!response.ok) {
      console.log(`[OpenFoodFacts] ⚠️ Product not found for barcode: ${barcode} (status: ${response.status})`);
      return null;
    }

    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      console.log(`[OpenFoodFacts] ✅ Product found:`, data.product.product_name);
      console.log(`[OpenFoodFacts] Serving size:`, data.product.serving_size);
      return data.product;
    }

    console.log(`[OpenFoodFacts] ⚠️ No product data for barcode: ${barcode}`);
    return null;
  } catch (error) {
    console.error('[OpenFoodFacts] ❌ Error fetching product by barcode:', error);
    if (error instanceof Error) {
      console.error('[OpenFoodFacts] Error message:', error.message);
    }
    return null;
  }
}

/**
 * Search products by text query from OpenFoodFacts
 * NEVER throws errors - always returns null on failure
 */
export async function searchProducts(query: string, page: number = 1, pageSize: number = 20): Promise<OpenFoodFactsSearchResult | null> {
  try {
    console.log(`[OpenFoodFacts] 🔍 Searching products: "${query}"`);
    const response = await fetchWithTimeout(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}&json=true`,
      {},
      8000
    );
    
    if (!response.ok) {
      console.log(`[OpenFoodFacts] ❌ Search failed for query: ${query} (status: ${response.status})`);
      return null;
    }

    const data = await response.json();
    console.log(`[OpenFoodFacts] ✅ Found ${data.count} products`);
    return data;
  } catch (error) {
    console.error('[OpenFoodFacts] ❌ Error searching products:', error);
    if (error instanceof Error) {
      console.error('[OpenFoodFacts] Error message:', error.message);
    }
    return null;
  }
}

/**
 * Map OpenFoodFacts product to internal Food format
 */
export function mapOpenFoodFactsToFood(product: OpenFoodFactsProduct): any {
  const nutrition = extractNutrition(product);
  const serving = extractServingSize(product);

  return {
    name: product.product_name || 'Unknown Product',
    brand: product.brands || undefined,
    serving_amount: 100, // OpenFoodFacts uses per 100g for calculations
    serving_unit: 'g',
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fats: nutrition.fat,
    fiber: nutrition.fiber,
    barcode: product.code,
    user_created: false,
    is_favorite: false,
    is_from_openfoodfacts: true, // Flag to indicate external source
  };
}
