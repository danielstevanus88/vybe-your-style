# How to Get Real Google Shopping Product Images

## Quick Start (Choose ONE):

### Option 1: SerpAPI (Recommended - Easiest)
**Best for: Real Google Shopping product images**

1. Go to https://serpapi.com/
2. Sign up for a free account (100 searches/month free)
3. Copy your API key from the dashboard
4. Add to `.env`:
```
SERPAPI_KEY='your-serpapi-key-here'
```

### Option 2: Google Custom Search API
**Best for: More control, free tier available**

1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable "Custom Search API"
4. Go to "Credentials" → Create API Key
5. Go to https://programmablesearchengine.google.com/
6. Create a new search engine
7. Enable "Image search" and "Search the entire web"
8. Copy the Search Engine ID

Add to `.env`:
```
GOOGLE_SEARCH_API_KEY='your-api-key'
GOOGLE_SEARCH_ENGINE_ID='your-search-engine-id'
```

### Option 3: Use Current Fallbacks (No Setup)
The system already works with:
- Pexels API (fashion photos)
- Unsplash (category-specific fashion images)

## Current Priority Order:
1. SerpAPI (if key provided) → Real Google Shopping products
2. Google Custom Search (if keys provided) → Real product images
3. Pexels API (free, working) → Fashion/clothing photos
4. Unsplash direct URLs (reliable) → Category-specific images
5. Placeholder.co (final fallback) → Colored placeholders

## Restart Server After Adding Keys:
```powershell
cd server
node server.js
```

Then refresh your browser to get new recommendations with real product images!
