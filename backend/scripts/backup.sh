#!/bin/bash
# JD-CRM Automated Database Backup Script
# Typically triggered by a cron job or external task scheduler

set -e

# Configuration
BACKUP_DIR="/var/backups/jd-crm/postgresql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER_NAME="jd-crm-db-1" # Container name if running in Docker
DB_USER="postgres"
DB_NAME="jdcrm"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

# Perform Backup
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"
echo "Starting database backup: $BACKUP_FILE"

# Assuming docker-compose setup
docker exec -t $DB_CONTAINER_NAME pg_dumpall -c -U $DB_USER | gzip > "$BACKUP_FILE"

echo "Backup completed successfully."

# Cleanup old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -exec rm {} \;

echo "Cleanup finished."
