# WhalinCode

WhalinCode es mi reconstrucción y estudio práctico de un sistema moderno de agentes de código orientado a terminal.

El proyecto nace principalmente como una instancia de aprendizaje arquitectónico profundo, tomando inspiración de herramientas como Claude Code, Codex, OpenCode y otros coding agents modernos.

Actualmente el objetivo no es “crear un producto final”, sino entender e internalizar:

- loops agentic
- tool calling
- streaming
- orquestación
- manejo de estado
- ejecución de herramientas
- rendering en terminal
- gestión de contexto
- sistemas de permisos
- workflows spec-driven

---

# Objetivo actual

Comprender cómo funcionan internamente los sistemas agentic modernos mediante reconstrucción práctica, análisis arquitectónico y experimentación.

---

# Estado actual

Fase temprana de exploración y aprendizaje.

La arquitectura, abstracciones y dirección del sistema todavía están evolucionando mientras avanzo en el estudio e implementación del proyecto.

---

# Áreas de estudio

- SSE (Server-Sent Events)
- Streaming parcial
- Tool execution loops
- Agent orchestration
- Context management
- Terminal UI
- Sistemas de permisos
- Persistencia de sesiones
- Arquitecturas event-driven
- Workflows spec-driven

---

# Notas arquitectónicas

## Observaciones

- La separación plan/build introduce límites de ejecución muy importantes.
- El streaming parcial complejiza muchísimo el manejo de estado.
- Los agentes se parecen más a sistemas orquestadores que a simples chats.
- Las terminal UIs requieren modelado explícito de interacciones.

## Preguntas abiertas

- ¿Cómo debería manejarse la memoria a largo plazo?
- ¿Cómo controlar el crecimiento del contexto?
- ¿Cómo versionar specs y tareas?
- ¿Cómo validar ejecución de herramientas?
- ¿Cómo diseñar boundaries claros entre capas?

---

# Filosofía actual (tentativa)

- aprender reconstruyendo
- entender antes de abstraer
- priorizar arquitectura sobre wrappers
- explicitar límites de ejecución
- desarrollar pensamiento sistémico
- documentar el razonamiento arquitectónico