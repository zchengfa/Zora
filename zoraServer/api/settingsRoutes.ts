import {handleApiError, handlePrismaError} from "../../plugins/handleZoraError.ts";
import {RATE_LIMITS} from "./shared.ts";
import type {ZoraApiType} from "./context.ts";

export function registerSettingsRoutes({app, prisma}: ZoraApiType) {
  app.get("/agent/settings", RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {staffProfileId} = req.query;

      if (!staffProfileId || typeof staffProfileId !== "string") {
        return res.status(400).json({error: "缺少staffProfileId参数"});
      }

      const staff = await prisma.staffProfile.findUnique({
        where: {id: staffProfileId},
        include: {
          agentSettings: true,
        },
      });

      if (!staff) {
        return res.status(404).json({error: "客服不存在"});
      }

      if (!staff.agentSettings) {
        const defaultSettings = {
          theme: "light",
          emailNotifications: true,
          pushNotifications: true,
          soundEnabled: true,
          notificationSound: "default",
          autoReplyEnabled: true,
          autoReplyMessage: "",
          autoReplyDelay: 30,
          workHoursEnabled: true,
          workStartHour: "09:00",
          workEndHour: "18:00",
          workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          typingIndicator: true,
          readReceipts: true,
          maxChatHistory: 30,
        };

        return res.json({
          success: true,
          settings: defaultSettings,
        });
      }

      res.json({
        success: true,
        settings: staff.agentSettings,
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({error: "服务器错误"});
    }
  });

  app.post("/agent/settings/update", RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {
        staffProfileId,
        theme,
        emailNotifications,
        pushNotifications,
        soundEnabled,
        notificationSound,
        autoReplyEnabled,
        autoReplyMessage,
        autoReplyDelay,
        workHoursEnabled,
        workStartHour,
        workEndHour,
        workDays,
        typingIndicator,
        readReceipts,
        maxChatHistory,
      } = req.body;

      if (!staffProfileId) {
        return res.status(400).json({error: "缺少staffProfileId参数"});
      }

      const staff = await prisma.staffProfile.findUnique({
        where: {id: staffProfileId},
      });

      if (!staff) {
        return res.status(404).json({error: "客服不存在"});
      }

      const settings = await prisma.agentSettings.upsert({
        where: {staffProfileId},
        update: {
          theme,
          emailNotifications,
          pushNotifications,
          soundEnabled,
          notificationSound,
          autoReplyEnabled,
          autoReplyMessage,
          autoReplyDelay,
          workHoursEnabled,
          workStartHour,
          workEndHour,
          workDays,
          typingIndicator,
          readReceipts,
          maxChatHistory,
        },
        create: {
          staffProfileId,
          shop_id: staff.shop_id,
          theme: theme || "light",
          emailNotifications: emailNotifications ?? true,
          pushNotifications: pushNotifications ?? true,
          soundEnabled: soundEnabled ?? true,
          notificationSound: notificationSound || "default",
          autoReplyEnabled: autoReplyEnabled ?? true,
          autoReplyMessage: autoReplyMessage || "",
          autoReplyDelay: autoReplyDelay || 30,
          workHoursEnabled: workHoursEnabled ?? true,
          workStartHour: workStartHour || "09:00",
          workEndHour: workEndHour || "18:00",
          workDays: workDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
          typingIndicator: typingIndicator ?? true,
          readReceipts: readReceipts ?? true,
          maxChatHistory: maxChatHistory || 30,
        },
      });

      res.json({
        success: true,
        settings,
        message: "设置已保存",
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({error: "服务器错误"});
    }
  });
}
