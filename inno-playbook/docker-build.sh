#!/bin/bash
# Build Docker image for InnoPlaybook private cloud
# Usage: ./docker-build.sh [tag]

set -e

TAG=${1:-latest}
IMAGE="inno-playbook:$TAG"

# Load env from .env.docker if exists
if [ -f .env.docker ]; then
  export $(grep -v '^#' .env.docker | xargs)
  echo "Loaded environment from .env.docker"
else
  echo "Warning: .env.docker not found. Copy .env.docker.example and fill in values."
  exit 1
fi

echo ""
echo "Building $IMAGE ..."
echo ""

docker build \
  --tag "$IMAGE" \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
  .

echo ""
echo "Build complete: $IMAGE"
echo ""
echo "Run:  docker run -p 3000:80 $IMAGE"
echo "Or:   docker compose --env-file .env.docker up -d"
