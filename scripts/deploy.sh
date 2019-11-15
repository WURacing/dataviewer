#!/bin/bash
set -xe

pushd "$(dirname "$0")/.."

if [ "$1" != "server" ]; then
echo "Deploying client-side code..."
aws s3 sync --acl public-read client/build/ s3://www.data.wuracing.com/
fi

if [ "$1" != "client" ]; then
echo "Deploying server-side code..."
FNAME=$(npm pack ./api)
scp $FNAME ec2-user@ec2-3-132-159-198.us-east-2.compute.amazonaws.com:/srv/dataserver
ssh ec2-user@ec2-3-132-159-198.us-east-2.compute.amazonaws.com <<EOF
set -xe
pushd /srv/dataserver
sudo systemctl stop dataviewer
tar -xavf $FNAME --strip-components=1 package
npm install
sudo systemctl start dataviewer
EOF
fi

popd