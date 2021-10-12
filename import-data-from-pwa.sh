#!/bin/sh

set -e

if [ -z "$1" ]
then
    echo "need PWA URL as input"
    exit 1
fi

if [ ! -z "$API_PASSWORD" ]
then
    auth="-H Authorization:$API_PASSWORD"
fi

TO="${2:-http://localhost:8000}"

wget -q -O en.json "$1/assets/i18n/en_US.json"
curl -f -X POST -H "Content-Type: application/json" $auth -d '@en.json' $TO/localizations/en
rm en.json

for l in de es fr it nl pt
do
    sleep 1
    wget -q -O $l.json "$1/assets/i18n/$l.json"
    curl -f -X POST -H "Content-Type: application/json" $auth -d "@$l.json" $TO/localizations/$l
    rm $l.json
done
