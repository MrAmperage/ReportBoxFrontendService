#!/bin/sh

docker buildx build \
    --platform linux/amd64 \
    --load \
    -t mr.amperage/report_box_frontend_service:0.0.1 \
    .