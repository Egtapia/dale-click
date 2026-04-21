# Chatbot Handoff

Este chatbot interno de Dale Click queda separado en frontend y backend para que otro integrante lo conecte a su entorno.

## Archivos a compartir

Frontend:
- `buyer/index.html`
- `assets/css/chatbot.css`
- `assets/js/chatbot.js`

Backend:
- `backend/routes/chatbot.routes.js`
- `backend/controllers/chatbot.controller.js`
- `backend/utils/chatbot-knowledge.js`
- `backend/server.js`
- `backend/.env.example`

## Endpoint principal

- `POST /api/chatbot/message`

Body:

```json
{
  "message": "Quiero algo barato en Managua"
}
```

## Endpoint de prueba

- `GET /api/chatbot/health`

Debe responder:

```json
{
  "ok": true,
  "message": "Chatbot listo."
}
```

## Variables de entorno

Crear `backend/.env` usando `backend/.env.example`.

Variables necesarias:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`

## Que hace el chatbot

- Responde FAQs del documento `DaleClick Q&A.pdf`
- Busca productos por texto, categoria, ciudad y presupuesto
- Sugiere negocios
- Si el usuario tiene token, puede responder sobre reservas recientes

## Intenciones actuales

- `greeting`
- `faq`
- `product_search`
- `cheap_products`
- `recommend_products`
- `business_search`
- `my_reservations`
- `fallback`

## Como probar localmente

1. Crear `backend/.env`
2. Ejecutar en `backend`:

```powershell
npm.cmd start
```

3. Abrir:

```text
http://localhost:3001/index.html
```

4. Probar mensajes:
- `hola`
- `como funciona Dale Click`
- `quiero algo barato`
- `muestrame comida`
- `quiero ver negocios en managua`
- `mis reservas`

## Notas

- El frontend del chatbot consume `POST /api/chatbot/message`
- El widget ya esta montado en `buyer/index.html`
- Si no aparecen productos, revisar primero `GET /api/products`
