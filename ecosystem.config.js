module.exports = {
  apps: [
    {
      name: 'zora-server',
      // 指向编译后的 JS 文件
      script: './dist/zoraServer/zoraServer.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        TUNNEL_URL: ""
      },
      error_file: './logs/zora-server-error.log',
      out_file: './logs/zora-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'shopify-data-worker',
      // 指向编译后的 JS 文件
      script: './dist/plugins/bullMaskWorker.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/shopify-worker-error.log',
      out_file: './logs/shopify-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'logger',
      // 指向编译后的 JS 文件
      script: './dist/plugins/loggerWorker.js',
      instances: 1,
      autorestart: true,
      min_uptime: '10s',
      restart_delay: 4000,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/logger-error.log',
      out_file: './logs/logger-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ]
};
