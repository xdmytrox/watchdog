#!/bin/bash

wait_time=$((RANDOM % 5 + 1))
exit_code=$((RANDOM % 2))
echo "Sleeping for $wait_time seconds..."
sleep "$wait_time"
echo "Exiting with code $exit_code"
exit "$exit_code"
