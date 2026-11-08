## 📚 Glosario y comandos útiles

> [!info] Objetivo
> Reunir en un solo lugar **todos los comandos usados en el proyecto**, organizados por categoría, con una explicación corta de qué hace cada uno. Sirve como chuleta de consulta rápida para mantener el sistema y para sustentar el laboratorio sin tener que releer todas las fases.

> [!question] Cómo usar esta nota
> No es para leer de corrido: es una referencia. Cuando algo falle o no recuerdes un comando, busca la categoría correspondiente. Los comandos peligrosos están marcados con ⚠️.

---

## 🗄️ MariaDB — usuarios y privilegios

| Comando | Qué hace |
|---|---|
| `mysql -u root -p` | Entrar al monitor de MariaDB como root (pide contraseña) |
| `CREATE USER 'backup_user'@'localhost' IDENTIFIED BY '...';` | Crea el usuario dedicado de backups |
| `GRANT SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT ON sakila.* TO 'backup_user'@'localhost';` | Concede **solo** los privilegios mínimos para hacer dumps de `sakila` |
| `FLUSH PRIVILEGES;` | Recarga las tablas de permisos para aplicar cambios |
| `SHOW GRANTS FOR 'backup_user'@'localhost';` | Verifica qué privilegios tiene un usuario |
| `SELECT VERSION();` | Muestra la versión de MariaDB |
| `EXIT;` | Sale del monitor de MariaDB (⚠️ los comandos de Linux NO van dentro del monitor) |

> [!tip] Leer los prompts
> `MariaDB [(none)]>` = estás **dentro** de MariaDB (solo SQL). `kamscript@pc:~$` = estás en la **terminal de Linux** (solo comandos del sistema). Media de los errores del laboratorio fue escribir un comando en el prompt equivocado.

## 💾 MariaDB — respaldo y restauración

| Comando | Qué hace |
|---|---|
| `mysqldump sakila > respaldo.sql` | Genera el dump SQL de la base (sin contraseña gracias a `~/.my.cnf`) |
| `mysqldump sakila \| gzip > respaldo.sql.gz` | Dump comprimido al vuelo (lo que usa el script) |
| `gunzip -c respaldo.sql.gz \| mysql sakila` | **Restaura** un backup comprimido sobre la base `sakila` |
| `mysql sakila < respaldo.sql` | Restaura un backup sin comprimir |
| `zcat respaldo.sql.gz \| head` | Espía el contenido de un dump sin descomprimirlo todo |

## 📁 Archivos y permisos

| Comando | Qué hace |
|---|---|
| `mkdir -p ~/backups/db` | Crea la carpeta (y las intermedias si no existen); no falla si ya existe |
| `chmod 600 ~/.my.cnf` | Solo el dueño lee/escribe el archivo de credenciales (obligatorio por seguridad) |
| `chmod +x ~/backup_db.sh` | Da permiso de ejecución al script |
| `ls -lh carpeta/` | Lista archivos con tamaños legibles (K, M, G) |
| `du -h archivo` | Tamaño de un archivo (lo usa el script para el log) |
| `cp origen destino` | Copia un archivo (copia local → disco externo) |
| `find carpeta -name "*.sql.gz" -mtime +7 -delete` | ⚠️ Borra backups con más de 7 días (retención). Verifica la ruta antes de ejecutarlo a mano |
| `nano archivo` | Editor de texto sencillo en terminal |

## 💿 Disco externo

| Comando | Qué hace |
|---|---|
| `mountpoint -q /media/kamscript/MaztherOS` | Verifica si el disco está montado (sin imprimir nada; lo evalúa el script) |
| `lsblk` | Lista discos y particiones conectados |
| `sudo ntfsfix /dev/sdXN` | Repara un NTFS que quedó en solo-lectura (típico por el Fast Startup de Windows) |

## ☁️ Cloudflare R2 con rclone

| Comando | Qué hace |
|---|---|
| `rclone config create r2 s3 provider=Cloudflare access_key_id=XXX secret_access_key=XXX endpoint=https://...` | Crea el remoto `r2` con el token de la cuenta |
| `rclone config update r2 no_check_bucket=true` | ⚙️ **Obligatorio** con tokens limitados a un bucket: evita el 403 de `CreateBucket`/`ListBuckets` |
| `rclone lsd r2:backups-sakila-lab` | Prueba de conexión: lista el contenido del bucket |
| `rclone copy archivo.sql.gz r2:backups-sakila-lab/` | Sube un archivo al bucket (copia 3) |
| `rclone ls r2:backups-sakila-lab/` | Lista los backups guardados en la nube |
| `rclone delete r2:backups-sakila-lab --include "*.sql.gz" --min-age 7d` | Retención en la nube: borra archivos de más de 7 días |
| `rclone copy r2:backups-sakila-lab/archivo.sql.gz ~/Descargas/` | **Descarga** un backup de la nube (para restaurar) |

## 🐚 Bash y scripting

| Comando / pieza | Qué hace |
|---|---|
| `#!/bin/bash` | Shebang: indica con qué intérprete corre el script |
| `set -o pipefail` | Si cualquier comando de una tubería falla, toda la tubería falla (detecta errores del `mysqldump`) |
| `$(comando)` | Sustitución de comandos: guarda la salida en una variable (`FECHA=$(date +%Y-%m-%d_%H-%M)`) |
| `$?` | Código de salida del último comando: `0` = éxito, otro valor = error |
| `if ...; then ... fi` | Condicional: decide según el código de salida |
| `echo "msg" \| tee -a log.txt` | Imprime en pantalla **y** anexa al log a la vez (clave para que n8n lea la salida) |
| `tail -f ~/backups/backup.log` | Observa el log en vivo |
| `grep texto archivo` | Busca líneas que contienen un texto |
| `date +%Y-%m-%d_%H-%M` | Genera la marca de tiempo para nombrar archivos |

## ⏰ cron

| Comando | Qué hace |
|---|---|
| `crontab -e` | Edita la tabla de tareas del usuario actual (**sin sudo**) |
| `crontab -l` | Lista las tareas programadas |
| `*/5 * * * * comando` | Cada 5 minutos (modo prueba) |
| `0 2 * * * comando` | Todos los días a las 2:00 AM (modo producción) |
| `grep CRON /var/log/syslog \| tail` | Revisa el rastro del demonio cron en el sistema |

## 🤖 n8n y Telegram

| Comando | Qué hace |
|---|---|
| `npm install -g n8n` | Instala n8n globalmente |
| `cloudflared tunnel --url http://localhost:5678` | Crea el túnel HTTPS público temporal |
| `NODES_EXCLUDE="[]" WEBHOOK_URL="https://<tunel>.trycloudflare.com/" n8n start` | Arranca n8n con Execute Command habilitado y la URL pública del webhook |
| `/backup Sakila2026!` | Comando del bot: dispara un backup manual (la clave es la única barrera) |
