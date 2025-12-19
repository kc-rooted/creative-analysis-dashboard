export interface BrandColor {
  name: string;
  hex: string;
  description: string;
  usage: string; // e.g., "primary_brand", "accent", "text", "background"
}

export interface ClientConfig {
  id: string;
  name: string;

  // Platform Configuration
  platform: 'shopify' | 'bigcommerce' | 'other';

  // BigQuery Configuration (only dataset varies by client)
  bigquery: {
    dataset: string;
  };

  // Feature Flags - Control which features/tabs are available for this client
  features?: {
    googleAds?: boolean;
    metaAds?: boolean;
    email?: boolean;
    googleAnalytics?: boolean;
    searchConsole?: boolean;
  };

  // Brand Guidelines
  brand: {
    colors: BrandColor[];
    industry: string;
    targetAudience: string[];
    productCategories: string[];
    brandPersonality: string;
    competitiveContext: string;
  };

  // Analysis Configuration
  analysis: {
    customPromptAdditions?: string;
    focusAreas: string[]; // e.g., ["performance", "brand_compliance", "audience_alignment"]
  };

  // Dashboard Configuration
  dashboard?: {
    monthlyRevenueTargets?: number[]; // 12 values for Jan-Dec
    monthlyRoasTarget?: number;
    currency?: string; // Currency code (USD, GBP, EUR, etc.)
    currencySymbol?: string; // Currency symbol ($, £, €, etc.)
  };
}

export const CLIENT_CONFIGS: Record<string, ClientConfig> = {
  jumbomax: {
    id: "jumbomax",
    name: "JumboMax Golf",
    platform: 'shopify',

    bigquery: {
      dataset: "jumbomax_analytics",
    },

    features: {
      googleAds: true,
      metaAds: true,
      email: true,
      googleAnalytics: true,
      searchConsole: true,
    },

    brand: {
      colors: [
        {
          name: "JumboMax Blue",
          hex: "#1B4F72",
          description: "Primary brand blue - professional and trustworthy",
          usage: "primary_brand"
        },
        {
          name: "JumboMax Orange",
          hex: "#E67E22",
          description: "Secondary accent color - energy and performance",
          usage: "accent"
        },
        {
          name: "White",
          hex: "#FFFFFF",
          description: "Clean background and text contrast",
          usage: "background"
        },
        {
          name: "Dark Gray",
          hex: "#2C3E50",
          description: "Primary text and strong contrast",
          usage: "text"
        },
        {
          name: "Light Gray",
          hex: "#95A5A6",
          description: "Secondary text and subtle elements",
          usage: "secondary_text"
        }
      ],
      industry: "golf_equipment",
      targetAudience: ["golf_enthusiasts", "performance_golfers", "recreational_players"],
      productCategories: ["golf_grips", "golf_accessories", "performance_equipment"],
      brandPersonality: "premium_performance_focused_innovative",
      competitiveContext: "competing_against_traditional_golf_grip_manufacturers"
    },

    analysis: {
      focusAreas: ["performance", "brand_compliance", "golf_appeal", "target_audience_alignment"],
      customPromptAdditions: "Focus specifically on golf equipment marketing appeal and how well the creative resonates with golfers seeking performance improvements."
    },

    dashboard: {
      monthlyRevenueTargets: [
        300000, // January
        300000, // February
        300000, // March
        300000, // April
        300000, // May
        300000, // June
        300000, // July
        300000, // August
        300000, // September
        300000, // October
        300000, // November
        300000  // December
      ],
      monthlyRoasTarget: 6.5,
      currency: 'USD',
      currencySymbol: '$'
    }
  },

  puttout: {
    id: "puttout",
    name: "PuttOut",
    platform: 'shopify',

    bigquery: {
      dataset: "puttout_analytics",
    },

    features: {
      googleAds: true,
      metaAds: true,
      email: true,
      googleAnalytics: true,
      searchConsole: true,
    },

    brand: {
      colors: [
        {
          name: "PuttOut Red",
          hex: "#DF2A3F",
          description: "Primary brand red - bold and energetic",
          usage: "primary_brand"
        },
        {
          name: "Black",
          hex: "#111111",
          description: "Secondary brand color - premium and modern",
          usage: "accent"
        },
        {
          name: "White",
          hex: "#FFFFFF",
          description: "Clean background and text contrast",
          usage: "background"
        },
        {
          name: "Dark Gray",
          hex: "#2C3E50",
          description: "Primary text and strong contrast",
          usage: "text"
        },
        {
          name: "Light Gray",
          hex: "#95A5A6",
          description: "Secondary text and subtle elements",
          usage: "secondary_text"
        }
      ],
      industry: "golf_training_equipment",
      targetAudience: ["golf_enthusiasts", "practice_focused_golfers", "skill_improvement_seekers"],
      productCategories: ["putting_trainers", "golf_training_aids", "golf_accessories"],
      brandPersonality: "innovative_fun_performance_focused",
      competitiveContext: "leading_golf_training_equipment_brand"
    },

    analysis: {
      focusAreas: ["performance", "brand_compliance", "golf_appeal", "training_focus"],
      customPromptAdditions: "Focus on golf training and skill improvement messaging. Emphasize how the creative appeals to golfers looking to improve their putting game."
    },

    dashboard: {
      monthlyRevenueTargets: [
        250000, // January
        250000, // February
        250000, // March
        250000, // April
        250000, // May
        250000, // June
        250000, // July
        250000, // August
        250000, // September
        250000, // October
        250000, // November
        250000  // December
      ],
      monthlyRoasTarget: 5.0,
      currency: 'GBP',
      currencySymbol: '£'
    }
  },

  hb: {
    id: "hb",
    name: "Holderness & Bourne",
    platform: 'shopify',

    bigquery: {
      dataset: "hb_analytics",
    },

    features: {
      googleAds: true,
      metaAds: true,
      email: true,
      googleAnalytics: true,
      searchConsole: true,
    },

    brand: {
      colors: [
        {
          name: "Navy Blue",
          hex: "#1B3A5F",
          description: "Primary brand navy - classic and sophisticated",
          usage: "primary_brand"
        },
        {
          name: "Forest Green",
          hex: "#2D5016",
          description: "Secondary accent color - golf heritage and tradition",
          usage: "accent"
        },
        {
          name: "White",
          hex: "#FFFFFF",
          description: "Clean background and text contrast",
          usage: "background"
        },
        {
          name: "Dark Gray",
          hex: "#2C3E50",
          description: "Primary text and strong contrast",
          usage: "text"
        },
        {
          name: "Light Gray",
          hex: "#95A5A6",
          description: "Secondary text and subtle elements",
          usage: "secondary_text"
        }
      ],
      industry: "golf_apparel_accessories",
      targetAudience: ["golf_enthusiasts", "fashion_conscious_golfers", "traditional_golf_club_members"],
      productCategories: ["golf_apparel", "golf_accessories", "lifestyle_products"],
      brandPersonality: "classic_sophisticated_traditional_premium",
      competitiveContext: "premium_golf_lifestyle_brand_competing_with_traditional_golf_apparel_companies"
    },

    analysis: {
      focusAreas: ["performance", "brand_compliance", "golf_appeal", "lifestyle_alignment"],
      customPromptAdditions: "Focus on golf lifestyle and heritage appeal. Emphasize how the creative resonates with golfers seeking classic, sophisticated golf apparel and accessories."
    },

    dashboard: {
      monthlyRevenueTargets: [
        400000, // January
        400000, // February
        400000, // March
        400000, // April
        400000, // May
        400000, // June
        400000, // July
        400000, // August
        400000, // September
        400000, // October
        400000, // November
        400000  // December
      ],
      monthlyRoasTarget: 5.5,
      currency: 'USD',
      currencySymbol: '$'
    }
  },

  bh: {
    id: "bh",
    name: "BH",
    platform: 'bigcommerce',

    bigquery: {
      dataset: "bh_analytics",
    },

    features: {
      googleAds: false,       // No Google Ads
      metaAds: true,          // Has Meta Ads
      email: false,           // No Email
      googleAnalytics: false, // No Google Analytics
      searchConsole: false,   // No Search Console
    },

    brand: {
      colors: [
        {
          name: "Primary Blue",
          hex: "#1B4F72",
          description: "Primary brand color",
          usage: "primary_brand"
        },
        {
          name: "White",
          hex: "#FFFFFF",
          description: "Clean background and text contrast",
          usage: "background"
        },
        {
          name: "Dark Gray",
          hex: "#2C3E50",
          description: "Primary text and strong contrast",
          usage: "text"
        },
        {
          name: "Light Gray",
          hex: "#95A5A6",
          description: "Secondary text and subtle elements",
          usage: "secondary_text"
        }
      ],
      industry: "ecommerce",
      targetAudience: ["online_shoppers", "value_seekers"],
      productCategories: ["consumer_products"],
      brandPersonality: "modern_approachable_valuedriven",
      competitiveContext: "online_retail_competitive_landscape"
    },

    analysis: {
      focusAreas: ["performance", "brand_compliance", "value_proposition"],
      customPromptAdditions: "Focus on e-commerce appeal and value-driven messaging that resonates with online shoppers."
    },

    dashboard: {
      monthlyRevenueTargets: [
        350000, // January
        350000, // February
        350000, // March
        350000, // April
        350000, // May
        350000, // June
        350000, // July
        350000, // August
        350000, // September
        350000, // October
        350000, // November
        350000  // December
      ],
      monthlyRoasTarget: 5.0,
      currency: 'USD',
      currencySymbol: '$'
    }
  },

  benhogan: {
    id: "benhogan",
    name: "Ben Hogan Golf",
    platform: 'bigcommerce',

    bigquery: {
      dataset: "benhogan_analytics",
    },

    features: {
      googleAds: false,       // No Google Ads
      metaAds: true,          // Has Meta Ads
      email: true,            // Email enabled
      googleAnalytics: false, // No Google Analytics
      searchConsole: false,   // No Search Console
    },

    brand: {
      colors: [
        {
          name: "Primary Blue",
          hex: "#1B4F72",
          description: "Primary brand color",
          usage: "primary_brand"
        },
        {
          name: "White",
          hex: "#FFFFFF",
          description: "Clean background and text contrast",
          usage: "background"
        },
        {
          name: "Dark Gray",
          hex: "#2C3E50",
          description: "Primary text and strong contrast",
          usage: "text"
        },
        {
          name: "Light Gray",
          hex: "#95A5A6",
          description: "Secondary text and subtle elements",
          usage: "secondary_text"
        }
      ],
      industry: "ecommerce",
      targetAudience: ["online_shoppers", "value_seekers"],
      productCategories: ["consumer_products"],
      brandPersonality: "modern_approachable_valuedriven",
      competitiveContext: "online_retail_competitive_landscape"
    },

    analysis: {
      focusAreas: ["performance", "brand_compliance", "value_proposition"],
      customPromptAdditions: "Focus on e-commerce appeal and value-driven messaging that resonates with online shoppers."
    },

    dashboard: {
      monthlyRevenueTargets: [
        350000, // January
        350000, // February
        350000, // March
        350000, // April
        350000, // May
        350000, // June
        350000, // July
        350000, // August
        350000, // September
        350000, // October
        350000, // November
        350000  // December
      ],
      monthlyRoasTarget: 5.0,
      currency: 'USD',
      currencySymbol: '$'
    }
  }
};

export function getClientConfig(clientId: string): ClientConfig {
  const config = CLIENT_CONFIGS[clientId];
  if (!config) {
    throw new Error(`Client configuration not found for: ${clientId}`);
  }
  return config;
}

// =============================================================================
// DEPRECATED: Legacy module-level caching
// These variables and functions are DEPRECATED and should NOT be used.
// They exist only for backwards compatibility during migration.
// All new code should pass clientId explicitly through function parameters.
// The x-client-id header should be the source of truth for request isolation.
// =============================================================================

/** @deprecated Use explicit clientId parameter instead */
let cachedCurrentClientId: string | null = null;

/** @deprecated Use explicit clientId parameter instead */
let cachedClientConfigs: Record<string, ClientConfig> = {};

/**
 * @deprecated Use explicit clientId from x-client-id header instead.
 * This function relies on module-level cache which is not safe for multi-user environments.
 */
export async function getCurrentClientId(): Promise<string> {
  if (cachedCurrentClientId) {
    return cachedCurrentClientId;
  }

  try {
    // Try to get from database first
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/current-client`);
    if (response.ok) {
      const data = await response.json();
      cachedCurrentClientId = data.clientId;
      return cachedCurrentClientId;
    }
  } catch (error) {
    console.error('Error fetching current client from database:', error);
  }

  // Fallback to environment variable
  cachedCurrentClientId = process.env.CURRENT_CLIENT_ID || "jumbomax";
  return cachedCurrentClientId;
}

export async function getCurrentClientConfig(): Promise<ClientConfig> {
  const clientId = await getCurrentClientId();
  return await getClientConfigFromDatabase(clientId);
}

export async function getClientConfigFromDatabase(clientId: string): Promise<ClientConfig> {
  // Check cache first
  if (cachedClientConfigs[clientId]) {
    return cachedClientConfigs[clientId];
  }

  try {
    // Try to get from database
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/clients`);
    if (response.ok) {
      const clients = await response.json();
      
      // Cache all clients
      clients.forEach((client: ClientConfig) => {
        cachedClientConfigs[client.id] = client;
      });

      const config = cachedClientConfigs[clientId];
      if (config) {
        return config;
      }
    }
  } catch (error) {
    console.error('Error fetching client config from database:', error);
  }

  // Fallback to hardcoded config
  const fallbackConfig = CLIENT_CONFIGS[clientId];
  if (!fallbackConfig) {
    throw new Error(`Client configuration not found for: ${clientId}`);
  }
  
  return fallbackConfig;
}

/**
 * @deprecated Use explicit clientId from x-client-id header instead.
 * This function relies on module-level cache which is not safe for multi-user environments.
 */
export function getCurrentClientConfigSync(): ClientConfig {
  // Use cached client ID if available (populated by async getCurrentClientId)
  const clientId = cachedCurrentClientId || process.env.CURRENT_CLIENT_ID || "jumbomax";
  console.log('[getCurrentClientConfigSync] Using client ID:', clientId, '(cached:', !!cachedCurrentClientId, ')');

  // Check if we have cached config from database
  if (cachedClientConfigs[clientId]) {
    return cachedClientConfigs[clientId];
  }

  // Fall back to hardcoded config
  return getClientConfig(clientId);
}

/**
 * @deprecated Use explicit clientId parameter instead.
 * This function relies on module-level cache which is not safe for multi-user environments.
 */
export function setCachedClientId(clientId: string) {
  cachedCurrentClientId = clientId;
}

/**
 * @deprecated Use explicit clientId parameter instead.
 * This function relies on module-level cache which is not safe for multi-user environments.
 */
export function setCachedClientConfig(clientId: string) {
  cachedCurrentClientId = clientId;
  // Force load the config for this client into cache
  const config = getClientConfig(clientId);
  cachedClientConfigs = { [clientId]: config };
  console.log(`[client-config] Set cached config for ${clientId}, dataset:`, config.bigquery.dataset);
}

/**
 * @deprecated Use explicit clientId parameter instead.
 * This function relies on module-level cache which is not safe for multi-user environments.
 */
export function clearClientCache() {
  cachedCurrentClientId = null;
  cachedClientConfigs = {};
}

// Helper to generate brand colors section for Claude prompt
export function generateBrandColorsPrompt(brandColors: BrandColor[]): string {
  if (brandColors.length === 0) return "";
  
  const colorsList = brandColors
    .map(color => `- ${color.name} (${color.hex}): ${color.description} [${color.usage}]`)
    .join('\n');
    
  return `
BRAND COLORS REFERENCE:
The client's official brand colors are:
${colorsList}

When analyzing color palette, identify if these exact brand colors are present and note any deviations. If colors are similar but not exact matches, note the difference.`;
}

// Helper to generate client-specific context for Claude
export function generateClientContext(config: ClientConfig): string {
  const brandColorsPrompt = generateBrandColorsPrompt(config.brand.colors);
  
  return `
CLIENT: ${config.name}
INDUSTRY: ${config.brand.industry}
TARGET AUDIENCE: ${config.brand.targetAudience.join(', ')}
PRODUCT FOCUS: ${config.brand.productCategories.join(', ')}
BRAND PERSONALITY: ${config.brand.brandPersonality}

${brandColorsPrompt}

${config.analysis.customPromptAdditions || ''}

FOCUS AREAS: Analyze specifically for ${config.analysis.focusAreas.join(', ')}.`;
}