# FishID API Backend

A Flask-based API backend for the FishID application that provides fish identification services using Fishial AI.

## Features

- **Fish Identification**: Upload images to identify fish species using Fishial AI
- **Authentication**: Mock authentication endpoints (ready for real implementation)
- **CORS Support**: Configured for Next.js frontend communication
- **Metadata Enrichment**: Enhanced fish information with habitat, distribution, and fun facts

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify` - Token verification
- `POST /api/auth/logout` - User logout

### Fish Identification
- `POST /api/fish/identify` - Identify fish from uploaded image
- `GET /api/fish/history` - Get user's identification history
- `POST /api/fish/save` - Save an identification

### Health Check
- `GET /api/health` - API health status

## Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment variables**:
   Create a `.env` file with:
   ```
   LANDINGAI_API_KEY=your_fishial_api_key
   SECRET_KEY=your_secret_key
   ```

3. **Run the server**:
   ```bash
   python app.py
   ```

The API will be available at `http://localhost:5000`

## Frontend Integration

This backend is designed to work with the Next.js frontend. The frontend should:

1. Set `NEXT_PUBLIC_FLASK_API_URL=http://localhost:5000` for development
2. Set `NEXT_PUBLIC_FLASK_API_URL=https://your-render-app.onrender.com` for production

## Deployment

This backend is configured for deployment on Render:

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app`

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "result": {
    "id": "identification_20240115_103000",
    "scientific_name": "Paracanthurus hepatus",
    "common_name": "Blue Tang",
    "confidence": 92,
    "description": "A vibrant blue fish...",
    "habitat": "Coral reefs",
    "distribution": "Indo-Pacific",
    "max_length_cm": 30,
    "conservation_status": "LC",
    "fun_facts": "Interesting facts...",
    "reference_image": "https://example.com/image.jpg"
  }
}
```

## Error Handling

Errors are returned in this format:

```json
{
  "success": false,
  "error": "Error message"
}
``` 