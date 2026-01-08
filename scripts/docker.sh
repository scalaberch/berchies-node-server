#!/bin/bash
# move to directory
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR
cd ../..

# load environment file
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# make sure that the network exists first!
# NETWORK_NAME="network"
# if docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
#   echo "✅ Docker network '${NETWORK_NAME}' already exists."
# else
#   echo "🔧 Creating Docker network '${NETWORK_NAME}'..."
#   docker network create "${NETWORK_NAME}"
#   echo "✅ Network '${NETWORK_NAME}' created."
# fi

# if docker doesnt exist then build it.
if [ -z "$(docker-compose -p $PROJ_NAME ps -q)" ]; then
  docker-compose -p $PROJ_NAME -f ./docker/dev.yml build --no-cache
else
  if [ "$1" == "build" ]; then
    docker-compose -p $PROJ_NAME -f ./docker/dev.yml build
  fi
fi

# run docker for development purposes.
docker-compose -p $PROJ_NAME  -f ./docker/dev.yml up -d