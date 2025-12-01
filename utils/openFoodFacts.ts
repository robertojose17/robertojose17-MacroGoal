
/**
 * OpenFoodFacts API Integration
 * Public API for food database lookup
 * This module handles BARCODE LOOKUP and TEXT SEARCH
 * 
 * SIMPLIFIED FOR MOBILE RELIABILITY:
 * - No AbortController (removed to fix race conditions)
 * - Simple endpoint with minimal payload
 * - Basic debounce with query comparison
 * - Clear error handling
 */

export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: string;
  serving_unit?: string;
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
  status: number;
}

export interface ServingSizeInfo {
  description: string; // e.g., "1 egg", "2 slices", "1 bar"
  grams: number; // gram equivalent
  displayText: string; // e.g., "1 egg (50 g)", "2 slices (28 g)", "1 slice (estimated as 100g)"
  hasValidGrams: boolean; // true if grams were successfully parsed/converted, false if using fallback
  isEstimated: boolean; // true if conversion is estimated (household units without grams)
}

/**
 * Convert milliliters to grams using 1:1 conversion
 * NEW RULE: Treat milliliters as grams 1:1 for default serving
 */
function mlToGrams(ml: number): number {
  console.log('[OpenFoodFacts] Converting ml to grams using 1:1 ratio:', ml);
  return ml * 1.0; // 1:1 conversion
}

/**
 * Extract serving size information from OpenFoodFacts product
 * Returns the serving description and gram equivalent
 * NEVER throws errors or blocks - always returns a valid ServingSizeInfo
 * 
 * PRIORITY ORDER:
 * 1) Serving label that already includes grams → use directly
 * 2) Serving label with oz/ml/tbsp/tsp/cup → convert to grams → use
 * 3) Household unit without grams → show unit, estimate grams as 100g but mark estimated
 * 4) No serving label at all → default to 100g
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
    isEstimated: false,
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
    // ========== PRIORITY 1: GRAMS ALREADY IN SERVING SIZE ==========
    
    // Pattern 1: "X unit (Yg)" or "X unit (Y g)"
    const pattern1 = /^(.+?)\s*\((\d+\.?\d*)\s*g\)$/i;
    const match1 = servingSize.match(pattern1);
    if (match1) {
      const description = match1[1].trim();
      const grams = parseFloat(match1[2]);
      
      if (!isNaN(grams) && grams > 0) {
        console.log('[OpenFoodFacts] Pattern 1 matched (grams in parentheses):', { description, grams });
        return {
          description,
          grams,
          displayText: `${description} (${Math.round(grams)} g)`,
          hasValidGrams: true,
          isEstimated: false,
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
          isEstimated: false,
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
        console.log('[OpenFoodFacts] Pattern 3 matched (grams with dash):', { description, grams });
        return {
          description,
          grams,
          displayText: `${description} (${Math.round(grams)} g)`,
          hasValidGrams: true,
          isEstimated: false,
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
        console.log('[OpenFoodFacts] Pattern 4 matched (grams anywhere):', { description, grams });
        
        if (description && description.length > 0) {
          return {
            description,
            grams,
            displayText: `${description} (${Math.round(grams)} g)`,
            hasValidGrams: true,
            isEstimated: false,
          };
        }
        
        return {
          description: `${Math.round(grams)} g`,
          grams,
          displayText: `${Math.round(grams)} g`,
          hasValidGrams: true,
          isEstimated: false,
        };
      }
    }

    // ========== PRIORITY 2: CONVERT OTHER UNITS TO GRAMS ==========
    
    // A) OUNCES (oz)
    // Pattern: "X oz" or "X ounce" or "X ounces"
    const ozPattern = /(\d+\.?\d*)\s*(oz|ounce|ounces)/i;
    const ozMatch = servingSize.match(ozPattern);
    if (ozMatch) {
      const oz = parseFloat(ozMatch[1]);
      if (!isNaN(oz) && oz > 0) {
        const grams = oz * 28.3495;
        console.log('[OpenFoodFacts] Ounces detected:', { oz, grams });
        
        // Extract full description
        const description = servingSize.trim();
        
        return {
          description,
          grams: Math.round(grams),
          displayText: `${description} (≈ ${Math.round(grams)} g)`,
          hasValidGrams: true,
          isEstimated: true,
        };
      }
    }

    // B) MILLILITERS (ml)
    // Pattern: "X ml" or "X milliliter" or "X milliliters"
    const mlPattern = /(\d+\.?\d*)\s*(ml|milliliter|milliliters|mL)/i;
    const mlMatch = servingSize.match(mlPattern);
    if (mlMatch) {
      const ml = parseFloat(mlMatch[1]);
      if (!isNaN(ml) && ml > 0) {
        const grams = mlToGrams(ml);
        console.log('[OpenFoodFacts] Milliliters detected:', { ml, grams });
        
        // Extract full description
        const description = servingSize.trim();
        
        // NEW: Use 1:1 conversion, no "≈" symbol needed
        return {
          description,
          grams: Math.round(grams),
          displayText: `${description} (${Math.round(grams)} g)`,
          hasValidGrams: true,
          isEstimated: false, // Not estimated anymore since we're using intentional 1:1
        };
      }
    }

    // C) TABLESPOONS (tbsp)
    // Pattern: "X tbsp" or "X tablespoon" or "X tablespoons"
    const tbspPattern = /(\d+\.?\d*)\s*(tbsp|tablespoon|tablespoons|Tbsp|TBSP)/i;
    const tbspMatch = servingSize.match(tbspPattern);
    if (tbspMatch) {
      const tbsp = parseFloat(tbspMatch[1]);
      if (!isNaN(tbsp) && tbsp > 0) {
        const ml = tbsp * 15; // 1 tbsp = 15 ml
        const grams = mlToGrams(ml);
        console.log('[OpenFoodFacts] Tablespoons detected:', { tbsp, ml, grams });
        
        // Extract full description
        const description = servingSize.trim();
        
        // NEW: Use 1:1 conversion, no "≈" symbol needed
        return {
          description,
          grams: Math.round(grams),
          displayText: `${description} (${Math.round(grams)} g)`,
          hasValidGrams: true,
          isEstimated: false, // Not estimated anymore since we're using intentional 1:1
        };
      }
    }

    // D) TEASPOONS (tsp)
    // Pattern: "X tsp" or "X teaspoon" or "X teaspoons"
    const tspPattern = /(\d+\.?\d*)\s*(tsp|teaspoon|teaspoons|Tsp|TSP)/i;
    const tspMatch = servingSize.match(tspPattern);
    if (tspMatch) {
      const tsp = parseFloat(tspMatch[1]);
      if (!isNaN(tsp) && tsp > 0) {
        const ml = tsp * 5; // 1 tsp = 5 ml
        const grams = mlToGrams(ml);
        console.log('[OpenFoodFacts] Teaspoons detected:', { tsp, ml, grams });
        
        // Extract full description
        const description = servingSize.trim();
        
        // NEW: Use 1:1 conversion, no "≈" symbol needed
        return {
          description,
          grams: Math.round(grams),
          displayText: `${description} (${Math.round(grams)} g)`,
          hasValidGrams: true,
          isEstimated: false, // Not estimated anymore since we're using intentional 1:1
        };
      }
    }

    // E) CUPS
    // Pattern: "X cup" or "X cups"
    const cupPattern = /(\d+\.?\d*)\s*(cup|cups)/i;
    const cupMatch = servingSize.match(cupPattern);
    if (cupMatch) {
      const cups = parseFloat(cupMatch[1]);
      if (!isNaN(cups) && cups > 0) {
        const ml = cups * 240; // 1 cup = 240 ml
        const grams = mlToGrams(ml);
        console.log('[OpenFoodFacts] Cups detected:', { cups, ml, grams });
        
        // Extract full description
        const description = servingSize.trim();
        
        // NEW: Use 1:1 conversion, no "≈" symbol needed
        return {
          description,
          grams: Math.round(grams),
          displayText: `${description} (${Math.round(grams)} g)`,
          hasValidGrams: true,
          isEstimated: false, // Not estimated anymore since we're using intentional 1:1
        };
      }
    }

    // ========== PRIORITY 3: HOUSEHOLD UNITS WITHOUT GRAMS ==========
    
    // Check if serving_quantity provides a gram value
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
          isEstimated: false,
        };
      }
    }

    // Household units pattern: "X slice", "X egg", "X piece", "X bar", etc.
    const householdPattern = /(\d+\.?\d*)\s*(slice|slices|egg|eggs|piece|pieces|bar|bars|serving|servings|item|items|unit|units)/i;
    const householdMatch = servingSize.match(householdPattern);
    if (householdMatch) {
      console.log('[OpenFoodFacts] Household unit detected without grams:', servingSize);
      
      // Return the unit as-is with 100g estimate
      return {
        description: servingSize,
        grams: 100,
        displayText: `${servingSize} (estimated as 100g)`,
        hasValidGrams: false,
        isEstimated: true,
      };
    }

    // ========== PRIORITY 4: FALLBACK ==========
    
    // Fallback: We have a serving description but no parseable grams or convertible units
    // Return the description as-is with 100g default for calculations
    console.log('[OpenFoodFacts] Could not parse grams or convert units, using description with 100g fallback');
    return {
      description: servingSize,
      grams: 100,
      displayText: `${servingSize} (estimated as 100g)`,
      hasValidGrams: false,
      isEstimated: true,
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
 * OPTIMIZED: Only extracts essential macros for display
 */
export function extractNutrition(product: OpenFoodFactsProduct): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugars: number;
} {
  const nutriments = product.nutriments || {};

  const calories = nutriments['energy-kcal_100g'] || 0;
  const protein = nutriments['proteins_100g'] || 0;
  const carbs = nutriments['carbohydrates_100g'] || 0;
  const fat = nutriments['fat_100g'] || 0;
  const fiber = nutriments['fiber_100g'] || 0;
  const sugars = nutriments['sugars_100g'] || 0;

  return { calories, protein, carbs, fat, fiber, sugars };
}

/**
 * Fetch with timeout wrapper
 * Ensures requests never hang indefinitely
 * CRITICAL: This function implements the hard timeout requirement
 * MOBILE COMPATIBILITY: Adds User-Agent header for mobile network compatibility
 * NO CANCELLATION SUPPORT: Removed AbortController to fix race conditions
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeoutMs: number = 10000
): Promise<Response> {
  console.log(`[OpenFoodFacts] fetchWithTimeout: ${url} (timeout: ${timeoutMs}ms)`);
  
  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      console.log(`[OpenFoodFacts] ⏱️ Timeout reached (${timeoutMs}ms)`);
      reject(new Error('Request timeout'));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'EliteMacroTracker/1.0 (iOS)',
          'Accept': 'application/json',
          ...options.headers,
        },
      }),
      timeoutPromise,
    ]);
    
    console.log(`[OpenFoodFacts] ✅ Request completed successfully (status: ${response.status})`);
    return response;
  } catch (error) {
    console.log(`[OpenFoodFacts] ❌ Request failed:`, error);
    throw error;
  }
}

/**
 * Lookup a product by barcode from OpenFoodFacts
 * NEVER throws errors - always returns null on failure
 * HARD TIMEOUT: 10 seconds
 * 
 * NOTE: This is for BARCODE SCAN only - DO NOT MODIFY
 */
export async function lookupProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    console.log(`[OpenFoodFacts] ========== BARCODE LOOKUP ==========`);
    console.log(`[OpenFoodFacts] Barcode: "${barcode}"`);
    console.log(`[OpenFoodFacts] Barcode length: ${barcode.length}`);
    console.log(`[OpenFoodFacts] Barcode type: ${typeof barcode}`);
    
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    console.log(`[OpenFoodFacts] Request URL: ${url}`);
    
    const response = await fetchWithTimeout(
      url,
      {},
      10000 // 10 second timeout
    );
    
    console.log(`[OpenFoodFacts] Response received, status: ${response.status}`);
    console.log(`[OpenFoodFacts] Response ok: ${response.ok}`);
    
    if (!response.ok) {
      console.log(`[OpenFoodFacts] ❌ Barcode lookup failed (status: ${response.status})`);
      return null;
    }

    console.log(`[OpenFoodFacts] Parsing response JSON...`);
    const data = await response.json();
    console.log(`[OpenFoodFacts] Response data keys:`, Object.keys(data || {}));
    console.log(`[OpenFoodFacts] Response status field:`, data.status);
    console.log(`[OpenFoodFacts] Has product field:`, !!data.product);
    
    // Check if product was found
    if (data.status === 0 || !data.product) {
      console.log(`[OpenFoodFacts] ❌ Product not found for barcode: ${barcode}`);
      return null;
    }
    
    console.log(`[OpenFoodFacts] ✅ Product found:`, data.product.product_name);
    console.log(`[OpenFoodFacts] Product code:`, data.product.code);
    console.log(`[OpenFoodFacts] Product brand:`, data.product.brands);
    console.log(`[OpenFoodFacts] Has nutriments:`, !!data.product.nutriments);
    
    return data.product;
  } catch (error) {
    console.error('[OpenFoodFacts] ❌ Error looking up barcode:', error);
    if (error instanceof Error) {
      console.error('[OpenFoodFacts] Error name:', error.name);
      console.error('[OpenFoodFacts] Error message:', error.message);
      console.error('[OpenFoodFacts] Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Search OpenFoodFacts by text query
 * Returns search result with products and status
 * NEVER throws errors - always returns result object
 * HARD TIMEOUT: 10 seconds
 * 
 * SIMPLIFIED FOR RELIABILITY:
 * - Uses simple search endpoint (no custom filters)
 * - No AbortController (removed to fix race conditions)
 * - Returns status code for debugging
 * - Safe response parsing
 */
export async function searchOpenFoodFacts(query: string): Promise<OpenFoodFactsSearchResult> {
  try {
    console.log(`[OpenFoodFacts] ========== TEXT SEARCH ==========`);
    console.log(`[OpenFoodFacts] Query: "${query}"`);
    
    // URL-encode the query
    const encodedQuery = encodeURIComponent(query);
    
    // Use simple, known-good OFF search endpoint
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodedQuery}&search_simple=1&action=process&json=1&page_size=20`;
    
    console.log(`[OpenFoodFacts] Search URL: ${url}`);
    
    const response = await fetchWithTimeout(url, {}, 10000); // 10 second timeout
    
    console.log(`[OpenFoodFacts] Response status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`[OpenFoodFacts] ❌ Search failed (status: ${response.status})`);
      return {
        products: [],
        count: 0,
        page: 1,
        status: response.status,
      };
    }

    const data = await response.json();
    
    console.log(`[OpenFoodFacts] Response data keys:`, Object.keys(data || {}));
    
    // Safe response parsing
    if (!data || !data.products) {
      console.log(`[OpenFoodFacts] ❌ No products field in response`);
      return {
        products: [],
        count: 0,
        page: 1,
        status: response.status,
      };
    }
    
    if (!Array.isArray(data.products)) {
      console.log(`[OpenFoodFacts] ❌ products field is not an array`);
      return {
        products: [],
        count: 0,
        page: 1,
        status: response.status,
      };
    }
    
    console.log(`[OpenFoodFacts] ✅ Search returned ${data.products.length} products`);
    return {
      products: data.products,
      count: data.count || data.products.length,
      page: data.page || 1,
      status: response.status,
    };
  } catch (error) {
    console.error('[OpenFoodFacts] ❌ Error searching:', error);
    if (error instanceof Error) {
      console.error('[OpenFoodFacts] Error message:', error.message);
    }
    // NEVER throw - always return result object on failure
    return {
      products: [],
      count: 0,
      page: 1,
      status: 0, // 0 indicates network error
    };
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
    barcode: product.code || null,
    user_created: false,
    is_favorite: false,
    is_from_openfoodfacts: true, // Flag to indicate external source
  };
}
