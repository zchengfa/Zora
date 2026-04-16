import {generateCustomerProfile} from "../../plugins/customerProfile.ts";
import {handleApiError, handlePrismaError} from "../../plugins/handleZoraError.ts";
import {RATE_LIMITS} from "./shared.ts";
import type {ZoraApiType} from "./context.ts";

export function registerChatRoutes({app, prisma}: ZoraApiType) {
  app.get("/chatList", async (req, res) => {
    try {
      const {agentId} = req.query;

      if (!agentId || typeof agentId !== "string") {
        return res.status(400).json({error: "缺少agentId参数"});
      }

      const agent = await prisma.staffProfile.findUnique({
        where: {id: agentId},
      });

      if (!agent) {
        return res.status(404).json({error: "客服不存在"});
      }

      const chatListItems = await prisma.chatListItem.findMany({
        where: {
          agentId: agentId,
        },
        orderBy: {
          lastTimestamp: "desc",
        },
      });

      const chatList = await Promise.all(
        chatListItems.map(async (item) => {
          const messages = await prisma.message.findMany({
            where: {
              conversationId: item.conversationId,
            },
            orderBy: {
              timestamp: "desc",
            },
            take: 10,
          });

          const offlineMessages = await prisma.offlineMessage.findMany({
            where: {
              conversationId: item.conversationId,
              isDelivered: false,
            },
            select: {
              msgId: true,
            },
          });

          const offlineMsgIdSet = new Set(offlineMessages.map((msg) => msg.msgId));

          const formattedMessages = messages
            .filter((msg) => !offlineMsgIdSet.has(msg.msgId))
            .map((msg) => ({
              contentBody: msg.contentBody,
              contentType: msg.contentType,
              conversationId: msg.conversationId,
              msgId: msg.msgId,
              msgStatus: msg.msgStatus,
              recipientType: msg.recipientType,
              recipientId: msg.recipientId,
              senderId: msg.senderId,
              senderType: msg.senderType,
              timestamp: msg.timestamp.getTime(),
            }));

          const customerProfile = item.customerId ? await generateCustomerProfile(prisma, item.customerId) : null;

          return {
            id: item.customerId,
            firstName: item.customerFirstName,
            lastName: item.customerLastName,
            avatar: item.customerAvatar,
            isOnline: item.isOnline,
            lastMessage: item.lastMessage,
            lastTimestamp: item.lastTimestamp?.getTime() || 0,
            hadRead: item.hadRead,
            isActive: item.isActive,
            unreadMessageCount: item.unreadMessageCount,
            conversationId: item.conversationId,
            messages: formattedMessages.reverse(),
            customerProfile,
          };
        }),
      );

      res.json({chatList});
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({error: "服务器错误"});
    }
  });

  app.get("/customers/search", RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {keyword} = req.query;

      if (!keyword || typeof keyword !== "string") {
        return res.status(400).json({error: "缺少搜索关键词"});
      }

      const agent = await prisma.staffProfile.findFirst();
      if (!agent) {
        return res.status(404).json({error: "客服不存在"});
      }

      const shop = await prisma.shop.findFirst();
      if (!shop) {
        return res.status(404).json({error: "商店不存在"});
      }

      const customers = await prisma.customers.findMany({
        where: {
          shop_id: shop.id,
          OR: [
            {
              first_name: {
                contains: keyword,
                mode: "insensitive",
              },
            },
            {
              last_name: {
                contains: keyword,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: keyword,
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          image_url: true,
          phone: true,
        },
        take: 10,
      });

      const serializedCustomers = customers.map((customer) => ({
        ...customer,
        id: customer.id.toString(),
      }));

      res.json({
        success: true,
        customers: serializedCustomers,
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({error: "服务器错误"});
    }
  });

  app.post("/chatList/add", RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {agentId, customerId} = req.body;

      if (!agentId || !customerId) {
        return res.status(400).json({error: "缺少必要参数"});
      }

      const agent = await prisma.staffProfile.findUnique({
        where: {id: agentId},
      });

      if (!agent) {
        return res.status(404).json({error: "客服不存在"});
      }

      const customer = await prisma.customers.findUnique({
        where: {id: BigInt(customerId)},
      });

      if (!customer) {
        return res.status(404).json({error: "客户不存在"});
      }

      const existingChat = await prisma.chatListItem.findFirst({
        where: {
          agentId: agentId,
          customerId: customerId,
        },
      });

      if (existingChat) {
        await prisma.chatListItem.updateMany({
          where: {agentId},
          data: {isActive: false},
        });

        await prisma.chatListItem.update({
          where: {id: existingChat.id},
          data: {
            isActive: true,
            lastTimestamp: new Date(),
          },
        });

        const updatedChatList = await Promise.all(
          (await prisma.chatListItem.findMany({
            where: {agentId: agentId},
            orderBy: {lastTimestamp: "desc"},
          })).map(async (item) => {
            const customerProfile = item.customerId ? await generateCustomerProfile(prisma, item.customerId) : null;
            return {
              ...item,
              customerProfile,
            };
          })
        );

        return res.json({
          success: true,
          conversationId: existingChat.conversationId,
          chatList: updatedChatList,
          message: "对话已激活",
        });
      }

      const conversation = await prisma.conversation.create({
        data: {
          shop_id: customer.shop_id || "",
          customer: customerId.toString(),
          status: "ACTIVE",
        },
      });

      const chatListItem = await prisma.chatListItem.create({
        data: {
          conversationId: conversation.id,
          customerId: customerId.toString(),
          customerFirstName: customer.first_name || "",
          customerLastName: customer.last_name || "",
          customerAvatar: customer.image_url || "/assets/default_avatar.jpg",
          agentId: agentId,
          isActive: true,
          lastTimestamp: new Date(),
          shop: customer.shop_id || "",
        },
      });

      await prisma.chatListItem.updateMany({
        where: {
          agentId: agentId,
          id: {not: chatListItem.id},
        },
        data: {isActive: false},
      });

      const updatedChatList = await Promise.all(
        (await prisma.chatListItem.findMany({
          where: {agentId: agentId},
          orderBy: {lastTimestamp: "desc"},
        })).map(async (item) => {
          const customerProfile = item.customerId ? await generateCustomerProfile(prisma, item.customerId) : null;
          return {
            ...item,
            customerProfile,
          };
        })
      );

      res.json({
        success: true,
        conversationId: conversation.id,
        chatList: updatedChatList,
        message: "已添加到聊天列表",
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({error: "服务器错误"});
    }
  });
}
