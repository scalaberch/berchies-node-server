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

# run nodemon
nodemon --config ./server/nodemon.json
trap "echo 'Caught SIGTERM, exiting...'; exit 0" SIGTERM SIGINT
