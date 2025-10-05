# Setup Google Custom Search API for Product Images

To get real product images from Google Shopping, you need to set up Google Custom Search API:

## Steps:

### 1. Get Google Custom Search API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Custom Search API"
4. Go to "APIs & Services" → "Credentials"
5. Click "Create Credentials" → "API Key"
6. Copy the API key

### 2. Create Custom Search Engine
1. Go to [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click "Add" to create a new search engine
3. In "Sites to search", enter: `www.google.com`
4. Name it something like "Shopping Search"
5. Click "Create"
6. Go to "Setup" → "Basic" → Turn ON "Image search"
7. Go to "Setup" → "Basic" → Turn ON "Search the entire web"
8. Copy the "Search engine ID"

### 3. Add to .env file
Add these lines to your `server/.env` file:

```
GEMINI_API_KEY='your-existing-key'
GOOGLE_SEARCH_API_KEY='your-custom-search-api-key'
GOOGLE_SEARCH_ENGINE_ID='your-search-engine-id'
```

### 4. Restart the server
```powershell
cd server
node server.js
```

## Alternative: Using Unsplash (Current Fallback)

If you don't set up Google Custom Search API, the system will use Unsplash as a fallback to show fashion-related images. While not exact product matches, they provide relevant visual representations.

## Note on API Limits

- Google Custom Search API: 100 free queries/day
- After that, it's $5 per 1000 queries
- For production, consider implementing caching to reduce API calls
