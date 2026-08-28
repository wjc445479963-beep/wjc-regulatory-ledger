#!/usr/bin/env bash
set -euo pipefail

# Compatibility entry point for Git Bash, WSL, and CI.
# The package-level build command is cross-platform and performs the actual build.
npm run build
