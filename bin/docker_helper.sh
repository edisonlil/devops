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


# 复制模板目录中的额外文件到构建上下文
function copy_template_files_to_build_context() {
	local template_dir="$1"
	local build_context="$2"

	if [ ! -d "$template_dir" ]; then
		if [[ "${DEBUG}" == "true" ]]; then
			echo "DEBUG: 模板目录不存在: $template_dir"
		fi
		return 0
	fi

	if [[ "${DEBUG}" == "true" ]]; then
		echo "DEBUG: 复制模板文件从 $template_dir 到 $build_context"
	fi

	# 确保构建上下文目录存在
	mkdir -p "$build_context"

	# 查找模板目录中除了dockerfile和deploy.yaml之外的其他文件
	local copied_files=()
	local skipped_files=()
	local overwritten_files=()

	for file in "$template_dir"/*; do
		if [ -f "$file" ]; then
			local filename=$(basename "$file")
			local target_file="$build_context/$filename"

			# 跳过dockerfile和deploy.yaml文件
			if [[ "$filename" != "dockerfile" && "$filename" != "deploy.yaml" && "$filename" != "deploy.yml" && "$filename" != "meta.json" ]]; then

				# 检查目标文件是否已存在
				if [ -f "$target_file" ]; then
					# 比较文件内容是否相同
					if cmp -s "$file" "$target_file"; then
						if [[ "${DEBUG}" == "true" ]]; then
							echo "DEBUG: 文件内容相同，跳过: $filename"
						fi
						skipped_files+=("$filename")
					else
						# 强制覆盖已存在的文件
						cp -f "$file" "$build_context/"
						overwritten_files+=("$filename")
						info "覆盖模板文件到构建上下文: $filename"
					fi
				else
					# 复制新文件
					cp "$file" "$build_context/"
					copied_files+=("$filename")
					info "复制模板文件到构建上下文: $filename"
				fi

				# 验证复制是否成功
				if [ ! -f "$target_file" ]; then
					error "复制文件失败: $filename"
				elif [[ "${DEBUG}" == "true" ]]; then
					echo "DEBUG: 文件复制成功: $filename ($(stat -c%s "$target_file") bytes)"
				fi
			else
				if [[ "${DEBUG}" == "true" ]]; then
					echo "DEBUG: 跳过系统文件: $filename"
				fi
			fi
		fi
	done

	# 显示详细的复制结果
	local total_processed=$((${#copied_files[@]} + ${#overwritten_files[@]} + ${#skipped_files[@]}))

	if [ $total_processed -gt 0 ]; then
		info "模板文件处理完成: 新复制 ${#copied_files[@]} 个，覆盖 ${#overwritten_files[@]} 个，跳过 ${#skipped_files[@]} 个"

		if [[ "${DEBUG}" == "true" ]]; then
			if [ ${#copied_files[@]} -gt 0 ]; then
				echo "DEBUG: 新复制的文件: ${copied_files[*]}"
			fi
			if [ ${#overwritten_files[@]} -gt 0 ]; then
				echo "DEBUG: 覆盖的文件: ${overwritten_files[*]}"
			fi
			if [ ${#skipped_files[@]} -gt 0 ]; then
				echo "DEBUG: 跳过的文件: ${skipped_files[*]}"
			fi
		fi

		info "这些文件可在dockerfile中使用 COPY 指令引用"
	else
		if [[ "${DEBUG}" == "true" ]]; then
			echo "DEBUG: 模板目录中没有需要复制的额外文件"
		fi
		# 可选：显示友好提示
		# info "模板目录中只包含系统文件（dockerfile, deploy.yaml），无额外文件需要复制"
	fi
}

# 通用函数：在Docker构建前复制模板文件到最终构建上下文
function copy_template_files_to_final_build_context() {
	if [[ -n "${env[cfg_template_dir]}" && -n "${env[tmp_build_dist_path]}" ]]; then
		info "复制模板文件到最终构建上下文: ${env[tmp_build_dist_path]}"
		copy_template_files_to_build_context "${env[cfg_template_dir]}" "${env[tmp_build_dist_path]}"
	fi
}