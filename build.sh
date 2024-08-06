#!/bin/bash
set -eux -o pipefail

rm -rf dist
mkdir dist
cp -r webapp_deploy dist/

if [ -e dist/webapp_deploy/__pycache__ ]; then
  rm -rf dist/webapp_deploy/__pycache__
fi

# We currently do not install requirements.txt as the
# items are already present in lambda runtime.
