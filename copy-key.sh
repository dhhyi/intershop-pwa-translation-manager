#!/bin/sh

set -e

if [ ! -z "$API_PASSWORD" ]
then
    auth="-H Authorization:$API_PASSWORD"
fi

TM="${1:-http://localhost:8000}"
FROM="$2"
if [ -z "$FROM" ]
then
    echo -n "from: "
    read FROM
fi
TO="$3"
if [ -z "$TO" ]
then
    echo -n "to: "
    read TO
fi

if [ -z "$FROM" ] || [ -z "$TO" ]
then
    echo "Usage: $0 <url> <from> <to>"
    exit 1
fi

curl -f -X POST -H "Content-Type: application/json" $auth -d "{ \"from\": \"$FROM\", \"to\": \"$TO\" }" $TM/copy-key
