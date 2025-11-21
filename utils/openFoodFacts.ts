
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
  categories?: string;
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
  statusCode?: number; // For debug purposes
  url?: string; // For debug purposes
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
 * CRITICAL: This function implements the hard timeout requirement
 * MOBILE COMPATIBILITY: Adds User-Agent header for mobile network compatibility
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
  console.log(`[OpenFoodFacts] fetchWithTimeout: ${url} (timeout: ${timeoutMs}ms)`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`[OpenFoodFacts] ⏱️ Timeout reached (${timeoutMs}ms), aborting request`);
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'EliteMacroTracker/1.0 (iOS)',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    console.log(`[OpenFoodFacts] ✅ Request completed successfully (status: ${response.status})`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`[OpenFoodFacts] ❌ Request aborted due to timeout`);
      throw new Error('Request timeout - please check your internet connection');
    }
    console.log(`[OpenFoodFacts] ❌ Request failed:`, error);
    throw error;
  }
}

/**
 * Lookup a product by barcode from OpenFoodFacts
 * NEVER throws errors - always returns null on failure
 * HARD TIMEOUT: 10 seconds
 */
export async function lookupProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    console.log(`[OpenFoodFacts] ========== BARCODE LOOKUP ==========`);
    console.log(`[OpenFoodFacts] Barcode: "${barcode}"`);
    
    const response = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {},
      10000 // 10 second timeout
    );
    
    if (!response.ok) {
      console.log(`[OpenFoodFacts] ❌ Barcode lookup failed (status: ${response.status})`);
      return null;
    }

    const data = await response.json();
    
    // Check if product was found
    if (data.status === 0 || !data.product) {
      console.log(`[OpenFoodFacts] ❌ Product not found for barcode: ${barcode}`);
      return null;
    }
    
    console.log(`[OpenFoodFacts] ✅ Product found:`, data.product.product_name);
    return data.product;
  } catch (error) {
    console.error('[OpenFoodFacts] ❌ Error looking up barcode:', error);
    if (error instanceof Error) {
      console.error('[OpenFoodFacts] Error message:', error.message);
    }
    return null;
  }
}

/**
 * Search products by text query from OpenFoodFacts
 * NEVER throws errors - always returns a valid result object (never null)
 * HARD TIMEOUT: 10 seconds (increased from 8 for mobile reliability)
 * 
 * UPDATED: Uses API v2 search endpoint for better mobile compatibility
 * MOBILE COMPATIBILITY: Adds User-Agent header and uses HTTPS
 * 
 * CRITICAL FIX: This function now ALWAYS returns a valid OpenFoodFactsSearchResult object,
 * never null. Empty results are represented as an object with an empty products array.
 */
export async function searchProducts(query: string, page: number = 1, pageSize: number = 20): Promise<OpenFoodFactsSearchResult | null> {
  // Build the URL first for debugging
  const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=code,product_name,brands,nutriments,serving_size,serving_quantity,serving_unit,quantity,image_front_small_url&sort_by=popularity_key&page_size=${pageSize}&page=${page}`;
  
  try {
    console.log(`[OpenFoodFacts] ========== SEARCH FOOD LIBRARY ==========`);
    console.log(`[OpenFoodFacts] Query: "${query}"`);
    console.log(`[OpenFoodFacts] Page: ${page}, PageSize: ${pageSize}`);
    console.log(`[OpenFoodFacts] Full URL: ${url}`);
    console.log(`[OpenFoodFacts] Using HTTPS: YES`);
    console.log(`[OpenFoodFacts] User-Agent: EliteMacroTracker/1.0 (iOS)`);
    
    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
      },
      10000 // 10 second timeout for mobile reliability
    );
    
    console.log(`[OpenFoodFacts] Response status: ${response.status}`);
    console.log(`[OpenFoodFacts] Response ok: ${response.ok}`);
    
    if (!response.ok) {
      console.log(`[OpenFoodFacts] ❌ Search failed for query: ${query} (status: ${response.status})`);
      // Return result with status code for debugging - NOT NULL
      return {
        products: [],
        count: 0,
        page: page,
        page_size: pageSize,
        statusCode: response.status,
        url: url,
      };
    }

    // Parse the JSON response
    let data: any;
    try {
      data = await response.json();
      console.log(`[OpenFoodFacts] ✅ JSON parsed successfully`);
    } catch (jsonError) {
      console.error(`[OpenFoodFacts] ❌ Failed to parse JSON response:`, jsonError);
      // Return empty result with error info - NOT NULL
      return {
        products: [],
        count: 0,
        page: page,
        page_size: pageSize,
        statusCode: response.status,
        url: url,
      };
    }
    
    console.log(`[OpenFoodFacts] Response keys:`, Object.keys(data));
    console.log(`[OpenFoodFacts] Products count: ${data.count || 0}`);
    console.log(`[OpenFoodFacts] Products array length: ${data.products?.length || 0}`);
    
    // Validate response structure
    // API v2 returns: { products: [...], count: n, page: n, page_size: n }
    if (!data.products || !Array.isArray(data.products)) {
      console.log(`[OpenFoodFacts] ⚠️ Invalid response structure - no products array`);
      console.log(`[OpenFoodFacts] Response data:`, JSON.stringify(data, null, 2));
      // Return empty result - NOT NULL
      return {
        products: [],
        count: 0,
        page: page,
        page_size: pageSize,
        statusCode: response.status,
        url: url,
      };
    }
    
    // Filter out products with no name
    const validProducts = data.products.filter((p: OpenFoodFactsProduct) => {
      const hasName = p.product_name && p.product_name.trim().length > 0;
      if (!hasName) {
        console.log(`[OpenFoodFacts] Filtering out product with no name:`, p.code);
      }
      return hasName;
    });
    
    console.log(`[OpenFoodFacts] ✅ Returning ${validProducts.length} valid products`);
    
    // ALWAYS return a valid result object - NEVER NULL
    return {
      products: validProducts,
      count: data.count || validProducts.length,
      page: data.page || page,
      page_size: data.page_size || pageSize,
      statusCode: response.status,
      url: url,
    };
  } catch (error) {
    console.error('[OpenFoodFacts] ❌ Error searching products:', error);
    if (error instanceof Error) {
      console.error('[OpenFoodFacts] Error name:', error.name);
      console.error('[OpenFoodFacts] Error message:', error.message);
      console.error('[OpenFoodFacts] Error stack:', error.stack);
    }
    
    // CRITICAL: Return empty result with error info - NEVER NULL
    // This ensures the UI can display the error properly
    return {
      products: [],
      count: 0,
      page: page,
      page_size: pageSize,
      statusCode: 0, // 0 indicates network/exception error
      url: url,
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
