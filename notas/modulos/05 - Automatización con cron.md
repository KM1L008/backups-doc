## ⏰ Fase 5: Automatización con cron

> [!info] Objetivo
> Que el script maestro `~/backup_db.sh` se ejecute **solo, en intervalos regulares, sin intervención humana**. Es lo que convierte el procedimiento de la Fase 4 en un sistema de backups *automático*, cumpliendo el requisito central del laboratorio.

> [!question] Prerrequisitos
> - [[04 - Script maestro de backup]] ejecutándose correctamente **a mano** (`~/backup_db.sh` debe producir las 3 copias)
> - El script con permiso de ejecución
> - El usuario de la sesión debe ser `kamscript` (el mismo dueño de `~/.my.cnf`)

---

## 📖 Conceptos previos

### ¿Qué es cron?

Un **demonio** (programa que corre en segundo plano permanentemente) que viene con Linux y se encarga de una sola cosa: ejecutar comandos en los horarios que le indiquemos. Su configuración se guarda en una tabla llamada **crontab** (*cron table*). Cada línea de esa tabla es una tarea con su horario.

> [!note] Cada usuario tiene su propio crontab
> El crontab de `kamscript` es independiente del de `root` y de cualquier otro usuario. Esto importa mucho: cron ejecuta la tarea **como el usuario dueño del crontab**, y por tanto usará el `$HOME` de ese usuario — ahí es donde encuentra el `~/.my.cnf` con las credenciales de `backup_user` (ver [[01 - Usuario de backup en MariaDB]]). Por eso el crontab debe editarse desde la sesión de `kamscript`, no como root.

### La sintaxis: 5 campos de tiempo + el comando

```
┌─────────── minuto (0-59)
│ ┌───────── hora (0-23)
│ │ ┌─────── día del mes (1-31)
│ │ │ ┌───── mes (1-12)
│ │ │ │ ┌─── día de la semana (0-7, donde 0 y 7 = domingo)
│ │ │ │ │
* * * * * comando_a_ejecutar
```

Un `*` significa "todos los valores". Ejemplos:

| Expresión | Significa |
|---|---|
| `*/5 * * * *` | Cada 5 minutos (ideal para **probar** que todo funciona) |
| `0 * * * *` | Al minuto 0 de cada hora |
| `0 */6 * * *` | Cada 6 horas (00:00, 06:00, 12:00, 18:00) |
| `0 2 * * *` | Todos los días a las 2:00 AM |
| `0 2 * * 0` | Domingos a las 2:00 AM |
| `0 2 1 * *` | El día 1 de cada mes a las 2:00 AM |

### Lo más importante: cron NO es tu terminal

Cuando ejecutas el script a mano, tu terminal tiene todo tu entorno: tu `PATH` completo, tus alias, tus variables. **Cron ejecuta con un entorno mínimo**: casi sin variables y con un `PATH` reducido. Consecuencias prácticas:

1. **Todo debe ser rutas absolutas.** Por eso en el script escribimos `/opt/lampp/bin/mysqldump` y no solo `mysqldump`: cron no sabría dónde buscarlo.
2. Si el script funciona a mano pero falla en cron, el 90% de las veces es por una ruta relativa o una variable que cron no tiene.
3. `$HOME` sí está definida (apunta al home del usuario dueño del crontab), por eso `$HOME/backups/db` y `~/.my.cnf` funcionan sin problema.

> [!tip] Regla de oro
> Nunca programes en cron un script que no hayas ejecutado exitosamente a mano al menos una vez. Primero Fase 4 verificada, después Fase 5.

---

## 🔧 Paso 1: Dar permiso de ejecución al script

Linux no ejecuta un archivo solo porque tenga pinta de script; necesita el permiso de ejecución:

```bash
chmod +x ~/backup_db.sh
```

Verificar (debe mostrar `x` en los permisos, ej. `-rwxr-xr-x`):

```bash
ls -l ~/backup_db.sh
```

---

## 📝 Paso 2: Registrar la tarea en el crontab

Abrir el editor del crontab del usuario actual:

```bash
crontab -e
```

> [!warning] Cuidado con la primera vez
> La primera vez que ejecutas `crontab -e`, el sistema **primero pregunta qué editor usar** (una lista numerada: 1 = nano, 2 = vim, etc.). Hay que **presionar `1` y Enter primero**, y recién **después**, cuando se abra el archivo, pegar la línea. Si pegas la línea de cron en el menú de selección, no pasa nada: el menú se la traga y el crontab queda vacío.

Agregar **al final del archivo** la línea de prueba:

```cron
*/5 * * * * /home/kamscript/backup_db.sh
```

Guardar y salir (`Ctrl+O`, Enter, `Ctrl+X` en nano). El sistema confirma con `crontab: installing new crontab`.

---

## 👀 Paso 3: Verificar que la automatización funciona

**a) Confirmar que la tarea quedó registrada:**

```bash
crontab -l
```

Debe listar la línea `*/5 * * * * /home/kamscript/backup_db.sh`.

**b) Ver la hora y esperar al siguiente múltiplo de 5:**

```bash
date
```

Si son las 14:32, el próximo disparo es 14:35.

**c) Observar el log en vivo:**

```bash
tail -f ~/backups/backup.log
```

Al llegar el minuto programado deben aparecer las líneas `INICIO DE BACKUP`, los `OK` de las 3 copias y `FIN DE BACKUP`. Salir con `Ctrl+C`.

**d) Verificación cruzada en los 3 destinos:**

```bash
ls -lh ~/backups/db/                              # copia 1: local
ls -lh /media/kamscript/MaztherOS/backups_db/     # copia 2: disco externo
rclone ls r2:backups-sakila-lab/                  # copia 3: Cloudflare R2
```

Debe haber archivos nuevos con la hora exacta del disparo de cron — esa es la prueba de que se ejecutó **sin que nadie tocara nada**.

**e) (Opcional) Revisar el rastro del demonio cron en el sistema:**

```bash
grep CRON /var/log/syslog | tail
```

---

## 🎯 Paso 4: Dejar la frecuencia definitiva

Verificado el funcionamiento, editar de nuevo con `crontab -e` y cambiar la línea por la frecuencia de "producción":

```cron
0 2 * * * /home/kamscript/backup_db.sh
```

Así el backup corre todos los días a las 2:00 AM, sin gastar recursos ni espacio durante el día.

> [!note] cron vs. el bot de Telegram
> Con esta fase activa, los backups ocurren solos cada día; el bot de [[06 - n8n y Telegram]] queda como complemento para lanzar un backup **extra, bajo demanda**, en cualquier momento. Son dos disparadores distintos del mismo script: uno por tiempo (cron), otro por evento (Telegram).
