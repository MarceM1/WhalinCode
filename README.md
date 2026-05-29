# WhalinCode

WhalinCode es mi reconstrucción y estudio práctico de un sistema moderno de agentes de código orientado a terminal.

El proyecto nace como una instancia de aprendizaje arquitectónico profundo, inspirado por herramientas como Claude Code, Codex, OpenCode y otros coding agents modernos.

Actualmente el objetivo no es simplemente “crear una CLI”, sino comprender e internalizar cómo se construyen los sistemas interactivos y agentic modernos desde sus capas fundamentales.

---

# Objetivo actual

Comprender cómo funcionan internamente los sistemas agentic modernos mediante:

* reconstrucción práctica
* análisis arquitectónico
* exploración de runtime interaction
* diseño de infraestructura interactiva
* experimentación incremental

---

# Estado actual

WhalinCode se encuentra actualmente en una etapa temprana pero ya cuenta con una primera capa sólida de infraestructura interactiva.

La aplicación evolucionó desde una simple terminal UI hacia un runtime interactivo compuesto por providers coordinados y sistemas explícitos de ownership, overlays e interacción contextual.

La arquitectura continúa evolucionando mientras avanzo en el estudio e implementación del sistema.

---

# Infraestructura implementada

## Foundations

* Bun monorepo workspace
* OpenTUI runtime
* configuración modular de packages
* arquitectura TypeScript compartida
* estructura escalable para futuras capas agentic

## Terminal UI

* layout principal de la CLI
* header, status bar e input bar
* componentes reutilizables
* command menu contextual
* rendering terminal-first

## UI Infrastructure

* ToastProvider global
* DialogProvider
* KeyboardLayerProvider
* ThemeProvider
* overlays interactivos
* responder chains
* keyboard ownership
* propagation control
* interaction hierarchy
* preview dinámico de themes

---

# Conceptos arquitectónicos explorados

* loops agentic
* tool calling
* streaming
* runtime interaction
* ownership contextual
* responder chains
* overlays y modal systems
* propagation de eventos
* orchestration
* manejo de estado
* gestión de contexto
* rendering en terminal
* workflows spec-driven

---

# Observaciones arquitectónicas

* Los agentes modernos se parecen más a sistemas orquestadores que a simples chats.
* La terminal obliga a reconstruir explícitamente muchos comportamientos normalmente abstraídos por el navegador.
* El ownership del input y la propagación de eventos se vuelven centrales en sistemas interactivos complejos.
* Las interfaces conversacionales probablemente representen una evolución natural del tooling agentic.
* Los providers funcionan como infraestructura transversal y coordinación global del runtime.

---

# Dirección exploratoria

WhalinCode actualmente explora una posible evolución hacia:

* interaction systems conversacionales
* tooling AI-native
* runtimes híbridos conversación + comandos
* workflows multimodales
* sistemas interactivos centrados en intención contextual

---

# Filosofía actual

* aprender reconstruyendo
* entender antes de abstraer
* priorizar arquitectura sobre wrappers
* explicitar límites de ejecución
* desarrollar pensamiento sistémico
* documentar razonamiento arquitectónico
* construir infraestructura composable
* explorar interacción AI-native
