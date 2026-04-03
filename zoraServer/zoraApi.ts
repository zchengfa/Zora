import type {ZoraApiType} from "./api/context.ts";
import {registerAuthRoutes} from "./api/authRoutes.ts";
import {registerCoreRoutes} from "./api/coreRoutes.ts";
import {registerChatRoutes} from "./api/chatRoutes.ts";
import {registerSettingsRoutes} from "./api/settingsRoutes.ts";
import {registerOrdersRoutes} from "./api/ordersRoutes.ts";

export function zoraApi(ctx: ZoraApiType) {
  registerCoreRoutes(ctx);
  registerAuthRoutes(ctx);
  registerChatRoutes(ctx);
  registerSettingsRoutes(ctx);
  registerOrdersRoutes(ctx);
}
