# WhalinCode

WhalinCode es una reconstrucción práctica y un estudio arquitectónico de un coding agent moderno orientado a terminal.

El proyecto nace como una instancia de aprendizaje profundo inspirada en herramientas como Claude Code, Codex CLI, OpenCode, Gemini CLI y otros agentes modernos de desarrollo asistido por IA.

Su objetivo no es replicar una herramienta existente, sino comprender desde primeros principios cómo se construyen los distintos runtimes que componen un coding agent moderno: interacción con el usuario, identidad, facturación, ejecución de herramientas, streaming, memoria, contexto y orquestación.

Cada módulo implementado constituye un paso más hacia la comprensión completa de la arquitectura interna de estos sistemas.

---

## Índice

- [Filosofía](#filosofía)
- [Objetivo](#objetivo)
- [Descripción arquitectónica](#descripción-arquitectónica)
- [Estado actual](#estado-actual)
- [Configuración de desarrollo](#configuración-de-desarrollo)
- [Arquitectura](#arquitectura)
- [Modelos soportados](#modelos-soportados)
- [Herramientas del agente](#herramientas-del-agente)
- [Context Optimization Strategy](#context-optimization-strategy)
- [Slash Commands](#slash-commands)
- [Flujo del runtime](#flujo-del-runtime)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Conceptos arquitectónicos explorados](#conceptos-arquitectónicos-explorados)
- [Observaciones arquitectónicas](#observaciones-arquitectónicas)
- [Architectural Evolution Guidelines](#architectural-evolution-guidelines)
- [Próximas etapas](#próximas-etapas)
- [Objetivo a largo plazo](#objetivo-a-largo-plazo)

---

## Filosofía

WhalinCode se desarrolla siguiendo algunos principios simples:

- entender antes de abstraer
- contratos antes que implementación
- infraestructura antes que inteligencia
- aprender reconstruyendo sistemas reales
- desarrollar criterio arquitectónico mediante implementación incremental

El objetivo no es únicamente escribir código funcional, sino comprender las decisiones de diseño que dieron origen a las arquitecturas modernas de agentes.

↑ [Índice](#índice)

---

## Objetivo

Comprender cómo funcionan internamente los coding agents modernos mediante:

- reconstrucción práctica
- análisis arquitectónico
- experimentación incremental
- diseño de runtimes especializados
- exploración de patrones de orquestación
- documentación continua del proceso de aprendizaje

---

## Descripción arquitectónica

WhalinCode está compuesto por múltiples runtimes especializados que colaboran para completar una interacción entre el usuario y el modelo.

Cada runtime posee una responsabilidad concreta y mantiene límites claros respecto al resto del sistema.

```text
                        User
                          │
                          ▼
               User Runtime (CLI)
                          │
                          ▼
                  Agent Runtime
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
 Context Runtime   Identity Runtime   Billing Runtime
          │               │               │
          │               │               │
          └───────┬───────┴───────┬───────┘
                  │               │
                  ▼               ▼
             Tool Runtime    AI Providers
                  │
                  ▼
          Local Workspace
```

El **Agent Runtime** coordina la interacción entre los distintos sistemas especializados.

- **User Runtime** administra la experiencia de usuario en la terminal.
- **Context Runtime** recupera únicamente la información necesaria para cada tarea.
- **Tool Runtime** ejecuta capacidades sobre el workspace local.
- **Identity Runtime** autentica y autoriza las solicitudes.
- **Billing Runtime** valida créditos y registra el consumo.
- **LLM Providers** aportan las capacidades de razonamiento del modelo.

Esta separación permite que cada runtime evolucione de forma independiente, manteniendo responsabilidades bien definidas y límites claros entre la infraestructura remota y el entorno local del usuario.

↑ [Índice](#índice)

---

## Estado actual

Actualmente el proyecto implementa:

### User Runtime

- Terminal UI (OpenTUI + React)
- Keyboard Layers
- Slash Commands (`/new`, `/agents`, `/models`, `/sessions`, `/theme`, `/login`, `/logout`, `/upgrade`, `/usage`, `/exit`)
- Command Menu con filtrado
- Dialogs (Agents, Models, Sessions, Theme)
- Toast Notifications
- Prompt Configuration (Mode + Model)
- Session Navigation
- Status Bar
- Theme System

### Identity Runtime

- Clerk Authentication (OAuth)
- PKCE Flow con servidor local efímero
- Browser-based Login (`/login`)
- Local Credential Store (`~/.whalincode/auth.json`)
- OAuth Token Verification (server-side)
- Protected API Routes (middleware `requireAuth`)
- Automatic Token Cleanup on 401

### Billing Runtime

- Usage-Based Billing
- Internal Credits System (1 crédito = USD 0.01)
- Polar Integration (Checkout, Customer Portal, Events Ingestion)
- Credits Balance Validation (middleware `requireCreditsBalance`)
- AI Usage Metering (post-response ingestion)
- Cost Estimation por modelo (input/output tokens → USD → créditos)
- Upgrade Checkout (`/upgrade`)
- Billing Portal (`/usage`)

### Agent Runtime

- Persistent Conversations (JSON en PostgreSQL)
- Structured Message Parts (UIMessage con metadata tipada)
- Thinking / Reasoning Streaming (Anthropic + OpenAI)
- Tool Calling + Local Tool Execution (client-side)
- Automatic Tool Call Loop (`sendAutomaticallyWhen`)
- Dynamic System Prompt Builder (por modo PLAN/BUILD)
- PLAN / BUILD Modes (herramientas dinámicas por modo)
- Multi-provider Models (Anthropic, OpenAI)
- Provider-specific Configuration (thinking budgets, reasoning summaries)
- Message Merge Strategy (deduplicación por ID)
- Pending Tool Call Detection (evita persistir estados incompletos)

### Context Optimization Runtime

Infraestructura orientada a minimizar el consumo de tokens mediante recuperación progresiva de información:

- Progressive Context Retrieval
- File inspection bajo demanda
- Partial File Reading mediante rangos de líneas
- Search-first workflow (`grep → readFile(range)`)
- Tool outputs optimizados para reducir contexto innecesario
- Preparación para Context Budgeting
- Preparación para Persistent File Summaries
- Preparación para Conversation Compression

El objetivo es evitar cargar información completa del workspace cuando solo una pequeña parte es necesaria para resolver una tarea.

### Shared Infrastructure

- Server-Sent Events (SSE via `createUIMessageStreamResponse`)
- Hono RPC (tipado end-to-end CLI ↔ Server)
- Zod Validation (env, requests, tool inputs)
- Shared Tool Contracts (`@whalincode/shared`)
- Prisma + PostgreSQL (Neon) con adapter `@prisma/adapter-pg`
- Sentry Integration (error handling + structured logging)
- Env Validation (Zod schemas en CLI y Server)

↑ [Índice](#índice)

---

## Configuración de desarrollo

### Requisitos previos

Antes de ejecutar WhalinCode localmente, asegúrate de tener instalados los siguientes requisitos:

- [Bun](https://bun.com/docs/installation) (instalación oficial)
- [Git](https://git-scm.com/install/) (instalación oficial)

> **Nota:** El CLI depende del mecanismo de vinculación global de Bun (`bun link`). Se recomienda instalar Bun mediante el instalador oficial, ya que métodos de instalación alternativos podrían no configurar correctamente la ruta del binario global.

### Clonar el repositorio

```bash
git clone https://github.com/MarceM1/WhalinCode.git
cd whalincode
```

### Instalar dependencias

Desde la raíz del repositorio:

```bash
bun install
```

### Configurar el entorno

Crea un archivo `.env` en la raiz del repositorio.
Como mínimo, configura el CLI para conectarse con el servidor local:

```js
API_URL=http://localhost:8787
```

Luego configura las [variables de entorno](#variables-de-entorno) restantes requeridas por el servidor (claves de API, base de datos, proveedores de autenticación, etc.)

### Iniciar el servidor

```bash
bun run dev:server
```

El servidor debe estar ejecutándose antes de iniciar el CLI.

### Vincular el CLI

Desde la raíz del repositorio:

```bash
bun run link:cli
```

Esto registra el comando whalincode globalmente en tu máquina.

### Ejecutar

Una vez que el servidor esté ejecutándose y el CLI haya sido vinculado:

```bash
whalincode
```

El CLI se conectará al servidor local utilizando el valor de API_URL definido en el archivo .env.

> **Estado actual:** En esta etapa, WhalinCode está orientado al desarrollo local. El CLI se comunica con un servidor ejecutándose localmente
> y todavía no existe un endpoint público de producción disponible.

↑ [Índice](#índice)

---

## Arquitectura

Monorepo construido sobre Bun con workspaces.

```text
packages/
├── cli        → Terminal UI (User Runtime)
├── server     → Backend (Agent + Identity + Billing Runtime)
├── shared     → Contratos, modelos y schemas compartidos
└── database   → Prisma client y schema
```

### CLI (`@whalincode/cli`)

Construida con:

- OpenTUI (renderer de terminal)
- React 19
- react-router (createMemoryRouter)
- AI SDK (`@ai-sdk/react`)
- Hono Client (RPC tipado)

Estructura interna:

```text
src/
├── components/
│   ├── command-menu/    → Slash commands + filtrado + hook
│   ├── dialogs/         → Agents, Models, Sessions, Theme
│   ├── messages/        → BotMessage, UserMessage, ErrorMessage
│   ├── session-shell    → Shell principal de sesión
│   ├── input-bar        → Barra de entrada del usuario
│   ├── status-bar       → Barra de estado inferior
│   ├── header           → Header de la aplicación
│   ├── border           → Componente de bordes
│   ├── dialog-search-list → Lista de búsqueda en dialogs
│   └── spinner          → Indicador de carga
├── config/              → Variables de entorno (Zod)
├── hooks/               → useChat (wrapper tipado de @ai-sdk/react)
├── layouts/             → RootLayout (providers) + ThemeRoot
├── lib/
│   ├── api-client       → Hono RPC client con auth automática
│   ├── auth             → Local credential store (~/.whalincode/)
│   ├── oauth            → PKCE login flow completo
│   ├── local-tools      → Ejecución local de herramientas del agente
│   ├── upgrade          → Checkout y billing portal (Polar)
│   └── http-errors      → Manejo de errores HTTP
├── providers/
│   ├── dialog/          → DialogProvider + tipos
│   ├── keyboard-layer/  → KeyboardLayerProvider
│   ├── prompt-config/   → PromptConfigProvider (mode + model)
│   ├── theme/           → ThemeProvider + definiciones de temas
│   └── toast/           → ToastProvider + tipos
├── screens/             → Home, NewSession, Session
└── index.tsx            → Entry point (router + renderer)
```

Su responsabilidad consiste en:

- Representar el estado del runtime
- Ejecutar herramientas localmente
- Administrar el cliente de autenticación local (PKCE OAuth, credential store)
- Gestionar credenciales y tokens locales (`~/.whalincode/auth.json`)
- Interactuar con el usuario

El servidor es responsable de verificar los tokens OAuth antes de autorizar cualquier solicitud.

### Server (`@whalincode/server`)

Construido con:

- Hono + Hono RPC
- AI SDK (`streamText`, `toUIMessageStream`)
- Clerk Backend SDK
- Polar SDK
- Sentry (Hono integration)
- Zod

Estructura interna:

```text
src/
├── config/
│   └── env.ts              → Validación de variables de entorno
├── lib/
│   ├── auth.ts             → Clerk OAuth token verification
│   ├── credits.ts          → Cálculo de créditos (tokens → USD → créditos)
│   ├── models.ts           → Resolución de modelos por provider
│   └── polar.ts            → Checkout, portal, balance, usage ingestion
├── middleware/
│   ├── require-auth.ts     → JWT authentication middleware
│   └── require-credits-balance.ts → Credits validation middleware
├── routes/
│   ├── auth.route.ts       → OAuth callback redirect
│   ├── billing.route.ts    → Checkout + Portal + Success
│   ├── chat.route.ts       → Chat streaming (SSE)
│   └── sessions.route.ts   → CRUD de sesiones
├── system-prompt.ts        → Dynamic prompt builder (PLAN/BUILD)
└── index.ts                → Entry point (Hono app + Sentry + routing)
```

_Aquí reside la lógica central de orquestación del sistema:
gestión del agente, prompts, streaming, autenticación, facturación y persistencia._

### Security Boundary

WhalinCode mantiene una separación clara:

Server:

- identidad
- billing
- orchestration
- AI providers

CLI:

- filesystem access
- tool execution
- workspace interaction

_Esta separación establece una frontera de seguridad donde la infraestructura remota nunca necesita acceso directo al workspace del usuario._

### Database (`@whalincode/database`)

- Prisma con adapter PostgreSQL (Neon)
- Un modelo `Session` con mensajes almacenados como JSON

```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  Json     @default("[]")

  @@index([userId])
}
```

### Shared (`@whalincode/shared`)

Fuente única de verdad para:

- **Tool Contracts** — Schemas Zod + definiciones AI SDK para cada herramienta
- **Tool Input Schemas** — Validación compartida entre CLI (ejecución) y Server (contrato)
- **Modes** — `PLAN` y `BUILD` con schema y tipos
- **Models** — Definiciones de modelos soportados con pricing por provider
- **`getToolContracts(mode)`** — Resolución dinámica de herramientas según el modo activo

↑ [Índice](#índice)

---

## Modelos soportados

| Modelo                          | Provider  | Input (USD/M tokens) | Output (USD/M tokens) |
| ------------------------------- | --------- | -------------------- | --------------------- |
| `claude-sonnet-4-6`             | Anthropic | $3                   | $15                   |
| `claude-haiku-4-5`              | Anthropic | $1                   | $5                    |
| `claude-opus-4-6` **(default)** | Anthropic | $5                   | $25                   |
| `claude-opus-4-8`               | Anthropic | $5                   | $25                   |
| `gpt-5.4`                       | OpenAI    | $2.5                 | $15                   |
| `gpt-5.4-mini`                  | OpenAI    | $0.75                | $4.5                  |
| `gpt-5.4-nano`                  | OpenAI    | $0.2                 | $1.25                 |

Thinking/reasoning habilitado para `claude-opus-4-6`, `claude-sonnet-4-6` y `gpt-5.4`.

↑ [Índice](#índice)

---

## Herramientas del agente

### PLAN (solo lectura)

| Herramienta     | Descripción                               |
| --------------- | ----------------------------------------- |
| `readFile`      | Lee un archivo del proyecto               |
| `listDirectory` | Lista entradas de un directorio           |
| `glob`          | Busca archivos por patrón glob            |
| `grep`          | Busca contenido con expresiones regulares |

### BUILD (lectura + escritura)

Además de las anteriores:

| Herramienta | Descripción                                        |
| ----------- | -------------------------------------------------- |
| `writeFile` | Crea o sobreescribe un archivo                     |
| `editFile`  | Reemplaza texto exacto en un archivo               |
| `bash`      | Ejecuta comandos shell (Bash, Git Bash en Windows) |

Las herramientas se ejecutan localmente en el CLI. La ejecución incluye:

- Confinamiento de rutas para las herramientas de archivos
- Lectura parcial de archivos mediante rangos de líneas (`startLine` / `endLine`)
- Recuperación progresiva de contexto (`grep` → `readFile(range)`)
- Truncado de archivos grandes
- Límite de resultados de búsqueda (200 archivos, 50 matches)
- Filtrado de archivos binarios
- Detección de shell compatible en Windows (Git Bash)
- Timeout configurable para comandos bash (30s por defecto)

↑ [Índice](#índice)

---

## Context Optimization Strategy

Uno de los _principales desafíos de un coding agent moderno es controlar el consumo de contexto._

La **calidad del agente no depende únicamente del modelo utilizado, sino también de la capacidad del runtime para seleccionar qué información necesita enviar al modelo.**

WhalinCode implementa una estrategia de recuperación progresiva:

```text
User Task
    ↓
Search / Discovery
    ↓
grep()
    ↓
Match Locations
    ↓
readFile(startLine, endLine)
    ↓
Relevant Context
    ↓
LLM Reasoning
    ↓
Edit / Execute
```

En lugar de cargar archivos completos:

```text
readFile({path: file.ts})
↓
500 líneas enviadas al modelo
```

el agente recupera únicamente la sección necesaria:

```text
grep("authentication")
↓
auth.ts:120
↓
readFile({
    path: auth.ts,
    startLine: 110,
    endLine: 140
})
↓
30 líneas relevantes
```

> **Ejemplo de recuperación de contexto:**
>
> Lectura completa del archivo:
> 500 líneas → ~5000 tokens
>
> Recuperación progresiva:
> 30 líneas relevantes → ~300 tokens
>
> ≈ 94% de reducción en el contexto transferido al modelo

### Beneficios esperados

- Menor consumo de input tokens
- Menor coste por interacción
- Mayor ventana disponible para razonamiento
- Menor ruido contextual
- Mejor escalabilidad en proyectos grandes

↑ [Índice](#índice)

---

## Slash Commands

| Comando     | Acción                            |
| ----------- | --------------------------------- |
| `/new`      | Inicia un nuevo proyecto          |
| `/agents`   | Selecciona modo (PLAN/BUILD)      |
| `/models`   | Selecciona modelo de IA           |
| `/sessions` | Navega sesiones anteriores        |
| `/theme`    | Cambia el tema de colores         |
| `/login`    | Inicia sesión via browser (PKCE)  |
| `/logout`   | Cierra sesión                     |
| `/upgrade`  | Abre checkout de créditos (Polar) |
| `/usage`    | Abre portal de facturación        |
| `/exit`     | Sale de la aplicación             |

---

## Flujo del runtime

```text
User Input
    ↓
User Runtime (Terminal UI)
    ↓
Identity Runtime (Clerk OAuth + JWT)
    ↓
Billing Runtime (Polar credits check)
    ↓
Agent Runtime (streamText + system prompt)
    ↓
LLM (Anthropic / OpenAI)
    ↓
SSE Stream → Terminal UI
    ↓
Tool Call → Local Execution (CLI) → Tool Output → LLM (loop)
    ↓
Persistence (Prisma → Neon PostgreSQL)
    ↓
Usage Metering (Polar ingestion)
```

↑ [Índice](#índice)

---

## Variables de entorno

### Server

| Variable                    | Descripción                                 |
| --------------------------- | ------------------------------------------- |
| `ANTHROPIC_API_KEY`         | API key de Anthropic                        |
| `OPENAI_API_KEY`            | API key de OpenAI                           |
| `DATABASE_URL`              | Connection string PostgreSQL (Neon)         |
| `SENTRY_DSN`                | DSN de Sentry                               |
| `SENTRY_TRACES_SAMPLE_RATE` | Sample rate de traces (default: 1.0)        |
| `CLERK_SECRET_KEY`          | Secret key de Clerk                         |
| `CLERK_PUBLISHABLE_KEY`     | Publishable key de Clerk                    |
| `POLAR_ACCESS_TOKEN`        | Token de acceso de Polar                    |
| `POLAR_PRODUCT_ID`          | ID del producto en Polar                    |
| `POLAR_CREDITS_METER_ID`    | ID del meter de créditos en Polar           |
| `POLAR_SERVER`              | Entorno de Polar (`sandbox` o `production`) |

### CLI

| Variable                | Descripción           |
| ----------------------- | --------------------- |
| `API_URL`               | URL del servidor API  |
| `CLERK_FRONTEND_API`    | Frontend API de Clerk |
| `CLERK_OAUTH_CLIENT_ID` | Client ID de OAuth    |

↑ [Índice](#índice)

---

## Scripts

```bash
# Iniciar servidor
bun run start

# Desarrollo
bun run dev:cli          # CLI con watch
bun run dev:server       # Server con hot reload

# Calidad
bun run format           # Prettier
bun run format:check     # Verificar formato
bun run typecheck        # TypeScript (todos los paquetes)
```

---

## Conceptos arquitectónicos explorados

Hasta el momento el proyecto estudia e implementa:

```md
- Context Optimization
- Progressive Context Retrieval
- Token Efficiency Strategies
- Agent Runtimes
- User Runtimes
- Identity Runtimes
- Billing Runtimes
- Tool Calling + Local Execution
- Message Parts (UIMessage)
- Thinking / Reasoning Streaming
- Dynamic Prompt Builders
- Context Management
- Runtime Composition
- OAuth PKCE
- Usage-Based Billing
- SSE Streaming
- Persistence
- Orchestration
- Keyboard Ownership
- Terminal Rendering
- End-to-End Type Safety (Hono RPC)
- Provider Abstraction
```

↑ [Índice](#índice)

---

## Observaciones arquitectónicas

Algunos aprendizajes obtenidos durante el desarrollo:

- Los coding agents modernos se parecen mucho más a sistemas de orquestación que a aplicaciones de chat.
- Un agente moderno está compuesto por múltiples runtimes especializados que colaboran entre sí.
- Las herramientas representan capacidades del runtime, no funcionalidades aisladas.
- Los Message Parts constituyen una representación mucho más extensible que el texto plano.
- La experiencia del usuario no termina en la interfaz; el User Runtime constituye una infraestructura propia.
- La autenticación y la facturación son responsabilidades independientes del Agent Runtime.
- La calidad de las herramientas influye tanto en el comportamiento del agente como la elección del modelo.
- La infraestructura transversal suele aportar más valor que incorporar nuevos modelos.
- Las herramientas se ejecutan en el cliente, no en el servidor — el agente propone, el CLI ejecuta.
- El tipado end-to-end (Hono RPC) elimina categorías enteras de errores entre CLI y Server.
- La ejecución de Bash en Windows requiere un shell compatible; los modelos de IA generan Bash por defecto.
- La optimización de tokens no depende únicamente de utilizar modelos más económicos; depende principalmente de cómo el runtime recupera, comprime y presenta información al modelo.
- Un coding agent eficiente no debe conocer todo el workspace constantemente, sino recuperar contexto relevante bajo demanda.
- Las herramientas del agente forman parte del sistema de gestión de contexto, no únicamente de la capa de ejecución.

---

## Architectural Evolution Guidelines

Esta sección funciona como una guía de dirección arquitectónica para futuras etapas de WhalinCode.

El objetivo no es únicamente incorporar nuevas funcionalidades, sino evolucionar progresivamente desde una reconstrucción experimental hacia un runtime de agente más completo, observable y production-oriented.

Algunas áreas identificadas como puntos clave de maduración:

### Formalización de decisiones arquitectónicas

A medida que el sistema crezca, las decisiones importantes deberían documentarse junto con:

- problema identificado
- contexto técnico
- decisión tomada
- alternativas consideradas
- trade-offs aceptados

El objetivo es conservar no solo qué implementa WhalinCode, sino por qué determinadas decisiones arquitectónicas existen.

---

### Métricas y validación de optimizaciones

Las optimizaciones de contexto deben _evolucionar desde estrategias heurísticas hacia mecanismos medibles._

Especialmente:

- reducción real de input tokens
- impacto del progressive retrieval
- eficiencia de tool outputs
- coste por interacción
- utilización efectiva del context window

La optimización del agente debe poder **evaluarse mediante datos, no únicamente mediante percepción.**

---

### Evolución del Context Runtime

El sistema de contexto representa una de las áreas más importantes del agente.

Su evolución natural contempla componentes especializados como:

- Context Retrieval
- Context Ranking
- Context Budgeting
- Tool Result Compression
- Persistent File Summaries
- Conversation Compression
- Workspace Memory

**El objetivo es que el agente no mantenga conocimiento constante del workspace, sino que construya contexto relevante dinámicamente según la tarea.**

---

### Evolución hacia runtimes especializados

La arquitectura actual separa responsabilidades entre diferentes runtimes.

Las futuras capacidades deberían mantener esta filosofía:

- User Runtime → interacción y experiencia del usuario
- Agent Runtime → razonamiento y orquestación
- Tool Runtime → capacidades externas
- Context Runtime → selección y optimización de información
- Permission Runtime → control de acciones
- Memory Runtime → persistencia de conocimiento relevante

_La complejidad de un coding agent moderno debe resolverse mediante composición de sistemas especializados, no mediante un único núcleo monolítico._

---

### Seguridad y control de ejecución

La **ejecución local de herramientas es una decisión arquitectónica central**, pero requiere evolucionar hacia mecanismos más completos:

- permisos explícitos
- aprobación de acciones sensibles
- aislamiento de ejecución
- políticas por workspace
- trazabilidad de operaciones

El agente debe poder actuar sobre un entorno real manteniendo límites claros entre autonomía y control del usuario.

---

### De reconstrucción a plataforma de agente

La evolución final de WhalinCode no depende únicamente de agregar más modelos o herramientas.

El objetivo es construir una arquitectura donde:

- el modelo aporta razonamiento
- el runtime administra contexto
- las herramientas proporcionan capacidades
- la infraestructura mantiene identidad, coste y estado
- el usuario conserva control sobre las acciones

La calidad de un coding agent dependerá de cómo estos sistemas colaboran entre sí.

↑ [Índice](#índice)

---

## Próximas etapas

Las siguientes fases del proyecto se enfocarán en mejorar la eficiencia, autonomía y seguridad del runtime del agente:

### Context Optimization

- Context Budgeting
- Persistent File Summaries
- Conversation Compression
- Tool Result Compression
- Token Usage Telemetry

### Agent Capabilities

- Tool Context
- Permission Runtime
- Agent Loop
- Hierarchical Memory
- Workspace Runtime
- Spec-driven Workflows

### Infrastructure

- Runtime Telemetry
- Sandboxed Execution

↑ [Índice](#índice)

---

## Objetivo a largo plazo

WhalinCode no pretende convertirse simplemente en otra interfaz para modelos de lenguaje.

El proyecto busca **reconstruir, documentar y comprender** la arquitectura completa de un coding agent moderno desde primeros principios.

Cada nueva infraestructura incorporada representa una oportunidad para estudiar cómo **interactúan los distintos runtimes** que conforman estos sistemas y desarrollar **criterio arquitectónico a partir de su implementación real.**
