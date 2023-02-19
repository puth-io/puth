#!/usr/bin/env bash

set -e
set -x

# Make sure the release tag is provided.
if (( "$#" != 1 ))
then
    echo "Tag has to be provided."

    exit 1
fi

VERSION=$1

# Tag Components
for REMOTE in php laravel
do
    echo ""
    echo ""
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
done