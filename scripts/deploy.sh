#!/bin/bash
set -xe

echo "Deploying client-side code..."
rsync -rave ssh --delete client/build/ root@server.connor.money:/var/www/apps/data

echo "Deploying server-side code..."
FNAME=$(npm pack ./api)
scp $FNAME root@server.connor.money:/home/webapi/
ssh root@server.connor.money <<EOF
set -xe
pushd /home/webapi/dataviewerapi
su webapi <<AAA
set -xe
tar -xavf ../$FNAME --strip-components=1 package
npm install
forever stopall
forever start bin/www
AAA
EOF