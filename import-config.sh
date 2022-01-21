#!/bin/sh

set -e

if [ ! -z "$API_PASSWORD" ]
then
    auth="-H Authorization:$API_PASSWORD"
fi

TO="${1:-http://localhost:8000}"

curl -f -X POST -H "Content-Type: application/json" $auth -d '@config.json' $TO/config
