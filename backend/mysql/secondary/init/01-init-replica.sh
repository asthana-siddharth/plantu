#!/bin/bash
set -euo pipefail

echo "[replica-init] Waiting for mysql-primary..."
until mysql -h mysql-primary -uroot -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; do
  sleep 2
done

echo "[replica-init] Getting primary binlog coordinates..."
MASTER_STATUS=$(mysql -h mysql-primary -uroot -p"${MYSQL_ROOT_PASSWORD}" -Nse "SHOW MASTER STATUS")
MASTER_LOG_FILE=$(echo "${MASTER_STATUS}" | awk '{print $1}')
MASTER_LOG_POS=$(echo "${MASTER_STATUS}" | awk '{print $2}')

if [ -z "${MASTER_LOG_FILE}" ] || [ -z "${MASTER_LOG_POS}" ]; then
  echo "[replica-init] Failed to detect master status"
  exit 1
fi

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
STOP REPLICA;
RESET REPLICA ALL;
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-primary',
  SOURCE_PORT=3306,
  SOURCE_USER='replica',
  SOURCE_PASSWORD='replica123',
  SOURCE_LOG_FILE='${MASTER_LOG_FILE}',
  SOURCE_LOG_POS=${MASTER_LOG_POS};
START REPLICA;
SQL

echo "[replica-init] Replication configured"
mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW REPLICA STATUS\\G" || true
