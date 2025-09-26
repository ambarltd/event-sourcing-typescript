#!/bin/bash
set -e

echo "Stopping services and erasing data..."
docker compose down

echo "Going into root mode to delete docker volumes"
sudo echo "Root mode: OK"
sudo rm -Rf data/*

echo ""
echo "======================================================================="
echo "||                        Data erased successfully!                  ||"
echo "======================================================================="
echo "|| Run 'start.sh' to restart the services.                          ||"
echo "======================================================================="
