# Teslo API

API REST construida con **NestJS** y **TypeORM**, usando **PostgreSQL** como base de datos. Incluye validación de datos y un endpoint de _seed_ para poblar la base de datos con información inicial.

## Tecnologías

- **NestJS 9** — framework principal
- **TypeORM** — ORM para la base de datos
- **PostgreSQL** — base de datos (vía Docker)
- **class-validator / class-transformer** — validación y transformación de DTOs
- **Docker Compose** — contenedor de la base de datos
- **TypeScript**

## Requisitos

- Node.js 18 o superior
- Yarn
- Docker

## Puesta en marcha

1. Clonar el proyecto

```bash
git clone https://github.com/DennGuez/teslo-shop.git
cd teslo-shop
```

2. Instalar dependencias

```bash
yarn install
```

3. Clonar el archivo `.env.template` y renombrarlo a `.env`

4. Cambiar las variables de entorno en `.env`

5. Levantar la base de datos

```bash
docker-compose up -d
```

6. Ejecutar el SEED para poblar la base de datos

```
http://localhost:3000/api/seed
```

7. Levantar el servidor en modo desarrollo

```bash
yarn start:dev
```

## Scripts disponibles

```bash
# Desarrollo (con recarga automática)
yarn start:dev

# Producción
yarn build
yarn start:prod

# Tests
yarn test
yarn test:e2e

# Linter
yarn lint
```

## Licencia

Proyecto de uso educativo.
