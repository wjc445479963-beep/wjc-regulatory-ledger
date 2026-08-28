#!/usr/bin/env bash
set -euo pipefail

# Preserve the historical wrapper contract without requiring local secrets.
exec "$@"
