// Runtime configuration loader
let cachedConfig: { apiUrl: string } | null = null;

async function loadConfig(): Promise<{ apiUrl: string }> {
  if (cachedConfig) return cachedConfig;

  try {
    // Try to load config from public/config.json (set by Docker at runtime)
    const response = await fetch("/config.json");
    if (response.ok) {
      const config = await response.json();
      cachedConfig = config as { apiUrl: string };
      return cachedConfig;
    }
  } catch (e) {
    console.warn("Could not load config.json, using default API URL");
  }

  // Fallback to localhost
  const defaultConfig: { apiUrl: string } = { apiUrl: "http://localhost:8000" };
  cachedConfig = defaultConfig;
  return defaultConfig;
}

export async function getApiUrl(): Promise<string> {
  const config = await loadConfig();
  return config.apiUrl;
}
