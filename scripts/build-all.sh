#!/usr/bin/env bash
set -euo pipefail

echo "Building Rappidex Native Messaging Host..."
go build -o bin/rappidex-native-host ./cmd/native-host

echo "Building Rappidex Desktop App..."
go build -o bin/rappidex .

