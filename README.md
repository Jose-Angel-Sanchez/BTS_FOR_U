# BTS Discovery

Experiencia web para fans de BTS construida con Next.js: galeria de imagenes, videos embebidos y minijuegos interactivos.

## Caracteristicas

- Galeria filtrable por integrante con feed infinito.
- Seccion de videos con reproduccion embebida y modal detallada.
- Minijuegos (trivia, puzzle y arcade tipo breakout).
- Personalizacion local (preferencias, interacciones y blacklist).
- UI responsive con soporte de tema claro/oscuro.

## Stack Tecnologico

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Three.js

## Requisitos

- Node.js 20+
- pnpm 9+

## Instalacion

1. Clona el repositorio.
2. Instala dependencias:

```bash
pnpm install
```

3. Ejecuta en desarrollo:

```bash
pnpm dev
```

4. Abre `http://localhost:3000`.

## Scripts Disponibles

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # build de produccion
pnpm start    # ejecuta build de produccion
pnpm lint     # lint del proyecto
```

## Rutas Principales

- `/` Inicio / landing
- `/home` Galeria principal
- `/games` Minijuegos
- `/videos` Videoteca

## Estructura General

- `app/` rutas y layouts de Next.js
- `components/` UI, feed, juegos y modales
- `hooks/` logica reutilizable (feed, IA, etc.)
- `lib/` utilidades, scraping y datos base
- `store/` persistencia local y preferencias
- `types/` tipos compartidos

## Configuracion de Entorno

Si agregas variables de entorno, crea un archivo `.env.local` en la raiz del proyecto.

Ejemplo:

```bash
# .env.local (Este proyecto no almacena ningún dato personal, solo usa local storage)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Como Aportar

Se aceptan aportaciones via issues y pull requests.

1. Haz fork del repositorio.
2. Crea una rama descriptiva:

```bash
git checkout -b feat/mejora-filtro-miembro
```

3. Implementa cambios pequenos y enfocados.
4. Ejecuta validaciones antes de enviar:

```bash
pnpm lint
pnpm build
```

5. Escribe un commit claro:

```bash
git commit -m "feat: mejora filtrado por integrante en feed"
```

6. Abre un Pull Request con:
- problema que resuelve
- capturas o video (si hay cambios UI)
- pasos para probar

### Recomendaciones para PR

- Evita mezclar refactors no relacionados.
- Manten compatibilidad responsive (mobile y desktop).
- Si tocas UX, incluye razon del cambio.
- Si agregas dependencias, justificalas.
-Haz cambios pequeños, los cambios masivos / IA masiva se descartarán.

## Licencia

Este proyecto se distribuye bajo licencia **MIT con requisitos adicionales de atribucion y uso**, conforme al archivo `LICENSE`.

Resumen rapido (consulta `LICENSE` para el texto legal completo):

- Se permite usar, copiar, modificar y distribuir el software.
- Debes conservar el aviso de copyright, licencia y atribucion.
- Se requiere incluir en documentacion/creditos:
	- `Powered by BTS Discovery open-source project`
- No se permite usar el software para sistemas de acoso, odio o abuso dirigido.

## Creditos

Proyecto open-source fandom BTS, ninguna imagen se almacena en servidores y todo se extrae de sitios ya existentes en internet, cada imagen lleva referencia al sitio e hipervínculos conectados de atribución, cualquier queja, comentario o mejora será bien recibido al correo vinculado a esta cuenta.
