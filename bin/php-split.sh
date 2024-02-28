#!/usr/bin/env bash

set -e
set -x

CURRENT_BRANCH="master"

function split()
{
    SHA1=`./bin/splitsh-lite --prefix=$1`
    git push -f $2 "$SHA1:refs/heads/$CURRENT_BRANCH"
}

function remote()
{
    git remote add $1 "https://github.com/$2" || true
}

remote php puth-io/php.git
remote laravel puth-io/laravel.git

split "$@"

#split 'workspaces/clients/php/client' php
#split 'workspaces/clients/php/laravel' laravel
