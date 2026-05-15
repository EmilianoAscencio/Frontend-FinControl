# Frontend — Vue 3 + Vite

Interfaz de usuario del proyecto, construida con Vue 3 y Vite.

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Vue 3 | ^3.x | Framework principal |
| Vite | ^6.x | Bundler y servidor de desarrollo |
| Vue Router | ^4.x | Manejo de rutas |
| Pinia | ^2.x | Manejo de estado |
| Axios | ^1.x | Cliente HTTP |

## Estructura del proyecto

```txt
src/
├── components/   # Componentes reutilizables
├── views/        # Vistas/páginas de la aplicación
├── router/       # Configuración de rutas (Vue Router)
├── stores/       # Stores de estado global (Pinia)
├── services/     # Servicios y cliente HTTP (Axios)
└── main.js       # Punto de entrada de la aplicación
```

## Instalación y uso

### Requisitos previos

- Node.js >= 18
- npm >= 9

### Instalar dependencias

```bash
npm install
npm install vue-router@4 pinia axios
```

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:3000
```

## Levantar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en:

```txt
http://localhost:5173
```

## Ramas

| Rama | Descripción |
|---|---|
| main | Código en producción |
| develop | Rama principal de desarrollo |
| feature/* | Nuevas funcionalidades |
