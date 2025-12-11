#!/bin/bash
set -eux -o pipefail

rm -rf dist
mkdir dist
cp -r webapp_deploy dist/

if [ -e dist/webapp_deploy/__pycache__ ]; then
  rm -rf dist/webapp_deploy/__pycache__
fi
