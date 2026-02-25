#!/bin/sh
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080
ipfs config --json Gateway.NoFetch true
