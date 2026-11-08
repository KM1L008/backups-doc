
# 🐬 Fase 1: Usuario de backup en MariaDB + `.my.cnf`

> [!info] Objetivo
> Crear un usuario de MariaDB **dedicado exclusivamente a respaldos**, con los permisos mínimos necesarios, y configurar sus credenciales en un archivo protegido (`.my.cnf`) para que los scripts puedan usarlo **sin escribir la contraseña en texto plano**.


---

## 📖 Conceptos previos (administración básica de MariaDB)

### ¿Qué es un "usuario" en MariaDB?

Además de las bases y tablas, MariaDB tiene su propio sistema de **cuentas**. Cada cuenta se escribe así:

```
'nombre_usuario'@'host'
```

- `'backup_user'@'localhost'` → solo puede conectarse **desde el mismo equipo**
- `'backup_user'@'%'` → podría conectarse **desde cualquier red** (peligroso si no es necesario)

Para nuestro caso, el backup se genera en el mismo PC donde está la base, así que `localhost` es suficiente **y más seguro**.

### ¿Qué son los privilegios (GRANT)?

Cada usuario tiene una lista de **permisos** que definen qué puede hacer y sobre qué. Se otorgan con `GRANT` y su sintaxis es:

```sql
GRANT privilegio1, privilegio2 ON base.tabla TO 'usuario'@'host';
```

- `ON sakila.*` → permisos sobre **todas las tablas de sakila**, pero de ninguna otra base
- `ON *.*` → permisos sobre **todo el servidor** (lo que tiene root; nosotros NO queremos esto)

> [!important] Principio de mínimo privilegio
> Un usuario de respaldo solo necesita **leer** datos. Jamás debe poder borrar tablas, modificar datos o crear usuarios. Si alguien robara estas credenciales, el daño posible queda limitado a "poder leer sakila" — nada más.

### ¿Por qué no usar root para los backups?

| | root | backup_user |
|---|---|---|
| Puede borrar cualquier base | ✅ (peligro) | ❌ |
| Puede crear usuarios | ✅ (peligro) | ❌ |
| Puede apagar el servidor | ✅ (peligro) | ❌ |
| Puede leer sakila | ✅ | ✅ (único poder que necesita) |

---

## Parte A — Crear el usuario de backup

### A.1 Entrar al monitor de MariaDB (XAMPP) en linux

```bash
sudo /opt/lampp/bin/mariadb
```

Sabrás que estás dentro porque el prompt cambia a:

```
MariaDB [(none)]>
```


### A.2 Crear el usuario

```sql
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'bkp_sakila_2026';
```

Desglose del comando:
- `CREATE USER` → crea la cuenta
- `'backup_user'@'localhost'` → nombre + solo conexiones locales
- `IDENTIFIED BY '...'` → su contraseña


### A.3 Otorgar los permisos mínimos

```sql
GRANT SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT ON sakila.* TO 'backup_user'@'localhost';
```

**¿Para qué es cada permiso?**

| Privilegio | Qué permite | Por qué lo necesita el backup |
| ---------- | ----------- | ----------------------------- |
| `SELECT` | Leer datos de las tablas | El backup ES una lectura completa de los datos |
| `LOCK TABLES` | Bloquear tablas temporalmente | Garantiza que nadie escriba mientras se copia (consistencia) |
| `SHOW VIEW` | Ver la definición de las vistas | sakila tiene vistas; sin esto no se respaldan |
| `TRIGGER` | Ver los disparadores | mysqldump respalda triggers por defecto |
| `EVENT` | Ver eventos programados | Para respaldarlos si existieran |

> [!tip] Nota
> sakila en realidad no usa triggers ni eventos, pero incluirlos es buena práctica: el mismo usuario serviría para otras bases que sí los tengan.



### A.4 Aplicar y verificar

```sql
FLUSH PRIVILEGES;
SHOW GRANTS FOR 'backup_user'@'localhost';
```

- `FLUSH PRIVILEGES` → recarga las tablas de permisos para que el cambio aplique ya
- `SHOW GRANTS` → muestra lo que el usuario puede hacer

✅ **Salida esperada:**

```
GRANT USAGE ON *.* TO `backup_user`@`localhost` ...
GRANT SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT ON `sakila`.* TO `backup_user`@`localhost`
```

> La primera línea (`USAGE ON *.*`) no da ningún poder: solo significa "el usuario existe y puede conectarse".

Sal del monitor:

```sql
EXIT;
```

---

## Parte B — Credenciales protegidas con `.my.cnf`

### ¿Qué es `.my.cnf`?

Es un archivo de configuración que los programas cliente de MariaDB/MySQL (`mysql`, `mysqldump`, etc.) **leen automáticamente** al arrancar. Si ahí está el usuario y la contraseña, no hace falta escribirlos en comandos ni scripts.

**¿Por qué es mejor que poner la clave en el script?**

| Contraseña en el script | Contraseña en `.my.cnf` |
| ----------------------- | ----------------------- |
| Visible para quien abra el script | Archivo oculto, separado del código |
| Aparece en el historial de comandos | Nunca se escribe en comandos |
| Visible en la lista de procesos | Nunca viaja como argumento |

### B.1 Crear el archivo

En la **terminal de Linux** (no en MariaDB):

```bash
cat > ~/.my.cnf << 'EOF'
[client]
user=backup_user
password=bkp_sakila_2026
EOF
```

Desglose:
- `cat > ~/.my.cnf` → crea/sobrescribe el archivo en tu home (`~`)
- `<< 'EOF' ... EOF` → "heredoc": todo lo que escribas entre los dos `EOF` va al archivo
- `[client]` → sección que leen todos los programas cliente de MariaDB

### B.2 Protegerlo

```bash
chmod 600 ~/.my.cnf
```

`600` = solo tu usuario puede leerlo y escribirlo. Nadie más del sistema puede ver la contraseña.

### B.3 Verificar

```bash
ls -l ~/.my.cnf     # debe mostrar -rw------- y tu usuario
cat ~/.my.cnf       # debe mostrar las 3 lineas correctas
```

---

## Parte C — La prueba de fuego

```bash
/opt/lampp/bin/mysqldump sakila > /tmp/prueba_dump.sql && echo "DUMP COMPLETO OK"
ls -lh /tmp/prueba_dump.sql
rm /tmp/prueba_dump.sql
```

✅ **Checkpoint:** imprime `DUMP COMPLETO OK` **sin pedir contraseña** y el archivo pesa ~1.5 MB o más.

> [!note] Sobre el error "errno 32"
> Si pruebas con `| head -25` verás al final `mysqldump: Got errno 32 on write`. **No es un error real**: `head` cierra la tubería después de 25 líneas mientras mysqldump seguía escribiendo. La prueba correcta es redirigiendo a un archivo completo, como arriba.

