
# ☁️ Fase 3: Cloudflare R2 (Copia 3 - Offsite)

> [!info] Objetivo
>Configurar Cloudflare R2 como destino de la **Copia 3** (offsite) de la estrategia 3-2-1, usando `rclone` para la transferencia cifrada por HTTPS y un API token de mínimo privilegio.


---

## Parte A — Configuración en el dashboard de Cloudflare

### A.1 Crear el bucket

1. Entrar a https://dash.cloudflare.com e iniciar sesión
2. Menú lateral → **Almacenamiento de objetos R2**
3. Clic en **Crear bucket**
   - Nombre: `backups-sakila-lab`
   - Ubicación: Automática
   - Clase de almacenamiento: Estándar
4. Verificar: **Acceso público: Deshabilitado** ✅ (los backups son privados)

> [!warning] Método de pago
> Cloudflare exige agregar tarjeta o PayPal para activar R2, pero la capa gratuita (10 GB + millones de operaciones/mes) cubre este proyecto con creces (~700 KB por backup). Costo real: $0.

### A.2 Crear el API token

1. En la página de R2 → **Gestionar tokens de la API** (o desde Detalles de la cuenta)
2. Clic en **Crear token de API de Account**
   - Se elige el de **cuenta** (no el de usuario) porque permanece activo siempre — ideal para automatización con cron
3. Configuración:
   - Nombre: `rclone-backups-sakila`
   - Permisos: **Lectura y escritura de objetos**
   - Bucket: **solo** `backups-sakila-lab`
   - TTL: sin expiración
4. Guardar inmediatamente: **Access Key ID** y **Secret Access Key** (el Secret solo se muestra una vez)

> [!note] Mínimo privilegio en la nube
> El token está limitado a un solo bucket: si se filtrara, no podría tocar nada más de la cuenta.

> [!tip] ¿Dónde veo mi Account ID?
> Está en la propia URL del dashboard: `dash.cloudflare.com/<ACCOUNT_ID>/r2/...`
> También en la página principal de R2, panel derecho, "Detalles de la cuenta".

---

## Parte B — Instalar y configurar rclone en el PC local

### B.1 Instalar rclone

```bash
# Método oficial (versión más reciente que la de apt)
curl https://rclone.org/install.sh | sudo bash

# Verificar
rclone version
```

### B.2 Configurar el remoto de R2

Un solo comando crea la configuración (reemplazar las llaves por las propias):

```bash
rclone config create r2 s3 \
  provider=Cloudflare \
  access_key_id=TU_ACCESS_KEY_ID \
  secret_access_key=TU_SECRET_ACCESS_KEY \
  endpoint=https://3af0d67805586508ff929c3867564f53.r2.cloudflarestorage.com
```

`r2` es el nombre del remoto — así se invoca en el script.

### B.3 Ajuste obligatorio con token de bucket limitado

```bash
rclone config update r2 no_check_bucket=true
```

> [!important] ¿Por qué es obligatorio?
> rclone, antes de subir, verifica si el bucket existe usando **ListBuckets** (listar los buckets de la cuenta). Un token limitado a un solo bucket **no tiene ese permiso**, así que rclone asume que el bucket no existe e intenta crearlo → `403 AccessDenied` en `CreateBucket`.
> Con `no_check_bucket=true`, rclone omite la verificación y sube directo con `PutObject`, que el token sí permite.

### B.4 Probar la conexión


```bash
# Listar contenido del bucket (salida vacia = OK, bucket vacio)
rclone lsd r2:backups-sakila-lab

# Crear archivo de prueba (ojo: el > es la redireccion que crea el archivo)
echo "prueba de conexion r2 - $(date)" > /tmp/prueba_r2.txt
cat /tmp/prueba_r2.txt

# Subirlo a R2
rclone copy /tmp/prueba_r2.txt r2:backups-sakila-lab/

# Verificar que subio
rclone ls r2:backups-sakila-lab/
```

✅ **Checkpoint:** `rclone ls` muestra `prueba_r2.txt` con su tamaño. También visible en el dashboard (bucket → Objetos). 📸

```bash
# Limpieza de la prueba
rclone delete r2:backups-sakila-lab/prueba_r2.txt
rm /tmp/prueba_r2.txt
```