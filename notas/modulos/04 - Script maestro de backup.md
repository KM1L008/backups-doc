# 📜 Fase 4: Script maestro de backup

> [!info] Objetivo
> Crear el script `~/backup_db.sh` que ejecuta la estrategia 3-2-1 completa en una sola corrida: genera el dump de sakila, lo copia al disco externo, lo sube a Cloudflare R2, aplica retención de 7 días y registra todo en un log.

> [!question] Prerrequisitos
> - [[01 - Usuario de backup en MariaDB]] (el dump debe funcionar sin pedir contraseña)
> - [[02 - Disco externo]] (carpeta `backups_db` creada)
> - [[03 - Cloudflare R2]] (remoto `r2` configurado y probado)

---

## 📖 Conceptos previos de shell scripting

### ¿Qué es un script de shell?

Un archivo de texto con comandos de Linux que se ejecutan **en orden, de arriba hacia abajo**, como si los escribieras a mano en la terminal. Automatizar = escribir una vez, ejecutar mil veces.

### Las 8 piezas que usaremos

| Pieza | Qué es | Ejemplo |
| ----- | ------ | ------- |
| `#!/bin/bash` | "Shebang": le dice al sistema con qué intérprete correr el archivo | Primera línea, obligatoria |
| **Variable** | Una caja con nombre que guarda un valor | `DB_NAME="sakila"` → se usa como `$DB_NAME` |
| `$(comando)` | **Sustitución de comando**: ejecuta y captura su salida | `FECHA=$(date +%Y-%m-%d)` |
| `$?` | Código de salida del último comando: `0` = éxito, otro = error | `if [ $? -eq 0 ]` |
| `if ... fi` | Decisión: ejecutar algo solo si se cumple una condición | Verificar si el disco está montado |
| `|` (pipe) | Conecta la salida de un comando a la entrada del siguiente | `mysqldump ... \| gzip` |
| `>` y `>>` | Redirección: `>` crea/sobrescribe un archivo, `>>` añade al final | `echo hola > log.txt` |
| **Función** | Un bloque reutilizable con nombre | `log() { ... }` → se invoca como `log "texto"` |

> [!tip] Regla de oro del quoting
> Las variables con rutas van entre comillas: `"$DIR_LOCAL"`. Si una ruta tuviera espacios (como las carpetas de Windows), sin comillas el comando se rompería.

---

## El script completo

Crear con `nano ~/backup_db.sh` y pegar:

```bash
#!/bin/bash
# ============================================
#  Backup 3-2-1 - Base de datos sakila
#  Copia 1: Local | Copia 2: Disco externo | Copia 3: Cloudflare R2
# ============================================
set -o pipefail

# ---------- Configuracion ----------
FECHA=$(date +%Y-%m-%d_%H-%M)
DB_NAME="sakila"
MYSQLDUMP="/opt/lampp/bin/mysqldump"

DIR_LOCAL="$HOME/backups/db"
DIR_EXTERNO="/media/kamscript/MaztherOS/backups_db"
R2_REMOTE="r2:backups-sakila-lab"

RETENCION_DIAS=7
LOG="$HOME/backups/backup.log"
# ------------------------------------

mkdir -p "$DIR_LOCAL"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

log "===== INICIO DE BACKUP: ${DB_NAME}_${FECHA} ====="

# ---------- COPIA 1: Dump local ----------
if $MYSQLDUMP "$DB_NAME" | gzip > "$DIR_LOCAL/${DB_NAME}_${FECHA}.sql.gz"; then
    TAMANO=$(du -h "$DIR_LOCAL/${DB_NAME}_${FECHA}.sql.gz" | cut -f1)
    log "OK  Copia 1 (local): ${DB_NAME}_${FECHA}.sql.gz [$TAMANO]"
else
    log "ERROR: fallo el mysqldump. Se cancela el backup."
    exit 1
fi

# ---------- COPIA 2: Disco externo ----------
if mountpoint -q /media/kamscript/MaztherOS; then
    cp "$DIR_LOCAL/${DB_NAME}_${FECHA}.sql.gz" "$DIR_EXTERNO/"
    if [ $? -eq 0 ]; then
        log "OK  Copia 2 (disco externo): copiado a $DIR_EXTERNO"
    else
        log "ERROR: no se pudo copiar al disco externo"
    fi
else
    log "AVISO: disco externo NO montado. Copia 2 omitida."
fi

# ---------- COPIA 3: Cloudflare R2 (offsite) ----------
rclone copy "$DIR_LOCAL/${DB_NAME}_${FECHA}.sql.gz" "$R2_REMOTE/"
if [ $? -eq 0 ]; then
    log "OK  Copia 3 (Cloudflare R2): subido a $R2_REMOTE"
else
    log "ERROR: fallo la subida a R2"
fi

# ---------- Retencion: borrar backups > 7 dias ----------
find "$DIR_LOCAL" -name "*.sql.gz" -mtime +$RETENCION_DIAS -delete
if mountpoint -q /media/kamscript/MaztherOS; then
    find "$DIR_EXTERNO" -name "*.sql.gz" -mtime +$RETENCION_DIAS -delete
fi
rclone delete "$R2_REMOTE" --include "*.sql.gz" --min-age ${RETENCION_DIAS}d

log "Retencion aplicada: se conservan $RETENCION_DIAS dias"
log "===== FIN DE BACKUP ====="
echo "" >> "$LOG"
```

Guardar: `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 🔍 El script explicado bloque por bloque

### Bloque 1 — Encabezado y configuración

```bash
#!/bin/bash
set -o pipefail
```

- `#!/bin/bash` → el sistema sabe que debe ejecutarlo con **bash**
- `set -o pipefail` → en un pipe (`a | b`), si **cualquiera** de los dos falla, todo el pipe se marca como fallido. Sin esto, si `mysqldump` fallara pero `gzip` funcionara, el script creería que todo salió bien. Detalle pequeño, consecuencia enorme.

```bash
FECHA=$(date +%Y-%m-%d_%H-%M)
```

- `date +%Y-%m-%d_%H-%M` genera algo como `2026-11-06_21-48`
- Cada backup lleva fecha-hora en el nombre → nunca se sobrescriben entre sí
- Se usa `_` y `-` en vez de `:` porque los dos puntos dan problemas en NTFS y en la nube

```bash
DIR_LOCAL="$HOME/backups/db"
```

- `$HOME` = el home del usuario que ejecuta (para kamscript: `/home/kamscript`)
- Centralizar las rutas en variables = cambiarlas una sola vez si algo cambia

### Bloque 2 — La función de log

```bash
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}
```

- `log() { ... }` define una función reutilizable
- `$1` = el primer argumento que se le pase: `log "hola"` → `$1` es "hola"
- `tee -a` hace doble trabajo: muestra el mensaje **en pantalla** y **lo añade al archivo de log** al mismo tiempo

Así, cada evento queda con sello de fecha/hora: evidencia perfecta para auditorías (y para el reporte).

### Bloque 3 — Copia 1: el dump

```bash
if $MYSQLDUMP "$DB_NAME" | gzip > "$DIR_LOCAL/${DB_NAME}_${FECHA}.sql.gz"; then
```

Cuatro acciones encadenadas:
1. `mysqldump sakila` → genera el SQL completo de la base (lee las credenciales de `~/.my.cnf`, ver [[01 - Usuario de backup en MariaDB]])
2. `| gzip` → comprime el SQL al vuelo (de ~5 MB a ~700 KB)
3. `> archivo.sql.gz` → lo guarda en la carpeta local
4. `if ...` → gracias al código de salida y a `pipefail`, si el dump falla, el script se detiene con `exit 1` (no tiene sentido copiar un archivo corrupto a los otros destinos)

### Bloque 4 — Copia 2: disco externo con defensa

```bash
if mountpoint -q /media/kamscript/MaztherOS; then
```

- `mountpoint -q` pregunta: ¿hay un disco montado en esa ruta? (`-q` = silencioso, solo responde con código de salida)
- **Si está montado** → `cp` copia el archivo
- **Si no** → registra un AVISO y continúa. El script **no se rompe** por un disco desconectado: las copias 1 y 3 siguen su curso

> [!tip] Diseño defensivo
> Cada copia es independiente: que falle una no tumba las demás. Eso es exactamente el espíritu del 3-2-1.

### Bloque 5 — Copia 3: nube con rclone

```bash
rclone copy "$DIR_LOCAL/${DB_NAME}_${FECHA}.sql.gz" "$R2_REMOTE/"
```

- `rclone copy` sube el archivo al bucket por HTTPS cifrado
- `r2:backups-sakila-lab` = el remoto configurado en [[03 - Cloudflare R2]]
- Las credenciales viven en `~/.config/rclone/rclone.conf` — **nunca en el script**

### Bloque 6 — Retención (auto-limpieza)

```bash
find "$DIR_LOCAL" -name "*.sql.gz" -mtime +$RETENCION_DIAS -delete
rclone delete "$R2_REMOTE" --include "*.sql.gz" --min-age ${RETENCION_DIAS}d
```

- `find ... -mtime +7 -delete` → en local y disco externo: busca archivos `.sql.gz` con **más de 7 días** y los borra
- `rclone delete --min-age 7d` → el equivalente para R2
- Sin retención, en un mes tendrías ~700 archivos por destino. Con ella, el historial se mantiene acotado y los discos no se llenan

---

## Parte final — Puesta en marcha

### 1. Dar permiso de ejecución

```bash
chmod +x ~/backup_db.sh
```

Por defecto un archivo de texto nuevo no es ejecutable; `+x` lo convierte en programa.

### 2. Primera ejecución manual

```bash
bash ~/backup_db.sh
```

✅ **Salida esperada:**

```
[...] ===== INICIO DE BACKUP: sakila_2026-11-06_22-00 =====
[...] OK  Copia 1 (local): sakila_2026-11-06_22-00.sql.gz [684K]
[...] OK  Copia 2 (disco externo): copiado a /media/kamscript/MaztherOS/backups_db
[...] OK  Copia 3 (Cloudflare R2): subido a r2:backups-sakila-lab
[...] Retencion aplicada: se conservan 7 dias
[...] ===== FIN DE BACKUP =====
```

### 3. Verificar las 3 copias

```bash
ls -lh ~/backups/db/                              # Copia 1
ls -lh /media/kamscript/MaztherOS/backups_db/     # Copia 2
rclone ls r2:backups-sakila-lab/                  # Copia 3
```

Los tres destinos deben mostrar el mismo archivo con el mismo tamaño. 📸 Evidencia clave del reporte.
