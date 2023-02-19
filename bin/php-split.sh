#!/usr/bin/env bash

set -e
set -x

CURRENT_BRANCH="client/php-test"

function split()
{
    SHA1=`./bin/splitsh-lite --prefix=$1`
    git push "https://$PUTH_PUSH_SPLIT_TOKEN@github.com/SEUH/puth-laravel.git" "$SHA1:refs/heads/$CURRENT_BRANCH" -f
}

function remote()
{
    git remote add $1 "https://$PUTH_PUSH_SPLIT_TOKEN@github.com/$2" || true
}

#git pull origin $CURRENT_BRANCH

#remote php git@github.com:SEUH/puth-laravel.git
remote laravel SEUH/puth-laravel.git

#split 'workspaces/clients/php/php' php
split 'workspaces/clients/php/laravel' laravel