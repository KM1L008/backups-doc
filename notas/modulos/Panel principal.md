---
tags: [proyecto, backups, base-de-datos, laboratorio]
creado: 2026-11-04
materia: Diseño de Bases de Datos
estado: En progreso
---
# 🗄️ Proyecto: Sistema de Backups Automatizado 3-2-1

Implementación de una estrategia de respaldo **3-2-1** para la base de datos **sakila** (MariaDB en XAMPP), con automatización mediante **cron**, disparo manual vía **Telegram + n8n** con clave de seguridad, y copia remota (offsite) en **Cloudflare R2**.

---

## 📐 Regla 3-2-1

| Regla | Significado | Implementación en este proyecto |
|-------|-------------|--------------------------------|
| **3** copias | Tres copias de los datos | Local + Disco externo + Nube |
| **2** medios distintos | Dos tipos de almacenamiento diferentes | Disco interno (PC) + Disco externo NTFS |
| **1** copia offsite | Una copia fuera del sitio físico | Cloudflare R2 (almacenamiento de objetos) |

---

## 🏗️ Arquitectura del sistema

```
┌────────────────────┐
│  MariaDB (sakila)  │
│  XAMPP - Local     │
└─────────┬──────────┘
          │ mysqldump + gzip
          ▼
┌────────────────────┐      ┌─────────────────────┐
│ Copia 1: LOCAL     │─────▶│ Copia 2: EXTERNO    │
│ ~/backups/db       │  cp  │ /media/kamscript/   │
│                    │      │ MaztherOS/backups_db│
└─────────┬──────────┘      └─────────────────────┘
          │ rclone (HTTPS, API token)
          ▼
┌────────────────────┐
│ Copia 3: OFFSITE   │
│ Cloudflare R2      │
│ bucket:            │
│ backups-sakila-lab │
└────────────────────┘

Disparadores:
  - cron (automático, cada hora)
  - n8n + Telegram (manual, comando /backup + clave de seguridad)
```

---

## ✅ Fases del proyecto

| Fase | Descripción                                       |
| ---- | ------------------------------------------------- |
| 1    | Usuario de backup en MariaDB + `.my.cnf`          |
| 2    | Disco externo (montaje y validación de escritura) |
| 3    | Cloudflare R2 (bucket + API token + rclone)       |
| 4    | Script maestro (3 copias + retención + logs)      |
| 5    | Automatización con cron                           |
| 6    | n8n + Telegram (comando /backup con clave)        |
| 7    | Prueba de restauración y evidencias               |

---

## 🧩 Componentes

- **Base de datos:** MariaDB 10.4.32 (XAMPP) — base `sakila`
- **Usuario dedicado:** `backup_user` con privilegios mínimos (SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT) solo sobre `sakila.*` → [[01 - Usuario de backup en MariaDB]]
- **Credenciales protegidas:** `~/.my.cnf` con permisos 600 → [[02 - Disco externo]]
- **Destino remoto:** Cloudflare R2 vía `rclone` con API token → [[03 - Cloudflare R2]]
- **Script principal:** `~/backup_db.sh` → [[04 - Script maestro de backup]]
- **Automatización:** cron → [[05 - Automatización con cron]]
- **Disparo manual:** n8n (local, sin Docker) + bot de Telegram → [[06 - n8n y Telegram]]

---

## ☁️ ¿Por qué Cloudflare R2 como copia offsite?

- **Capa gratuita de 10 GB** — los backups de sakila pesan ~700 KB comprimidos; costo real del proyecto: $0
- **Sin servidores que mantener** — no hay instancias, IPs dinámicas ni llaves SSH que administrar
- **Compatible con S3** — se integra con `rclone` usando API tokens de permisos limitados
- **Alta durabilidad** — almacenamiento de objetos redundante gestionado por Cloudflare

---

## 🔑 Decisiones técnicas y su justificación

&gt; [!note] Principio de mínimo privilegio
&gt; - En MariaDB: `backup_user` solo puede **leer** `sakila` — si las credenciales se comprometen, no puede modificar ni borrar datos.
&gt; - En R2: API token de cuenta limitado a un solo bucket (`backups-sakila-lab`).
&gt; - Credenciales fuera del script: `~/.my.cnf` con `chmod 600`, y las llaves de R2 cifradas en `~/.config/rclone/rclone.conf`.

&gt; [!tip] Retención automática
&gt; El script borra backups con más de 7 días de antigüedad en los tres destinos, evitando llenar los discos y manteniendo el historial acotado.

---

## 🖥️ Infraestructura de este proyecto

| Recurso             | Detalle                                                  |
| ------------------- | -------------------------------------------------------- |
| PC local            | Linux, XAMPP (MariaDB 10.4.32)                           |
| Disco externo       | NTFS, punto de montaje `/media/kamscript/MaztherOS`      |
| Nube offsite        | Cloudflare R2 — bucket `backups-sakila-lab`              |
| Transferencia nube  | `rclone` (remoto nombrado `r2`)                          |
| Automatización      | cron del usuario `kamscript`                             |
| Orquestación manual | n8n v2 local (npm) + túnel cloudflared + bot de Telegram |

---

## 📋 Subnotas del proyecto

1. [[01 - Usuario de backup en MariaDB]]
2. [[02 - Disco externo]]
3. [[03 - Cloudflare R2]]
4. [[04 - Script maestro de backup]]
5. [[05 - Automatización con cron]]
6. [[06 - n8n y Telegram]]
7. [[07 - Glosario y comandos útiles]]