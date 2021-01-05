#!/bin/bash
set -eu

rm -f source.zip source.tgz

cd source
zip -r ../source.zip .
tar -czf ../source.tgz .
