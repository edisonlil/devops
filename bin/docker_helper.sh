#!/bin/bash

source ./log.sh
source ./tools.sh

function docker_build() {

    image_path=$1
    dockerfile=$2
    build_dist_path=$3

    docker build -t $image_path -f  $dockerfile  $build_dist_path
}


function docker_push(){

  image_path=$1
  enable_harbor=${env[cfg_enable_harbor]}
	#推送镜像
	if test $enable_harbor -eq 1 ;
	then
	    info "开始向harbor推送镜像"
	    docker push $image_path
    fi
    info "$image_path"
    env[tmp_image_path]=$image_path
}
