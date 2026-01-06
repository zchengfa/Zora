module.exports = {
  apps: [{
    name: 'zora-server',
    script: './zoraServer/zoraServer.js', // 主服务器入口文件
    instances: 1,
    autorestart: true,
    env:{
      TUNNEL_URL:"https://207e7fa98bc3.ngrok-free.app:3001"
    }
  }, {
    name: 'shopify-data-worker',
    script: './plugins/bullMaskWorker.js', // Worker 入口文件
    instances: 1, // 根据 CPU 核心数设置多个实例
    autorestart: true,
    max_memory_restart: '500M' // 内存使用超限时自动重启
  }]
};
