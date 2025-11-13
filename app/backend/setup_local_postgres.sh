#!/bin/bash

# Setup script for local Postgres with PostGIS
# Run this script to set up a local Postgres database for the roads data

set -e

echo "🗄️  Setting up local Postgres with PostGIS..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo "   Install it with: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Check if PostGIS is installed
if ! dpkg -l | grep -q postgresql.*postgis; then
    echo "⚠️  PostGIS extension not found."
    echo "   Installing PostGIS..."
    sudo apt-get update
    sudo apt-get install -y postgresql-postgis
fi

# Get PostgreSQL version
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
echo "✅ PostgreSQL version: $PG_VERSION"

# Database configuration
DB_NAME="${DB_NAME:-accinet}"
DB_USER="${DB_USER:-postgres}"

echo ""
echo "📝 Database configuration:"
echo "   Database name: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Create database if it doesn't exist
echo "🔨 Creating database '$DB_NAME'..."
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    sudo -u postgres createdb "$DB_NAME"

# Enable PostGIS extension
echo "🗺️  Enabling PostGIS extension..."
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS postgis;" || true

# Verify PostGIS installation
echo "✅ Verifying PostGIS installation..."
POSTGIS_VERSION=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT PostGIS_version();" | xargs)
echo "   PostGIS version: $POSTGIS_VERSION"

# Check if password authentication is needed
echo ""
echo "🔐 Checking PostgreSQL authentication..."

# Try to connect without password to see if it works
if sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✅ Local connections work without password (peer authentication)"
    DB_PASS=""
    PASSWORD_NOTE="(no password needed for local connections)"
else
    echo "   ⚠️  Password authentication may be required"
    DB_PASS="postgres"
    PASSWORD_NOTE="(default password, change if needed)"
fi

# Optionally set password for postgres user
echo ""
read -p "Do you want to set a password for the 'postgres' user? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -sp "Enter new password for 'postgres' user: " NEW_PASS
    echo
    read -sp "Confirm password: " NEW_PASS_CONFIRM
    echo
    
    if [ "$NEW_PASS" = "$NEW_PASS_CONFIRM" ]; then
        sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$NEW_PASS';" || true
        DB_PASS="$NEW_PASS"
        PASSWORD_NOTE="(password set)"
        echo "   ✅ Password set successfully"
    else
        echo "   ❌ Passwords don't match, skipping password setup"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Add these to your .env file:"
echo "   USE_LOCAL_DB=true"
echo "   DB_HOST=localhost"
echo "   DB_PORT=5432"
echo "   DB_NAME=$DB_NAME"
echo "   DB_USER=$DB_USER"
if [ -n "$DB_PASS" ]; then
    echo "   DB_PASS=$DB_PASS"
else
    echo "   DB_PASS="
fi
echo ""
echo "   $PASSWORD_NOTE"
echo ""

