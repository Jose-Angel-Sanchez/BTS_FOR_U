# BTS Backend API

Backend API separada para scraping + feed cacheado.

## Endpoints

- `GET /api/health`
- `GET /api/feed?page=0&size=36&member=jungkook`
- `POST /api/refresh` (o `GET /api/refresh` para cron)

## Variables de entorno (Vercel)

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN` (opcional)
- `CRON_SECRET` (recomendado para proteger `/api/refresh`)
- `API_REFRESH_TOKEN` (token alterno manual para refresh)

## Deploy en Vercel

1. Crea un proyecto nuevo en Vercel apuntando a esta carpeta: `backend_api`.
2. Configura las variables de entorno.
3. Verifica cron activo (`/api/refresh` cada 30 min).

## Seguridad

`/api/refresh` requiere header:

- `Authorization: Bearer <CRON_SECRET o API_REFRESH_TOKEN>`

Vercel Cron enviara automaticamente el header con `CRON_SECRET`.
