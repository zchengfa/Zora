export default {
  "en": {
    "components":{
      "empty":{
        "profile":{
          "title": "No Customer Profile",
          "subtitle": "Select a customer to view their profile.",
        },
        "customer":{
          "title": "No Customers",
          "subtitle": "Add a customer to start chatting.",
          "primaryAction": {
            "content": "Add Customer"
          }
        },
        "message":{
          "title": "No Message",
          "subtitle": "You have no messages yet",
          "primaryAction": {
            "content": "Start New Chat"
          }
        }
      },
      "notification":{
        "ariaLabel":"Close Notification"
      },
      "modal":{
        "default":{
          "title": "Tooltip",
          "confirmationText" : "Are you sure you want to proceed with this action?",
          "successText" : "Operation successful!",
          "errorText" : "Operation failed. Please try again.",
          "cancelButtonText" : "cancel",
          "confirmButtonText" : "confirm",
        },
        "loading": "Processing...",
        "ariaLabel":"Close modal box"
      },
      "profile":{
        "score":{
          "valueScore": "Value Score",
          "loyaltyScore": "Loyalty Score",
          "engagementScore": "Engagement Score"
        },
        "customerDetail":{
          "title": "Customer Information",
          "id": "Customer ID",
          "email": "Email",
          "phone": "Phone",
          "since": "Customer Since"
        },
        "tags":"Customer Tags",
        "status":{
          "online":"Online",
          "offline":"Offline"
        },
        "statistics":{
          "order":{
            "title": "Order Statistics",
            "totalOrders": "Total Orders",
            "completed": "Completed",
            "cancelled": "Cancelled",
            "refunded": "Refunded",
            "processing": "Processing",
            "shipped": "Shipped"
          },
          "spending":{
            "title": "Spending Statistics",
            "totalSpent": "Total Spent",
            "averageOrderValue": "Average Order Value",
            "firstOrder": "First Order",
            "lastOrder": "Last Order",
            "daysSinceLastOrder": "Days Since Last Order",
            "avgDaysBetweenOrders": "Avg Days Between Orders",
            "days": "days"
          },
          "preferences":{
            "title": "Product Preferences",
            "items": "items"
          },
          "topProducts":{
            "title": "Top Products",
            "orders": "orders"
          },
          "recentOrders":{
            "title": "Recent Orders",
            "items": "items"
          }
        },
        "actions":{
          "viewOrderHistory": "View Order History",
          "sendProductRecommendation": "Send Product Recommendation",
          "createTicket": "Create Ticket"
        }
      },
      "chat":{
        "inputPlaceholder": "Type a message...",
        "status": "Status",
        "title": "Chat",
        "searchPlaceholder": "Search",
        "noResult": "No results found",
        "messageStatus":{
          "read": "Read",
          "unread": "Unread"
        }
      },
      "product":{
        "recommendTitle": "Recommend Product",
        "confirmText": "Do you want to recommend this product to the customer?",
        "confirmButton": "Recommend",
        "cancelButton": "Don't Recommend",
        "cancelAction": "You have cancelled the product recommendation"
      }
    },
    "setting": {
      "app": {
        "title": "App Settings",
        "subtitle": "Manage app preferences",
        "primaryAction": {
          "content": "Save Settings"
        }
      },
      "interface": {
        "title": "Interface Settings",
        "subtitle": "Dark Mode",
        "subInfo": "Toggle dark/light theme" ,
        "label":"Application theme",
        "primaryAction": {
          "content": "Save Settings"
        }
      },
      "notification":{
        "title": "Notification Settings",
        "subtitle": "Email Notifications",
        "subInfo": "Receive email alerts for new messages" ,
        "label":{
          "email": "Application Email Notifications",
          "push": "Application Push Notifications"
        },
        "text":{
          "push":"Push Notifications",
          "pushInfo":"Receive browser push notifications"
        },
        "primaryAction": {
          "content": "Save Settings"
        }
      },
      "sound": {
        "title": "Sound Settings",
        "subtitle": "Choose a sound for notifications",
        "label":{
          "sound": "Play sound for new messages",
          "notificationSound":"Notification Sound"
        },
        "text":{
          "sound":"Sound Alerts",
          "soundInfo": "Play sound for new messages"
        },
        "primaryAction": {
          "content": "Save Settings"
        }
      },
      "reply": {
        "title": "Auto Reply Settings",
        "subtitle": "Send automatic reply when agent is offline",
        "subInfo": "Send automatic reply when agent is offline" ,
        "label":{
          "reply": "Auto Reply",
          "replyMessage":"Auto Reply Message",
          "replyDelay":"Auto Reply Delay (seconds)",
          "helpText":"Seconds after auto reply is sent"
        },
        "placeholder":"Enter auto reply message...",
        "text":{
          "reply":"Auto Reply",
          "replyInfo": "Send automatic reply when agent is offline",
          "replyMessage":"Auto Reply Message",
          "replyDelay":"Auto Reply Delay (seconds)"
        }
      },
      "working":{
        "title": "Working Hours",
        "subtitle": "Enable Working Hours",
        "subInfo": "Set agent online working hours" ,
        "label":{
          "online":"Enable working hours",
          "start":"Start Time",
          "end":"End Time",
          "repeat":"Repeat"
        },
        "text":{
          "start":"Start Time",
          "end":"End Time",
          "repeat":"Repeat"
        }
      },
      "chat":{
        "title": "Chat Settings",
        "subtitle": "Show typing indicator",
        "subInfo": "Show typing status to customers" ,
        "label":{
          "typingIndicator":"Show typing status to customers",
          "readReceipts":"Show message read status",
          "maxChatHistory":"Chat History Retention (days)",
          "helpText":"Chat history older than this will be archived"
        },
        "text":{
          "title":"Read Receipts",
          "readReceipts":"Show message read status",
        }
      },
      "status":{
        "title": "Status",
        "subtitle": "All settings are saved",
        "subInfo": "All settings are saved" ,
        "text":{
          "lastUpdated":"Last Updated",
          "version":"Version",
          "reset":"Reset to Default"
        }
      },
      "actions":{
        "title": "Actions",
        "subtitle": "Quick Actions",
        "subInfo": "Quick Actions" ,
        "text":{
          "reset":"Reset to Default",
          "export":"Export Settings",
          "import":"Import Settings"
        }
      },
      "help":{
        "title": "Help",
        "subtitle": "Help and Support",
        "subInfo": "Need help with settings? Contact our support team or visit our documentation." ,
        "text":{
          "documentation":"View Documentation",
          "support":"Contact Support"
        }
      }
    }
  },
  "zh-CN": {
    "components":{
      "empty":{
        "profile":{
          "title": "暂无画像",
          "subtitle": "选择一个客户查看画像",
        },
        "customer":{
          "title": "没有客户",
          "subtitle": "添加客户开始对话",
          "primaryAction": {
            "content": "添加客户"
          }
        },
        "message":{
          "title": "暂无消息",
          "subtitle": "您与当前客户暂无会话消息",
          "primaryAction": {
            "content": "开始对话"
          }
        }
      },
      "notification":{
        "ariaLabel":"关闭通知"
      },
      "modal":{
        "default":{
          "title": "提示",
          "confirmationText" : "您确定要执行此操作吗？",
          "successText" : "操作成功！",
          "errorText" : "操作失败，请重试。",
          "cancelButtonText" : "取消",
          "confirmButtonText" : "确定",
        },
        "ariaLabel":"关闭模态框"
      },
      "profile":{
        "score":{
          "valueScore": "价值评分",
          "loyaltyScore": "忠诚度评分",
          "engagementScore": "活跃度评分"
        },
        "customerDetail":{
          "title": "客户信息",
          "id": "客户 ID",
          "email": "邮箱",
          "phone": "电话",
          "since": "注册时间"
        },
        "tags":"客户标签",
        "status":{
          "online":"在线",
          "offline":"离线"
        },
        "statistics":{
          "order":{
            "title": "订单统计",
            "totalOrders": "总订单数",
            "completed": "已完成",
            "cancelled": "已取消",
            "refunded": "已退款",
            "processing": "处理中",
            "shipped": "已发货"
          },
          "spending":{
            "title": "消费统计",
            "totalSpent": "总消费",
            "averageOrderValue": "平均订单价值",
            "firstOrder": "首次订单",
            "lastOrder": "最近订单",
            "daysSinceLastOrder": "距上次订单天数",
            "avgDaysBetweenOrders": "平均订单间隔天数",
            "days": "天"
          },
          "preferences":{
            "title": "商品偏好",
            "items": "件"
          },
          "topProducts":{
            "title": "热门商品",
            "orders": "单"
          },
          "recentOrders":{
            "title": "最近订单",
            "items": "件"
          }
        },
        "actions":{
          "viewOrderHistory": "查看订单历史",
          "sendProductRecommendation": "发送商品推荐",
          "createTicket": "创建工单"
        }
      },
      "chat":{
        "inputPlaceholder": "输入消息...",
        "status": "状态",
        "title": "聊天",
        "searchPlaceholder": "搜索",
        "noResult": "未找到结果",
        "messageStatus":{
          "read": "已读",
          "unread": "未读"
        }
      },
      "product":{
        "recommendTitle": "推荐产品",
        "confirmText": "是否将该产品推荐给客户",
        "confirmButton": "推荐",
        "cancelButton": "不推荐",
        "cancelAction": "您已取消推荐产品操作"
      }
    },
    "setting": {
      "app": {
        "title": "应用设置",
        "subtitle": "管理应用偏好设置",
        "primaryAction": {
          "content": "保存设置"
        }
      },
      "interface": {
        "title": "界面设置",
        "subtitle": "暗色模式",
        "subInfo": "切换为深色/亮色主题" ,
        "label":"应用主题",
        "primaryAction": {
          "content": "保存设置"
        }
      },
      "notification":{
        "title": "通知设置",
        "subtitle": "新消息电子邮件提醒",
        "subInfo": "接收新消息的电子邮件提醒" ,
        "label":{
          "email": "邮箱通知",
          "push": "推送通知"
        },
        "text":{
          "push":"推送通知",
          "pushInfo":"接收浏览器推送通知"
        },
        "primaryAction": {
          "content": "保存设置"
        }
      },
      "sound":{
        "title": "声音设置",
        "subtitle": "选择通知声音",
        "label":{
          "sound": "新消息播放声音",
          "notificationSound":"通知声音"
        },
        "text":{
          "sound":"声音提醒",
          "soundInfo": "新消息播放声音"
        },
        "primaryAction":{
          "content": "保存设置"
        }

      },
      "reply":{
        "title": "自动回复设置",
        "subtitle": "当客服离线时自动回复",
        "subInfo": "当客服离线时自动回复" ,
        "label":{
          "reply": "自动回复",
          "replyMessage":"自动回复消息",
          "replyDelay":"自动回复延迟（秒）",
          "helpText":"秒数后自动回复"
        },
        "placeholder":"输入自动回复消息",
        "text":{
          "reply":"自动回复",
          "replyInfo": "当客服离线时自动回复",
          "replyMessage":"自动回复消息",
          "replyDelay":"自动回复延迟（秒）"
        }
      },
      "working":{
        "title": "工作时间",
        "subtitle": "启用工作时间",
        "subInfo": "设置客服在线工作时间" ,
        "label":{
          "online":"在线时长",
          "start":"开始时间",
          "end":"结束时间",
          "repeat":"重复"
        },
        "text":{
          "start":"开始时间",
          "end":"结束时间",
          "repeat":"重复"
        }
      },
      "chat":{
        "title": "聊天设置",
        "subtitle": "显示输入指示器",
        "subInfo": "向客户显示输入指示器" ,
        "label":{
          "typingIndicator":"显示输入指示器",
          "readReceipts":"显示消息读取状态",
          "maxChatHistory":"聊天历史保留（天）",
          "helpText":"早于此时间的聊天记录将被存档。"
        },
        "text":{
          "title":"读取状态",
          "readReceipts":"显示消息读取状态"
        }
      },
      "status":{
        "title": "状态",
        "subtitle": "所有设置已保存",
        "subInfo": "所有设置已保存" ,
        "text":{
          "lastUpdated":"最后更新",
          "version":"版本",
          "reset":"重置为默认"
        }
      },
      "actions":{
        "title": "快速操作",
        "text":{
          "reset":"重置为默认",
          "export":"导出设置",
          "import":"导入设置"
        }
      },
      "help":{
        "title": "帮助",
        "subtitle": "需要帮助吗？",
        "subInfo": "需要帮助吗？请联系我们的支持团队或查看我们的文档。" ,
        "text":{
          "documentation":"查看文档",
          "support":"联系支持"
        }
      }
    }
  }
}
