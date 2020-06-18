#!/bin/bash
set -eux -o pipefail

[ ! -d dist ] || rm -rf dist

mkdir dist

cp -r webapp_deploy dist/
[ -e dist/webapp_deploy/__pycache__ ] && rm dist/webapp_deploy/__pycache__ -rf

# We currently do not install requirements.txt as the
# items are already present in lambda runtime.
