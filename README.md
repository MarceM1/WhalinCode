# WhalinCode

WhalinCode es mi reconstrucción y estudio práctico de un sistema moderno de agentes de código orientado a terminal.

El proyecto nace como una instancia de aprendizaje arquitectónico profundo, inspirado por herramientas como Claude Code, Codex CLI, OpenCode, Gemini CLI y otros coding agents modernos.

Su objetivo no es replicar una herramienta existente, sino comprender desde primeros principios cómo se construyen los runtimes agentic modernos: cómo razonan, ejecutan herramientas, administran contexto, transmiten información en streaming y coordinan la interacción entre el usuario y un modelo de lenguaje.

---

# Filosofía

WhalinCode se construye siguiendo algunos principios simples:

- entender antes de abstraer
- contratos antes que implementación
- infraestructura antes que modelos
- aprender reconstruyendo sistemas reales
- desarrollar criterio arquitectónico mediante implementación incremental

Cada módulo intenta responder no solamente **cómo** funciona un sistema moderno de agentes, sino también **por qué** fue diseñado de esa manera.

---

# Objetivo

Comprender cómo funcionan internamente los coding agents modernos mediante:

- reconstrucción práctica
- análisis arquitectónico
- experimentación incremental
- diseño de runtimes agentic
- exploración de patrones de orquestación
- documentación continua del proceso de aprendizaje

---

# Estado actual

WhalinCode evolucionó desde una Terminal UI experimental hacia un **runtime conversacional orientado a agentes**.

Actualmente el sistema soporta:

- conversaciones persistentes
- streaming mediante Server-Sent Events
- Message Parts estructurados
- Thinking / Reasoning streaming
- Tool Calling
- ejecución de herramientas
- múltiples modelos
- modos operativos (PLAN / BUILD)
- construcción dinámica del System Prompt
- infraestructura preparada para Agent Loops

La arquitectura continúa evolucionando como parte del estudio de sistemas agentic modernos.

---

# Arquitectura

Monorepo construido sobre Bun.

```
packages/
├── cli
├── server
├── shared
└── database
```

## CLI

- OpenTUI
- React
- createMemoryRouter
- SessionShell
- ThemeProvider
- DialogProvider
- KeyboardLayer
- PromptConfigProvider
- StatusBar
- SearchList reutilizable

## Server

- Hono
- Hono RPC
- AI SDK
- Zod
- Sentry

## Database

- Prisma
- Neon PostgreSQL

## Shared

Fuente única de verdad para:

- contratos
- modelos
- Zod Schemas
- Stream Contracts

---

# Runtime

El flujo principal del runtime actualmente es:

```
User

↓

Terminal UI

↓

useChat()

↓

POST /chat/:sessionId

↓

Hono

↓

buildSystemPrompt()

↓

createTools()

↓

AI SDK

↓

LLM

↓

Tool Execution

↓

Streaming (SSE)

↓

Message Parts

↓

Terminal UI
```

---

# Infraestructura implementada

## Runtime

- sesiones persistentes
- conversación resumible
- streaming SSE
- interrupción de generación
- reanudación de respuestas
- selección de modelo
- modos PLAN / BUILD

## Agent Runtime

- System Prompt dinámico
- Tool Calling
- Tool Execution
- Message Parts
- Thinking Streaming
- Tool Streaming
- Provider Options por modelo
- capacidades según modo operativo

## Terminal UI

- layout principal
- SessionShell
- command system
- dialogs reutilizables
- keyboard layers
- overlays
- theme system
- status bar
- rendering terminal-first

---

# Herramientas disponibles

## PLAN

Herramientas de solo lectura:

- readFile
- listDirectory
- grep
- glob

## BUILD

Además de las anteriores:

- writeFile
- editFile
- bash

Las herramientas disponibles se determinan dinámicamente según el modo operativo del runtime.

---

# Conceptos arquitectónicos explorados

Hasta el momento el proyecto estudia e implementa:

- agent runtimes
- tool calling
- tool execution
- message parts
- reasoning streaming
- system prompts
- context management
- persistence
- streaming
- orchestration
- runtime interaction
- keyboard ownership
- responder chains
- overlays
- terminal rendering
- workflows spec-driven

---

# Observaciones arquitectónicas

Algunos aprendizajes obtenidos durante el desarrollo:

- Los coding agents modernos se parecen mucho más a sistemas de orquestación que a aplicaciones de chat.
- Las herramientas constituyen capacidades del runtime, no funcionalidades aisladas.
- El razonamiento, la ejecución de herramientas y la respuesta final representan estados diferentes dentro de una misma conversación.
- Los Message Parts ofrecen una representación mucho más extensible que el texto plano.
- El modo operativo deja de ser una característica visual y pasa a modificar el comportamiento completo del agente.
- La infraestructura transversal (streaming, persistencia, contexto y ejecución) resulta más importante que el modelo utilizado.

---

# Próximas etapas

La siguiente fase del proyecto se enfocará en:

- Tool Registry
- Permission System
- Context Compression
- Hierarchical Memory
- Agent Loops
- Spec-driven Workflows
- Runtime Telemetry
- Sandboxed Execution

---

# Objetivo a largo plazo

WhalinCode no pretende convertirse simplemente en otra interfaz para modelos de lenguaje.

El proyecto busca construir, documentar y comprender una arquitectura moderna de agentes de software desde primeros principios, utilizando cada etapa como una oportunidad para desarrollar criterio arquitectónico y entender cómo están diseñados los coding agents actuales.
