#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR
cd ../..

# load environment file
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# run ngrok
ngrok http $PORT --domain=$NGROK_DOMAIN --authtoken=$NGROK_AUTHTOKEN