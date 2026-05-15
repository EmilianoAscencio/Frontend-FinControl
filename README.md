# Frontend — Vue 3 + Vite
Interfaz de usuario del proyecto, construida con Vue 3 y Vite.

## Tecnologías

| Tecnología                                | Versión   | Uso                               |
+-------------------------------------------------------------------------------------------+
| [Vue 3](https://vuejs.org/)               | ^3.x      | Framework principal               |
| [Vite](https://vitejs.dev/)               | ^6.x      | Bundler y servidor de desarrollo  |
| [Vue Router](https://router.vuejs.org/)   | ^4.x      | Manejo de rutas                   |
| [Pinia](https://pinia.vuejs.org/)         | ^2.x      | Manejo de estado                  |
| [Axios](https://axios-http.com/)          | ^1.x      | Cliente HTTP                      |

## Estructura del proyecto
src/
├── components/     # Componentes reutilizables
├── views/          # Vistas/páginas de la aplicación
├── router/         # Configuración de rutas (Vue Router)
├── stores/         # Stores de estado global (Pinia)
├── services/       # Servicios y cliente HTTP (Axios)
└── main.js         # Punto de entrada de la aplicación

## Instalación y uso

### Requisitos previos

- Node.js >= 18
- npm >= 9

### Instalar dependencias

npm install vue-router@4 pinia axios
npm install

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

VITE_API_URL=http://localhost:3000


### Levantar servidor de desarrollo

npm run dev

La aplicación estará disponible en `http://localhost:5173`

## Ramas

| Rama          | Descripción                   |
+-----------------------------------------------+
| `main`        | Código en producción          |
| `develop`     | Rama principal de desarrollo  |
| `feature`     | Nuevas funcionalidades        |
