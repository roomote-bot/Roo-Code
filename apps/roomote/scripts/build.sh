#!/bin/bash

# Build script for roomote services.
# This ensures the base image is built before dependent services.

set -e

build_service() {
    local service=$1
    
    case $service in
        "dashboard"|"api"|"worker"|"controller")
            echo "Building base image first..."
            docker compose build base
            echo "Building $service..."
            docker compose build $service
            ;;
        "base")
            echo "Building base image..."
            docker compose build base
            ;;
        *)
            echo "Building $service..."
            docker compose build $service
            ;;
    esac
}

if [ $# -eq 0 ]; then
    echo "Usage: $0 <service_name>"
    echo "Available services: base, dashboard, api, worker, controller, db, redis"
    echo "Example: $0 dashboard"
    exit 1
fi

build_service $1

echo "Build completed successfully!"
