# ProspectoCRM

CRM de prospección inteligente con integración de Google Maps, WhatsApp y Email.

## 🚀 Características

### Prospección con Google Maps
- **Búsqueda por nicho y ubicación**: Encontrá negocios por rubro (restaurantes, peluquerías, gimnasios, etc.) y zona geográfica
- **Algoritmo de probabilidad de web**: Cada prospecto tiene un score del 0-100% indicando qué tan probable es que necesite un sitio web
- **Factores del algoritmo**:
  - Sin sitio web actual (+40 puntos)
  - Categoría de alto impacto visual (+25 puntos)
  - Rating bajo que podría mejorar con presencia online
  - Pocas reseñas que indican negocio nuevo
  - Sin fotos profesionales
  - Negocio local vs cadena

### Comunicación Multicanal
- **WhatsApp** via Evolution API v2
- **Email** via Gmail API con OAuth
- **Inbox unificado** para todas las conversaciones

### Gestión de Pipeline
- **Vista Kanban** para visualizar etapas
- **Vista Tabla** con filtros y búsqueda
- **Etapas personalizables** con colores

### Dashboard
- Métricas en tiempo real
- Tasa de conversión
- Actividad reciente
- Tareas pendientes

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Estilos**: Tailwind CSS con tema oscuro y glassmorphism
- **Base de datos**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Autenticación**: NextAuth.js
- **Animaciones**: Framer Motion
- **Estado**: TanStack Query + Zustand

## 📋 Requisitos Previos

- Node.js 18+
- PostgreSQL (o cuenta en Supabase)
- Cuenta de Google Cloud (para Places API y Gmail API)
- Evolution API (para WhatsApp) - opcional

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/prospecto-crm.git
cd prospecto-crm
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiá el archivo de ejemplo y completá las variables:

```bash
cp .env.example .env.local
```

Variables requeridas:

```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@host:5432/database"
DIRECT_URL="postgresql://usuario:password@host:5432/database"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-generado-con-openssl"

# Google OAuth
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"

# Google Places API
GOOGLE_PLACES_API_KEY="tu-api-key"

# Evolution API (WhatsApp)
EVOLUTION_API_URL="https://tu-evolution.com"
EVOLUTION_API_KEY="tu-api-key"
EVOLUTION_INSTANCE_NAME="tu-instancia"

# Modo demo (para testing sin APIs reales)
DEMO_MODE="false"
```

### 4. Configurar la base de datos

```bash
# Generar cliente Prisma
npx prisma generate

# Aplicar migraciones
npx prisma migrate dev

# (Opcional) Abrir Prisma Studio
npx prisma studio
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🌐 Configuración de APIs

### Google Places API

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear un nuevo proyecto
3. Habilitar "Places API" y "Maps JavaScript API"
4. Crear credenciales (API Key)
5. Restringir la API Key a tu dominio

### Gmail API

1. En Google Cloud Console, habilitar "Gmail API"
2. Crear credenciales OAuth 2.0
3. Configurar la pantalla de consentimiento
4. Agregar los scopes: `gmail.send`, `gmail.readonly`

### Evolution API (WhatsApp)

1. Instalar Evolution API: [Documentación](https://doc.evolution-api.com)
2. Obtener la URL del servidor y API Key
3. Crear una instancia
4. Configurar el webhook URL: `https://tu-app.com/api/whatsapp/webhook`

## 🎨 Modo Demo

Para probar la aplicación sin configurar APIs reales:

```env
DEMO_MODE="true"
```

Esto habilitará:
- Datos de ejemplo en Google Places
- Simulación de envío de WhatsApp/Email
- Usuario demo (email: demo@prospecto.com, password: demo123)

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── api/               # API Routes
│   │   ├── auth/          # NextAuth
│   │   ├── leads/         # CRUD de leads
│   │   ├── places/        # Google Places
│   │   ├── whatsapp/      # Evolution API
│   │   └── email/         # Gmail API
│   ├── dashboard/         # Páginas del dashboard
│   │   ├── leads/         # Lista y detalle de leads
│   │   ├── search/        # Búsqueda en Maps
│   │   ├── inbox/         # Inbox unificado
│   │   └── settings/      # Configuración
│   └── login/             # Autenticación
├── components/            # Componentes React
│   └── ui/               # Componentes de UI
├── lib/                   # Utilidades y servicios
│   ├── prisma.ts         # Cliente Prisma
│   ├── auth.ts           # Configuración NextAuth
│   ├── evolution.ts      # Cliente Evolution API
│   ├── gmail.ts          # Cliente Gmail API
│   └── scoring.ts        # Algoritmo de probabilidad
└── types/                # TypeScript types
```

## 🚀 Deploy en Vercel

1. Conectar repositorio a Vercel
2. Configurar variables de entorno en el dashboard
3. Deploy automático en cada push

```bash
# O deploy manual
vercel --prod
```

## 📄 Licencia

MIT

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir un Pull Request
