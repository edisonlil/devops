#!/bin/bash

# 获取脚本所在目录
DOCKER_HELPER_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$DOCKER_HELPER_SCRIPT_DIR/log.sh"
source "$DOCKER_HELPER_SCRIPT_DIR/tools.sh"


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
