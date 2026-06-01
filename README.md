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
├── assets/
│   ├── hero.png
│   ├── vite.svg
│   └── vue.svg
├── components/
│   ├── HelloWorld.vue
│   └── TransactionFormModal.vue
├── layouts/
│   └── AppLayout.vue
├── router/
│   └── index.js
├── services/
│   └── api.js
├── stores/
│   ├── auth.js
│   ├── budgets.js
│   ├── categories.js
│   ├── index.js
│   └── users.js
├── views/
│   ├── AccountsView.vue
│   ├── BudgetsView.vue
│   ├── CategoriesView.vue
│   ├── DashboardView.vue
│   ├── ForbiddenView.vue
│   ├── HomeView.vue
│   ├── LoginView.vue
│   ├── ProfileView.vue
│   ├── RegisterView.vue
│   ├── ReportsView.vue
│   ├── TransactionsView.vue
│   └── UsersView.vue
├── App.vue
├── main.js
└── style.css
```

## Instalación y uso

### Requisitos previos

- Node.js >= 18
- npm >= 9

### Instalar dependencias

```bash
npm install
npm install vue-router@4 pinia axios
npm install chart.js
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
