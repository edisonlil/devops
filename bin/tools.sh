#!/bin/bash


function check_env_by_cmd_v() {
	command -v $1 > /dev/null 2>&1 || (error "Need to install ##$1## command first and run this script again." && exit 1)
}