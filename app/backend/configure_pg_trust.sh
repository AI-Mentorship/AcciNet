#!/bin/bash
# Script to configure PostgreSQL to allow passwordless TCP/IP connections from localhost

PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
PG_HBA_FILE="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

if [ ! -f "$PG_HBA_FILE" ]; then
    echo "❌ Could not find pg_hba.conf at $PG_HBA_FILE"
    echo "   Please find your pg_hba.conf file manually:"
    echo "   find /etc/postgresql -name pg_hba.conf"
    exit 1
fi

echo "📝 Found pg_hba.conf at: $PG_HBA_FILE"
echo ""
echo "Current configuration (non-comment lines):"
sudo grep -v "^#" "$PG_HBA_FILE" | grep -v "^$" | head -10
echo ""

# Check if trust entry already exists
if sudo grep -q "^host.*all.*all.*127.0.0.1/32.*trust" "$PG_HBA_FILE"; then
    echo "✅ Trust authentication for localhost already configured!"
    exit 0
fi

echo "🔧 Adding trust authentication for localhost TCP/IP connections..."
echo ""

# Create backup
sudo cp "$PG_HBA_FILE" "${PG_HBA_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Created backup: ${PG_HBA_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Add trust entry at the beginning (before other host entries)
# This allows passwordless connections from localhost
TRUST_LINE="host    all    all    127.0.0.1/32    trust"

# Check if we should add it after IPv4 local connections section
if sudo grep -q "^host.*all.*all.*127.0.0.1/32" "$PG_HBA_FILE"; then
    echo "⚠️  Found existing host entry for 127.0.0.1/32"
    echo "   You may need to modify it manually or this script will add a new entry"
fi

# Add the trust line after the first non-comment, non-blank line that's not a comment
# We'll add it right after the local connections section
sudo sed -i "/^# IPv4 local connections:/a\\$TRUST_LINE" "$PG_HBA_FILE" 2>/dev/null || \
sudo sed -i "1a\\$TRUST_LINE" "$PG_HBA_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Added trust authentication line to pg_hba.conf"
    echo ""
    echo "📋 New configuration (relevant lines):"
    sudo grep -E "^host.*127.0.0.1" "$PG_HBA_FILE" | head -5
    echo ""
    echo "🔄 Restarting PostgreSQL..."
    sudo systemctl restart postgresql
    
    if [ $? -eq 0 ]; then
        echo "✅ PostgreSQL restarted successfully!"
        echo ""
        echo "🧪 Testing connection..."
        sleep 2
        psql -h localhost -U "$USER" -d accinet -c "SELECT 1;" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "✅ Connection test successful! Passwordless TCP/IP connections are now enabled."
        else
            echo "⚠️  Connection test failed. You may need to:"
            echo "   1. Check that your user '$USER' exists in PostgreSQL"
            echo "   2. Verify the database 'accinet' exists"
            echo "   3. Check PostgreSQL logs: sudo tail -f /var/log/postgresql/postgresql-${PG_VERSION}-main.log"
        fi
    else
        echo "❌ Failed to restart PostgreSQL. Check the error above."
        echo "   You can restore the backup: sudo cp ${PG_HBA_FILE}.backup.* $PG_HBA_FILE"
    fi
else
    echo "❌ Failed to modify pg_hba.conf"
    echo "   Please edit it manually: sudo nano $PG_HBA_FILE"
    echo "   Add this line in the IPv4 local connections section:"
    echo "   $TRUST_LINE"
fi

