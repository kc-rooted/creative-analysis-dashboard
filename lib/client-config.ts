export interface BrandColor {
  name: string;
  hex: string;
  description: string;
  usage: string; // e.g., "primary_brand", "accent", "text", "background"
}

export interface ClientConfig {
  id: string;
  name: string;

  // BigQuery Configuration (only dataset varies by client)
  bigquery: {
    dataset: string;
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

    bigquery: {
      dataset: "jumbomax_analytics",
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

    bigquery: {
      dataset: "puttout_analytics",
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
  }
};

export function getClientConfig(clientId: string): ClientConfig {
  const config = CLIENT_CONFIGS[clientId];
  if (!config) {
    throw new Error(`Client configuration not found for: ${clientId}`);
  }
  return config;
}

let cachedCurrentClientId: string | null = null;
let cachedClientConfigs: Record<string, ClientConfig> = {};

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

// Synchronous version for server-side usage (backwards compatibility)
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

// Helper to set cached client ID (used by BigQuery module)
export function setCachedClientId(clientId: string) {
  cachedCurrentClientId = clientId;
}

// Clear cache when client changes
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