# 🚀 Roo Code Cloud Monorepo

- [📋 Prerequisites](#-prerequisites)
- [🔐 Environment Setup](#-environment-setup)
- [🗄️ Database Setup](#️-database-setup)
- [🌐 Running the Web App](#-running-the-web-app)
- [🤖 Roomote Services](#-roomote-services)
- [🛠️ Development Commands](#️-development-commands)
- [🔧 Troubleshooting](#-troubleshooting)
- [📚 Additional Resources](#-additional-resources)

## 📋 Prerequisites

Before getting started, ensure you have the following installed:

| Tool                  | Version | Installation                                                                     |
| --------------------- | ------- | -------------------------------------------------------------------------------- |
| 🍎 **macOS**          | Latest  | This guide is optimized for macOS                                                |
| 🐳 **Docker Desktop** | Latest  | [Download here](https://www.docker.com/products/docker-desktop/)                 |
| 📦 **Node.js**        | 18+     | Install via [nvm](https://github.com/nvm-sh/nvm) or [asdf](https://asdf-vm.com/) |
| ⚡ **pnpm**           | Latest  | `npm install -g pnpm`                                                            |

## 🔐 Environment Setup

The monorepo uses encrypted environment variables for security. Follow these steps:

### 1. Get Decryption Keys 🔑

Contact your team via Slack to obtain the private keys needed to decrypt environment files.

### 2. Create `.env.keys` File 📄

Create a `.env.keys` file at the repository root with your keys:

```bash
# .env.keys
DOTENV_PRIVATE_KEY_TEST=your_test_key_here
DOTENV_PRIVATE_KEY_DEVELOPMENT=your_dev_key_here
DOTENV_PRIVATE_KEY_PREVIEW=your_preview_key_here
DOTENV_PRIVATE_KEY_PRODUCTION=your_prod_key_here
```

### 3. Verify Setup ✅

Test that decryption is working correctly:

```bash
pnpm install
pnpm --filter @roo-code-cloud/env test
```

If successful, you'll see: ✅ **Environment decryption working correctly!**

## 🗄️ Database Setup

Roo Code Cloud uses multiple databases for different purposes:

- **🐘 PostgreSQL**: Primary application data
- **📊 ClickHouse**: Analytics and time-series data
- **🔴 Redis**: Caching and session storage

### Start All Database Services 🚀

```bash
pnpm db:up
```

This command will:

- 🐳 Start Docker containers for all databases
- 🔄 Automatically sync PostgreSQL schema to the latest version
- 🌐 Make services available on standard ports

### Reset Database (if needed) 🔄

To completely reset your local database:

```bash
pnpm db:reset
```

### ClickHouse Manual Reset 🔧

If you encounter ClickHouse schema issues:

```bash
# Stop all databases
pnpm db:down

# Remove ClickHouse data
rm -rf .docker/data/clickhouse

# Restart everything
pnpm db:up
```

### Configure Local Hosts 🌐

Add these entries to your `/etc/hosts` file for proper local development:

```bash
# /etc/hosts

127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost

# 🚀 Roo Code Cloud Services
127.0.0.1 postgres redis clickhouse
```

## 🌐 Running the Web App

Start the main web application:

```bash
pnpm --filter @roo-code-cloud/web dev
```

🎯 **Access your app**: [http://localhost:3000](http://localhost:3000)

### What you'll see:

- 🎨 Modern, responsive web interface
- 🔐 Authentication and user management
- 📊 Dashboard with analytics
- ⚙️ Settings and configuration panels

### Linking with local Roo Code API

Make sure you are added to the Roo Cloud development organization.

To point the Roo VSCode extension at your local cloud database, in the `Roo-Code` repo, add the following to `src/.env`:

```
CLERK_BASE_URL=https://epic-chamois-85.clerk.accounts.dev
ROO_CODE_API_URL=http://localhost:3000
```

## 🤖 Roomote Services

Roomote provides intelligent automation and workflow management.

> 📝 **Note**: Detailed Roomote documentation is currently being developed.
>
> For now, refer to our [Work-in-Progress Setup Guide](https://www.notion.so/Roomote-Local-Setup-21cfd1401b0a80fc9e8ac37e7c4cfc05).

### Available Roomote Commands:

```bash
# Start Roomote dashboard
pnpm --filter @roo-code-cloud/roomote-dashboard dev

# Run Roomote worker
pnpm --filter @roo-code-cloud/roomote worker

# Check Roomote health
pnpm --filter @roo-code-cloud/roomote health
```

## 🛠️ Development Commands

Here are the most commonly used development commands:

### Testing 🧪

```bash
# Run all tests
pnpm test

# Test specific file
pnpm test path/to/file.test.ts

# Run tests in watch mode
pnpm test --watch
```

### Code Quality 🔍

```bash
# Lint all code
pnpm lint

# Type checking
pnpm check-types

# Format code (auto-formatted on commit)
pnpm format
```

### Database Operations 🗄️

```bash
# Push schema changes
pnpm db:push

# Generate new migration
pnpm --filter @roo-code-cloud/db db:generate

# Run pending migrations
pnpm --filter @roo-code-cloud/db db:migrate

# Reset database completely
pnpm db:reset
```

### Package Management 📦

```bash
# Install dependencies
pnpm install

# Add dependency to specific workspace
pnpm --filter @roo-code-cloud/web add package-name

# Update all dependencies
pnpm update
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 🚫 Database Connection Errors

```bash
# Check if containers are running
docker ps

# Restart database services
pnpm db:down && pnpm db:up

# Verify hosts file configuration
cat /etc/hosts | grep -E "(postgres|redis|clickhouse)"
```

#### 🔐 Environment Decryption Fails

- ✅ Verify `.env.keys` file exists and contains valid keys
- ✅ Check with team for updated keys
- ✅ Ensure no extra spaces or characters in key values

#### 📦 Package Installation Issues

```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install
```

#### 🐳 Docker Issues

```bash
# Reset Docker Desktop
# Restart Docker Desktop application

# Clean Docker system
docker system prune -a
```
