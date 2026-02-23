import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  // 确保使用 Node.js 环境
  ssr: {
    target: "node",
  },
  // Node 模式配置
  mode: "production",

  // 构建配置
  build: {
    // 输出目录
    outDir: "dist",
    // 空格缩进
    minify: "terser",
    // 生成 sourcemap
    sourcemap: true,
    // 目标环境
    target: "node20",
    // 使用 CommonJS 格式
    lib: {
      entry: resolve(__dirname, "zoraServer/zoraServer.ts"),
      formats: ["cjs"],
      fileName: "zoraServer/zoraServer.js",
    },
    // 打包配置
    rollupOptions: {
      // 外部依赖，不打包进最终文件
      external: [
        // Node.js 内置模块
        "node:*",
        "crypto",
        "fs",
        "path",
        "os",
        "http",
        "https",
        "stream",
        "util",
        "events",
        "buffer",
        "child_process",
        "cluster",
        "net",
        "tls",
        "dgram",
        "dns",
        "url",
        "querystring",
        "zlib",
        "worker_threads",
        "perf_hooks",
        // 第三方依赖
        "express",
        "cors",
        "body-parser",
        "ioredis",
        "@prisma/client",
        "socket.io",
        "dotenv",
        "express-rate-limit",
        "winston",
        "winston-daily-rotate-file",
        "bullmq",
        "openai",
        "nodemailer",
        "bcrypt",
        "jsonwebtoken",
        "uuid",
        "axios",
        "shopify-api-node",
        "shippo",
      ],
      output: {
        // 保持模块结构
        preserveModules: false,
        // 导出格式
        exports: "auto",
        // 全局变量定义
        globals: {},
        // 手动分包配置
        manualChunks(id) {
          // 将 plugins 目录下的文件打包为 plugins-chunk
          if (id.includes("/plugins/")) {
            return "plugins-chunk";
          }
          // 将 zoraServer 目录下的文件打包为 server-chunk
          if (id.includes("/zoraServer/")) {
            return "server-chunk";
          }
        },
        // 分包大小警告阈值
        chunkSizeWarningLimit: 1000
      },
    },
    // 压缩配置
    terserOptions: {
      compress: {
        // 删除 console
        drop_console: true,
        // 删除 debugger
        drop_debugger: true,
        // 删除无用代码
        dead_code: true,
        // 删除未使用的函数
        unused: true,
        // 内联函数
        inline: 2,
        // 移除 if-return 和 if-else 中的冗余代码
        if_return: true,
        // 简化条件表达式
        conditionals: true,
        // 简化比较
        comparisons: true,
        // 评估常量表达式
        evaluate: true,
        // 布尔值简化
        booleans: true,
        // 压缩对象键
        properties: true,
        // 合并变量声明
        join_vars: true,
        // 减少变量数量
        reduce_vars: true,
        // 简化 typeof
        typeofs: true,
      },
      mangle: {
        // 混淆变量名
        toplevel: true,
        // 混淆函数名
        keep_fnames: false,
        // 混淆属性名
        keep_classnames: false,
      },
      format: {
        // 删除注释
        comments: false,
        // 紧凑输出
        beautify: false,
      },
    },
    // 资源内联限制
    assetsInlineLimit: 4096,
  },

  // 解析配置
  resolve: {
    // 解析条件，优先使用 Node.js 环境
    conditions: ["node", "import", "require"],
    // 别名配置，处理 Node.js 内置模块
    alias: {
      "node:crypto": "crypto",
      "node:fs": "fs",
      "node:path": "path",
      "node:os": "os",
      "node:http": "http",
      "node:https": "https",
      "node:stream": "stream",
      "node:util": "util",
      "node:events": "events",
      "node:buffer": "buffer",
      "node:child_process": "child_process",
      "node:cluster": "cluster",
      "node:net": "net",
      "node:tls": "tls",
      "node:dgram": "dgram",
      "node:dns": "dns",
      "node:url": "url",
      "node:querystring": "querystring",
      "node:zlib": "zlib",
      "node:worker_threads": "worker_threads",
      "node:perf_hooks": "perf_hooks",
    },
    // 扩展名
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },

  // 插件配置
  plugins: [],
});
