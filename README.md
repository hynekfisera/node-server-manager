# node-server-manager
A simple service manager built on docker engine. You can generate almost any service from templates using REST protocol. This is useful for creating game servers dynamically from templates.

## Installation on Linux
1. Fill up .env file from template at `.env.example`.
2. Run `setup.sh` to install all dependencies and sync database schema.

## Installation on Windows
1. Fill up .env file from template at `.env.example`.
2. Run `npm install`
3. Run `npx prisma generate` to generate Prisma client
4. Run `npx prisma migrate dev --name init` to sync database schema

## Running NSM
Run `npm start` to start the server.

## Creating a template
TODO
## Using the NSM API for managing services
TODO