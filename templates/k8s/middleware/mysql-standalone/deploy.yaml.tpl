apiVersion: v1
kind: Secret
metadata:
  name: ?instance_name-mysql-auth
  namespace: ?namespace
  labels:
    app: ?instance_name
    app.kubernetes.io/name: mysql
    app.kubernetes.io/instance: ?instance_name
    app.kubernetes.io/managed-by: devops-middleware
type: Opaque
data:
  # 密码将在部署时自动生成或使用用户提供的密码
  root-password: {{ mysql_root_password | b64encode if mysql_root_password != 'auto-generate' else 'YXV0by1nZW5lcmF0ZWQ=' }}
  {% if mysql_user %}
  user: {{ mysql_user | b64encode }}
  password: {{ mysql_password | b64encode if mysql_password != 'auto-generate' else 'YXV0by1nZW5lcmF0ZWQ=' }}
  {% endif %}

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ?instance_name-mysql-config
  namespace: ?namespace
  labels:
    app: ?instance_name
    app.kubernetes.io/name: mysql
    app.kubernetes.io/instance: ?instance_name
    app.kubernetes.io/managed-by: devops-middleware
data:
  my.cnf: |
    [mysqld]
    # 基本配置
    port = 3306
    bind-address = 0.0.0.0
    
    # 字符集配置
    character-set-server = ?mysql_charset
    collation-server = {% if mysql_charset == 'utf8mb4' %}utf8mb4_unicode_ci{% elif mysql_charset == 'utf8' %}utf8_unicode_ci{% else %}latin1_swedish_ci{% endif %}
    
    # InnoDB配置
    innodb_buffer_pool_size = {{ (memory_limit | regex_replace('Gi', '') | int * 1024 * 0.7) | int if 'Gi' in memory_limit else (memory_limit | regex_replace('Mi', '') | int * 0.7) | int }}M
    innodb_log_file_size = 256M
    innodb_flush_log_at_trx_commit = 1
    innodb_flush_method = O_DIRECT
    
    # 连接配置
    max_connections = 200
    max_connect_errors = 1000
    
    # 查询缓存
    query_cache_type = 1
    query_cache_size = 64M
    
    # 日志配置
    log-error = /var/log/mysql/error.log
    slow_query_log = 1
    slow_query_log_file = /var/log/mysql/slow.log
    long_query_time = 2
    
    # 二进制日志
    log-bin = mysql-bin
    binlog_format = ROW
    expire_logs_days = 7
    
    # 安全配置
    skip-name-resolve
    
    [mysql]
    default-character-set = ?mysql_charset
    
    [client]
    default-character-set = ?mysql_charset

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ?instance_name-mysql-data
  namespace: ?namespace
  labels:
    app: ?instance_name
    app.kubernetes.io/name: mysql
    app.kubernetes.io/instance: ?instance_name
    app.kubernetes.io/managed-by: devops-middleware
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: ?storage_size
  {% if storage_class %}
  storageClassName: ?storage_class
  {% endif %}

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ?instance_name-mysql
  namespace: ?namespace
  labels:
    app: ?instance_name
    app.kubernetes.io/name: mysql
    app.kubernetes.io/instance: ?instance_name
    app.kubernetes.io/version: "8.0"
    app.kubernetes.io/component: database
    app.kubernetes.io/part-of: middleware
    app.kubernetes.io/managed-by: devops-middleware
spec:
  serviceName: ?instance_name-mysql-headless
  replicas: ?replicas
  selector:
    matchLabels:
      app: ?instance_name
      app.kubernetes.io/name: mysql
      app.kubernetes.io/instance: ?instance_name
  template:
    metadata:
      labels:
        app: ?instance_name
        app.kubernetes.io/name: mysql
        app.kubernetes.io/instance: ?instance_name
        app.kubernetes.io/version: "8.0"
        app.kubernetes.io/component: database
        app.kubernetes.io/part-of: middleware
        app.kubernetes.io/managed-by: devops-middleware
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
          name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ?instance_name-mysql-auth
              key: root-password
        {% if mysql_database %}
        - name: MYSQL_DATABASE
          value: "?mysql_database"
        {% endif %}
        {% if mysql_user %}
        - name: MYSQL_USER
          valueFrom:
            secretKeyRef:
              name: ?instance_name-mysql-auth
              key: user
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ?instance_name-mysql-auth
              key: password
        {% endif %}
        volumeMounts:
        - name: config
          mountPath: /etc/mysql/conf.d
        - name: data
          mountPath: /var/lib/mysql
        - name: logs
          mountPath: /var/log/mysql
        resources:
          requests:
            memory: ?memory_request
            cpu: ?cpu_request
          limits:
            memory: ?memory_limit
            cpu: ?cpu_limit
        livenessProbe:
          exec:
            command:
            - mysqladmin
            - ping
            - -h
            - localhost
            - -u
            - root
            - -p$(MYSQL_ROOT_PASSWORD)
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          exec:
            command:
            - mysqladmin
            - ping
            - -h
            - localhost
            - -u
            - root
            - -p$(MYSQL_ROOT_PASSWORD)
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
      volumes:
      - name: config
        configMap:
          name: ?instance_name-mysql-config
      - name: data
        persistentVolumeClaim:
          claimName: ?instance_name-mysql-data
      - name: logs
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: ?instance_name-mysql-headless
  namespace: ?namespace
  labels:
    app: ?instance_name
    app.kubernetes.io/name: mysql
    app.kubernetes.io/instance: ?instance_name
    app.kubernetes.io/managed-by: devops-middleware
spec:
  type: ClusterIP
  clusterIP: None
  ports:
  - port: 3306
    targetPort: 3306
    name: mysql
  selector:
    app: ?instance_name
    app.kubernetes.io/name: mysql
    app.kubernetes.io/instance: ?instance_name

---
apiVersion: v1
kind: Service
metadata:
  name: ?instance_name
  namespace: ?namespace
  labels:
    app: ?instance_name
    app.kubernetes.io/name: mysql
    app.kubernetes.io/instance: ?instance_name
    app.kubernetes.io/managed-by: devops-middleware
spec:
  type: {% if export_port %}NodePort{% else %}ClusterIP{% endif %}
  ports:
  - port: ?service_port
    targetPort: 3306
    name: mysql
    {% if export_port %}
    nodePort: ?export_port
    {% endif %}
  selector:
    app: ?instance_name
    app.kubernetes.io/name: mysql
    app.kubernetes.io/instance: ?instance_name
