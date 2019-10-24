#!/bin/bash
set -xe

pushd "$(dirname "$0")/.."

if [ "$1" != "server" ]; then
echo "Deploying client-side code..."
# rsync -rave ssh --delete client/build/ root@ec2-3-132-159-198.us-east-2.compute.amazonaws.com:/srv/dataclient
aws s3 sync --acl public-read client/build/ s3://www.data.wuracing.com/
fi

echo "Deploying server-side code..."
FNAME=$(npm pack ./api)
scp $FNAME ec2-user@ec2-3-132-159-198.us-east-2.compute.amazonaws.com:/srv/dataserver
ssh ec2-user@ec2-3-132-159-198.us-east-2.compute.amazonaws.com <<EOF
set -xe
pushd /srv/dataserver
tar -xavf $FNAME --strip-components=1 package
npm install
forever stopall
DATA_PASS=$DATA_PASS forever start bin/www
EOF

popd