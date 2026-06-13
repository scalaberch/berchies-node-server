#!/bin/bash

# move to directory
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR
cd ../..

# setup submodule
if [ ! -d "server" ]; then 
  # git submodule add https://github.com/scalaberch/berchies-node-server.git server
  # git submodule update --init --recursive
  echo "server does not exist";
fi

# add up the pre-push
if [ ! -d ".githooks" ]; then 
  cp -R server/bootstrap/githooks .githooks
  git config core.hooksPath .githooks
fi
