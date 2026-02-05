#!/bin/sh

while true; do
  echo "[monitor] Nginx est actif - $(date)" >> /var/log/nginx/monitor.log
  sleep 30
done
