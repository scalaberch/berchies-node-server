#!/bin/bash

# move to directory
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR
cd ../..

# clean to clean 
FLAG=$1
if [ "$FLAG" == "--clean" ]; then
  npm run clean
fi

# actually build
tsc -p tsconfig.json && tsc-alias -p tsconfig.json

# Check if the exit code is NOT 0
if [ $? -ne 0 ]; then
  echo "❌ Error: TypeScript compilation failed!"
  exit 1
fi

# then copy the other files
rsync -av --exclude 'logs' resources dist
cp -R public dist