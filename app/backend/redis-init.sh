#!/bin/bash

set -e # set exit on error

CONTAINER_NAME="redis-server"
IMAGE_NAME="redis:8.2.3-alpine"
PORT="6379"

echo "Checking if docker daemon is running..."
if ! pgrep -x "dockerd" > /dev/null; #-x flag for pgrep means exact match of searched substring
then
    echo "Starting docker daemon..."
    sudo service docker start
else
    echo "Docker Daemon already running."
fi

echo "Pulling docker Redis image..."
docker pull $IMAGE_NAME

echo "Removing any current Redis containers..."#2ampersand1 redirects stdout and stderr
docker rm -f $CONTAINER_NAME >/dev/null 2>&1 || true # if it fails just return true for exit status


CONFIG_FILE="/home/rjg/coding/AcciNet/app/backend/redis.conf"

if [-f "$CONFIG_FILE"];
then 
    echo "Redis starting w custom config..."
    docker run -d --name $CONTAINER_NAME -p $PORT:6379 \ 
    -v $CONFIG_FILE:/etc/redis/redis.conf \ 
    $IMAGE_NAME \
    redis-server /usr/local/etc/redis.conf
else
    echo "Defaulted to standard config..."
    docker run -d --name $CONTAINER_NAME -p $PORT:6379 \
    $IMAGE_NAME
fi

echo "Redis running..."
docker ps --filter "name=$CONTAINER_NAME"

