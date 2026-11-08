
# 💽 Fase 2: Disco externo (Copia 2)

> [!info] Objetivo
> Preparar el disco externo como destino de la **Copia 2** de la estrategia 3-2-1: verificar que se monta correctamente y crear la carpeta de respaldos.

---

## Pasos

### 1. Identificar el disco

Con el disco conectado:

```bash
lsblk -f
```

Muestra el dispositivo (ej. `/dev/sdb1`), su UUID y el tipo de formato (FSTYPE). En este proyecto el disco es **NTFS** (viene de Windows) y el sistema lo monta automáticamente en `/media/kamscript/MaztherOS`.

### 2. Crear la carpeta de backups

```bash
mkdir -p /media/kamscript/MaztherOS/backups_db
```

### 3. Verificar escritura

```bash
touch /media/kamscript/MaztherOS/backups_db/prueba.txt && echo "ESCRITURA OK"
rm /media/kamscript/MaztherOS/backups_db/prueba.txt
```

✅ **Checkpoint:** imprime `ESCRITURA OK`.

---

## Notas

> [!warning] Limitación del NTFS
> NTFS no soporta permisos ni dueños estilo Linux (`chown`/`chmod` no aplican). No afecta al laboratorio, pero es una diferencia frente a ext4.

> [!warning] Si el disco monta como solo lectura
> Es el "Inicio rápido" (Fast Startup) de Windows dejando el disco en estado suspendido. Solución: apagar Windows completamente (sin hibernar) o ejecutar `sudo ntfsfix /dev/sdXN` sobre la partición.

> [!tip] Regla práctica
> Si el disco no está conectado, el script de backup lo detecta con `mountpoint -q` y omite la Copia 2 sin romperse (ver [[04 - Script maestro de backup]]).

