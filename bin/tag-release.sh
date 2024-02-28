#!/usr/bin/env bash

set -e
set -x

if (( "$#" != 2 ))
then
    echo "Tag and remote has to be provided."
    exit 1
fi

VERSION=$1
REMOTE=$2

echo "Releasing puth $REMOTE";

TMP_DIR="/tmp/puth-split"
REMOTE_URL="https://SEUH:$PUTH_SPLIT_PUTH_TOKEN@github.com/puth-io/$REMOTE.git"

rm -rf $TMP_DIR;
mkdir $TMP_DIR;

(
    cd $TMP_DIR;

    git clone "$REMOTE_URL" .
    git checkout master;

    git tag "$VERSION"
    git push origin --tags
)
