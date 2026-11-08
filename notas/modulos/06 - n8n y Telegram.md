## 🤖 Fase 6: Backup bajo demanda con n8n y Telegram

> [!info] Objetivo
> Permitir que **cualquier persona autorizada** dispare un backup manual enviando `/backup CLAVE` a un bot de Telegram, y que reciba de vuelta un **resumen legible** con el estado de las 3 copias (local, externo, R2).

> [!question] Prerrequisitos
> - [[04 - Script maestro de backup]] (el workflow ejecuta ese script, debe funcionar a mano)
> - Cuenta de Telegram
> - Node.js instalado (para instalar n8n vía npm)
> - `cloudflared` instalado (para el túnel HTTPS)

---

## 📖 Conceptos previos

### ¿Qué es n8n?

Una herramienta de **automatización por nodos**: cada nodo hace una cosa (recibir un mensaje, ejecutar un comando, enviar una respuesta) y se conectan entre sí formando un *workflow*. Los datos viajan de nodo en nodo como objetos JSON. Corre localmente en nuestro PC, sin Docker, instalado con npm.

### ¿Qué es un webhook y por qué necesitamos un túnel?

Cuando alguien escribe al bot, **Telegram necesita una URL pública HTTPS** a la cual enviar ese mensaje (eso es el webhook). Pero nuestro n8n corre en `localhost`, invisible desde internet. La solución es **cloudflared**: crea un túnel que expone nuestro `localhost:5678` en una URL pública temporal, y esa URL se la registramos a Telegram.

### ¿Cuál es la barrera de seguridad?

La **clave** (`Sakila2026!`) y nada más. No se restringe por chat ID: *cualquiera que conozca la clave* puede lanzar un backup. Es un modelo de "secreto compartido" — simple y suficiente para un laboratorio; en producción se combinaría con lista blanca de usuarios.

### Las piezas que usaremos

| Pieza | Qué es | Rol en el flujo |
|---|---|---|
| Bot de Telegram | Bot creado con @BotFather | Interfaz con el usuario (recibe comandos, envía respuestas) |
| n8n | Motor de workflows (npm) | Orquesta: recibir → validar → ejecutar → responder |
| cloudflared | Túnel HTTPS temporal | Da a n8n una URL pública para el webhook |
| `NODES_EXCLUDE="[]"` | Variable de entorno | Habilita el nodo Execute Command (deshabilitado por defecto en n8n 2.x) |
| `WEBHOOK_URL` | Variable de entorno | Le dice a n8n cuál es su URL pública para registrarse en Telegram |

### El flujo completo

```
Telegram ──▶ n8n (workflow) ──▶ ejecuta backup_db.sh ──▶ responde resumen al chat
```

---

## 🤖 Paso 1: Crear el bot de Telegram

1. En Telegram, abrir chat con **@BotFather**.
2. Enviar `/newbot` y seguir el asistente (nombre visible + username terminado en `bot`).
3. BotFather entrega el **token** (formato `123456:ABC-DEF...`). Guardarlo.

> [!warning] El token es una credencial
> No compartirlo en capturas ni subirlo a repositorios. Quien tenga el token, controla el bot.

---

## 📦 Paso 2: Instalar n8n y entender sus dos variables críticas

```bash
npm install -g n8n
```

Antes de arrancarlo hay que entender dos detalles que nos ahorran horas de errores:

> [!warning] Execute Command viene deshabilitado
> En n8n 2.x el nodo que ejecuta comandos del sistema **no aparece en el buscador** por defecto. Se habilita arrancando con `NODES_EXCLUDE="[]"` (lista de exclusiones vacía).

> [!warning] Sin WEBHOOK_URL no se puede publicar
> n8n necesita conocer su URL pública para registrársela a Telegram. Sin ella, al publicar el workflow falla con `Bad request: invalid webhook URL`.

---

## 🌐 Paso 3: Levantar el túnel y arrancar n8n

**Terminal 1** — el túnel:

```bash
cloudflared tunnel --url http://localhost:5678
```

Imprime una URL temporal tipo `https://palabras-aleatorias.trycloudflare.com`. Copiarla.

**Terminal 2** — n8n con las dos variables:

```bash
NODES_EXCLUDE="[]" WEBHOOK_URL="https://<url-del-tunel>.trycloudflare.com/" n8n start
```

- `WEBHOOK_URL` debe ser la URL **exacta** del túnel, con `https://` y `/` final.
- n8n queda disponible en `http://localhost:5678`.

> [!note] La URL del túnel es efímera
> Cada reinicio de cloudflared genera una URL **distinta** → hay que reiniciar n8n con la nueva `WEBHOOK_URL` y republicar el workflow.

---

## 🧩 Paso 4: Construir el workflow, nodo por nodo

Estructura final del canvas (7 nodos):

```
Telegram disparador ─▶ Recibe y valida el mensaje ─▶ If ──true──▶ Ejecutar el script ─▶ Formatear mensaje ─▶ Enviar respuesta
                                                        └─false──▶ Mensaje de error
```

### Nodo 1 — Telegram disparador *(Telegram Trigger)*

- **Credential:** crear credencial pegando el token del bot.
- **Updates:** `message`.

Cuando alguien escribe al bot, Telegram hace POST al webhook y este nodo inicia la ejecución. Su salida trae `message.text` (el texto) y `message.chat.id` (a quién responder).

### Nodo 2 — Recibe y valida el mensaje *(Code)*

- **Mode:** `Run Once for Each Item` · **Language:** JavaScript

```javascript
const texto = ($json.message?.text || "").trim();
const partes = texto.split(" ");

const CLAVE_CORRECTA = "Sakila2026!";   // <-- única barrera de seguridad

if (partes[0] !== "/backup") {
  return { autorizado: false, motivo: "Comando no reconocido. Usa: /backup CLAVE" };
}
if (partes[1] !== CLAVE_CORRECTA) {
  return { autorizado: false, motivo: "Clave incorrecta" };
}
return { autorizado: true, motivo: "OK" };
```

**Qué hace:** toma el texto, lo divide por espacios, verifica que empiece con `/backup` y que la segunda palabra sea la clave exacta. Devuelve `{ autorizado, motivo }`.

> [!tip] En modo Each Item se retorna un objeto plano
> El código debe devolver `{ ... }`, no `[{ json: ... }]`. La forma de array provoca el error *"A 'json' property isn't an object"*.

### Nodo 3 — If

- **Condition:** `{{ $json.autorizado }}` — *is true*.
- Salida **true** → ejecutar el backup. Salida **false** → responder el motivo del rechazo.

### Nodo 4 — Ejecutar el script *(Execute Command)*

- **Command:**

```bash
/home/kamscript/backup_db.sh
```

Corre el script maestro completo (3 copias + retención). Su salida queda en `$json.stdout` para el siguiente nodo — posible porque el script imprime con `tee` (a la vez al log y a stdout).

### Nodo 5 — Formatear mensaje *(Code)*

- **Mode:** `Run Once for Each Item`

```javascript
const salida = $json.stdout || "";

const mArchivo = salida.match(/INICIO DE BACKUP: (\S+)/);
const archivo = mArchivo ? mArchivo[1] + ".sql.gz" : "desconocido";

const mTam = salida.match(/\[(\d+(?:[.,]\d+)?[KMGT])\]/);
const tamano = mTam ? mTam[1] : "?";

const c1 = /OK\s+Copia 1/.test(salida) ? "✅" : "❌";
const c2 = /OK\s+Copia 2/.test(salida) ? "✅"
         : /disco externo NO montado/.test(salida) ? "⚠️ (disco no conectado)"
         : "❌";
const c3 = /OK\s+Copia 3/.test(salida) ? "✅" : "❌";

const fecha = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

let mensaje;
if (/fallo el mysqldump/.test(salida)) {
  mensaje = "❌ Backup fallido\n\nNo se pudo generar el dump de la base de datos.\nRevisa el log en el servidor.";
} else {
  mensaje = "✅ Backup completado\n\n"
    + "📦 " + archivo + "\n"
    + "📏 Tamaño: " + tamano + "\n\n"
    + "💾 Local: " + c1 + "\n"
    + "💿 Externo: " + c2 + "\n"
    + "☁️ Nube R2: " + c3 + "\n\n"
    + "🗑️ Retención: 7 días\n"
    + "🕐 " + fecha;
}

return { mensaje };
```

**Por qué existe este nodo (decisión de UX):** la salida cruda del script es un log técnico con timestamps y rutas largas — ilegible en un celular. Este nodo la **parsea con expresiones regulares** y construye un resumen limpio: archivo, tamaño, estado de cada copia con emojis y fecha local. El log técnico sigue completo en `~/backups/backup.log` para diagnóstico. Separar "log para la máquina" de "mensaje para el humano" es buena práctica.

> [!warning] El orden de los nodos importa
> Este nodo va **después** de "Ejecutar el script", porque lee `$json.stdout`, que solo existe cuando el comando ya terminó. Ponerlo antes (conectado directo al If) hace que todo falle con "Acceso denegado" o mensajes vacíos.

### Nodo 6 — Enviar respuesta *(Telegram: Send Message)*

- **Chat ID:** `{{ $('Telegram disparador').item.json.message.chat.id }}` — responde al mismo chat que escribió, sea quien sea.
- **Text:** `{{ $json.mensaje }}`
- **Options → Append n8n Attribution:** **desactivado** (quita el footer "This message was sent automatically with n8n").

### Nodo 7 — Mensaje de error *(Telegram: Send Message)*

Conectado a la salida **false** del If.

- **Chat ID:** igual que el nodo anterior.
- **Text:** `🚫 Acceso denegado: {{ $('Recibe y valida el mensaje').item.json.motivo }}`
- **Append n8n Attribution:** desactivado.

---

## 🚀 Paso 5: Publicar y batería de pruebas

1. Clic en **Publish** (en n8n 2.x se publica; no hay switch "Active"). Publicar registra el webhook en Telegram.
2. Ejecutar la batería:

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | `/backup Sakila2026!` (mi cuenta) | Backup se ejecuta; llega resumen ✅ con las 3 copias |
| 2 | `/backup claveMala` | 🚫 Acceso denegado: Clave incorrecta |
| 3 | `hola` (texto cualquiera) | 🚫 Acceso denegado: Comando no reconocido |
| 4 | `/backup Sakila2026!` desde **otra cuenta** de Telegram | Funciona igual (modelo clave-única) |
| 5 | `/backup Sakila2026!` con el disco externo desconectado | ⚠️ en copia 2; copias 1 y 3 en ✅ |

3. Verificación cruzada en el servidor:

```bash
ls -lh ~/backups/db/                              # copia 1
ls -lh /media/kamscript/MaztherOS/backups_db/     # copia 2
rclone ls r2:backups-sakila-lab/                  # copia 3
tail -20 ~/backups/backup.log                     # log técnico completo
```
