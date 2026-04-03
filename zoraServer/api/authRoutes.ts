import type {Response} from "express";
import type Redis from "ioredis";
import type {PrismaClient} from "@prisma/client";
import bcrypt from "bcrypt";
import {v4 as uuidv4} from "uuid";
import {
  generateVerifyCode,
  hashCode,
  RegexEmail,
  validate,
  validateHashCode,
  validateRequestSender,
} from "../../plugins/validate.ts";
import {createToken, verifyTokenAsync} from "../../plugins/token.ts";
import type {IShopifyApiClient, IShopifyApiClientsManager} from "../../plugins/shopifyUtils.ts";
import {shopifyHandleResponseData} from "../../plugins/shopifyUtils.ts";
import type {GraphqlCustomerCreateMutationResponse, GraphqlMutationVariables} from "../../plugins/shopifyMutation.ts";
import {beginLogger} from "../../plugins/bullTaskQueue.ts";
import {handleApiError, handlePrismaError} from "../../plugins/handleZoraError.ts";
import {EXPIRED, getRedisStorageKey, RATE_LIMITS, REDIS_AUTH_ATTEMPT_KEY, REDIS_AUTH_CODE_APPEND, REDIS_ATTEMPT_KEY, SESSION_EXPIRED_DURATION} from "./shared.ts";
import type {ZoraApiType} from "./context.ts";

interface FormDataType {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  marketEmail: boolean;
  marketSMS: boolean;
  id?: bigint;
  shopDomain?: string;
  authPwd: boolean;
  authCode?: string;
  image_url?: string | null;
}

const loginAuth = async ({
  prisma,
  paramsObj,
  shopifyApiClientsManager,
  res,
}: {
  prisma: PrismaClient;
  paramsObj: FormDataType;
  shopifyApiClientsManager: IShopifyApiClientsManager;
  redis: Redis;
  res: Response;
}) => {
  const session_id = uuidv4();
  const expired = new Date(new Date().getTime() + SESSION_EXPIRED_DURATION);
  const sessionPrismaUpsert = await prisma.session.upsert({
    where: {
      email: paramsObj.email,
    },
    update: {
      sessionId: session_id,
      expires: expired,
    },
    create: {
      sessionId: session_id,
      userId: paramsObj.id,
      firstName: paramsObj.firstName,
      lastName: paramsObj.lastName,
      email: paramsObj.email,
      expires: expired,
    },
  });
  let agentInfo = undefined;
  const shopifyApiClient: IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(paramsObj.shopDomain as string);

  try {
    const {shop} = await shopifyApiClient.shop();
    agentInfo = await prisma.staffProfile.findFirst({
      where: {
        email: shop.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });
  } catch (e) {
    handlePrismaError(e);
  }

  const token = createToken({session_id}, "1d");
  const username = (sessionPrismaUpsert.firstName as string) + (sessionPrismaUpsert.lastName as string);
  res
    .status(200)
    .send({result: true, message: "login successfully", token, userInfo: {userId: paramsObj.id?.toString(), username, avatar: paramsObj.image_url, agentInfo}});
};

const pwdCompare = async (
  paramsObj: FormDataType,
  databasePwd: string,
  res: Response,
  redis: Redis,
  prisma: PrismaClient,
  shopifyApiClientsManager: IShopifyApiClientsManager,
) => {
  try {
    const result = await bcrypt.compare(paramsObj.password as string, databasePwd);
    if (result) {
      await loginAuth({paramsObj, redis, shopifyApiClientsManager, res, prisma});
    } else {
      res.status(200).send({result: false, message: "login failed with invalid credentials"});
    }
  } catch (e) {
    handlePrismaError(e);
    res.status(500).send({result: false, message: "Server Error"});
  }
};

const loginFunction = async ({
  redis,
  prisma,
  paramsObj,
  res,
  shopifyApiClientsManager,
}: {
  redis: Redis;
  prisma: PrismaClient;
  paramsObj: FormDataType;
  res: Response;
  shopifyApiClientsManager: IShopifyApiClientsManager;
}) => {
  try {
    if (!paramsObj.authCode) {
      if (!paramsObj.password) return res.status(400).send({result: false, message: "invalid credentials"});
      const redisPwdQuery = await redis.hget(`customer:${paramsObj.email}`, "password");
      if (redisPwdQuery) {
        await pwdCompare(paramsObj, redisPwdQuery, res, redis, prisma, shopifyApiClientsManager);
      } else {
        const prismaPwdQuery = await prisma.customers.findUnique({
          where: {
            email: paramsObj.email,
          },
        });
        if (!prismaPwdQuery) {
          return res.status(400).send({result: false, message: "invalid credentials"});
        }

        if (!prismaPwdQuery.password) {
          return res.status(400).send({result: false, message: "invalid credentials"});
        }
        await redis.hset(`customer:${paramsObj.email}`, {...prismaPwdQuery});
        await redis.expire(`customer:${paramsObj.email}`, 24 * 60 * 60);
        await pwdCompare(paramsObj, prismaPwdQuery.password, res, redis, prisma, shopifyApiClientsManager);
      }
    } else {
      try {
        const attempt = await redis.get(getRedisStorageKey(paramsObj.email, REDIS_AUTH_ATTEMPT_KEY)) || 0;
        const attemptKey = getRedisStorageKey(paramsObj.email, REDIS_AUTH_ATTEMPT_KEY);

        if (parseInt(String(attempt), 10) >= 5) {
          return res.status(429).send({
            result: false,
            message: "Too many attempts, please obtain the verification code again",
          });
        }

        const redisHashCode = await redis.get(paramsObj.email + REDIS_AUTH_CODE_APPEND);
        if (redisHashCode) {
          if (validateHashCode(paramsObj.authCode, redisHashCode)) {
            await redis.del(attemptKey);
            await redis.del(getRedisStorageKey(paramsObj.email));
            await loginAuth({paramsObj, redis, shopifyApiClientsManager, res, prisma});
          } else {
            await redis.incr(attemptKey);
            await redis.expire(attemptKey, EXPIRED);
            res.status(200).send({
              result: false,
              left_attempt: 5 - Number(attempt) - 1,
              message: `Auth code error, you still have ${5 - Number(attempt) - 1} chances to try`,
            });
          }
        } else {
          res.status(200).send({result: false, message: "code expired"});
        }
      } catch (_e) {
        res.status(500).send({server_error: true, message: "server error"});
      }
    }
  } catch (_e) {
    res.status(500).send({result: false, message: "Server Error"});
  }
};

export function registerAuthRoutes({app, redis, prisma, shopifyApiClientsManager}: ZoraApiType) {
  app.post("/authenticator", RATE_LIMITS.STRICT, async (req, res) => {
    const paramsObj = req.body as FormDataType;
    if (!paramsObj || !paramsObj?.email || (!paramsObj?.password?.length && !paramsObj?.authCode?.length)) {
      return res.status(400).send({result: false, message: "invalid request"});
    }

    const requestSenderResult = await validateRequestSender(req);
    if (!RegexEmail(paramsObj.email) || !requestSenderResult) {
      return res.status(400).send({result: false, message: "invalid request"});
    }

    paramsObj.shopDomain = req.headers?.origin?.split("//")[1];
    try {
      const redisQuery = await redis.hgetall(`customer:${paramsObj.email}`);
      if (Object.keys(redisQuery).length > 0) {
        paramsObj.id = redisQuery.id as unknown as bigint;
        paramsObj.firstName = redisQuery.first_name;
        paramsObj.lastName = redisQuery.last_name;
        paramsObj.image_url = redisQuery.image_url;
        await loginFunction({redis, prisma, paramsObj, res, shopifyApiClientsManager});
      } else {
        const prismaQuery = await prisma.customers.findUnique({
          where: {
            email: paramsObj.email,
          },
        });
        if (prismaQuery) {
          await redis.hset(`customer:${prismaQuery.id}`, {...prismaQuery});
          await redis.expire(`customer:${prismaQuery.id}`, 60 * 60 * 24);
          paramsObj.id = prismaQuery.id;
          paramsObj.firstName = prismaQuery.first_name as string;
          paramsObj.lastName = prismaQuery.last_name as string;
          paramsObj.image_url = prismaQuery.image_url;
          await loginFunction({redis, prisma, paramsObj, res, shopifyApiClientsManager});
        } else {
          if (!paramsObj.password?.length) return res.status(400).send({result: false, message: "invalid request: pwd is required"});

          const shopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(paramsObj.shopDomain as string);
          const {customerByIdentifier} = await shopifyApiClient.customerByIdentifier({
            emailAddress: paramsObj.email,
          });
          let deepCloneCustomer = [];
          const data: Array<GraphqlCustomerCreateMutationResponse["customerCreate"]["customer"] | {shop_id: string}> = [];

          if (!customerByIdentifier) {
            const customerCreateMutationVariable: GraphqlMutationVariables["input"] = {
              email: paramsObj.email,
              lastName: paramsObj.lastName,
              firstName: paramsObj.firstName,
              emailMarketingConsent: {
                marketingState: paramsObj.marketEmail ? "SUBSCRIBED" : "NOT_SUBSCRIBED",
                marketingOptInLevel: "SINGLE_OPT_IN",
              },
            };
            const {customerCreate} = await shopifyApiClient.customerCreate(customerCreateMutationVariable);
            if (customerCreate.customer) {
              deepCloneCustomer = JSON.parse(JSON.stringify(customerCreate.customer));
            }
          } else {
            deepCloneCustomer = JSON.parse(JSON.stringify(customerByIdentifier));
          }
          (deepCloneCustomer as any).shop_id = requestSenderResult;
          data.push(deepCloneCustomer as any);
          await shopifyHandleResponseData(data, "customers", prisma);
          const bcryptHashPwd = await bcrypt.hash(paramsObj.password, 10);
          const newCustomer = await prisma.customers.update({
            where: {
              shopify_customer_id: (deepCloneCustomer as any).id,
            },
            data: {
              password: bcryptHashPwd,
              image_url: process.env?.USER_DEFAULT_AVATAR || null,
            },
          });

          if (newCustomer) {
            await redis.hset(`customer:${newCustomer.id}`, {...newCustomer});
            await redis.expire(`customer:${newCustomer.id}`, 24 * 60 * 60);
            paramsObj.id = newCustomer.id;
            paramsObj.image_url = newCustomer.image_url;
            await loginFunction({redis, prisma, paramsObj, res, shopifyApiClientsManager});
          }
        }
      }
    } catch (e) {
      handleApiError(req, e);
      handlePrismaError(e);
      res.status(500).send({result: false, message: "Server Error"});
    }
  });

  app.post("/validateToken", RATE_LIMITS.NORMAL, async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).send({result: false, message: "Authentication token missing"});
    }
    if (!(await validateRequestSender(req))) {
      return res.status(400).send({result: false, message: "invalid request"});
    }
    try {
      await verifyTokenAsync(token);
      res.status(200).send({result: true, message: "logged in"});
    } catch (e) {
      handleApiError(req, e);
      return res.status(401).send({result: false, message: "Token expired or invalid"});
    }
  });

  app.post("/checkEmail", RATE_LIMITS.NORMAL, async (req, res) => {
    const {email} = req.body;
    if (!(await validateRequestSender(req))) {
      return res.status(400).send({result: false, message: "invalid request"});
    }
    try {
      const redisEmailQuery = await redis.hexists(`customer:${email}`, "shop_id");
      if (redisEmailQuery) {
        res.status(200).send({result: true, message: "Email already exists", isBelongShop: !!redisEmailQuery});
      } else {
        const prismaEmailQuery = await prisma.customers.findUnique({
          where: {
            email,
          },
        });
        if (prismaEmailQuery) {
          await redis.hset(`customer:${email}`, {...prismaEmailQuery});
          await redis.expire(`customer:${email}`, 3600);
          res.status(200).send({result: true, message: "Email already exists", isBelongShop: !!prismaEmailQuery.shop_id});
        } else {
          res.status(200).send({result: false, message: "Email not available"});
        }
      }
    } catch (e) {
      handleApiError(req, e);
      res.status(500).send({result: false, message: "Server Error"});
    }
  });

  app.post("/sendVerifyCodeToEmail", RATE_LIMITS.STRICT, async (req, res) => {
    const {email, isAuth} = req.body;
    if (!email || isAuth === undefined || !(await validateRequestSender(req))) {
      return res.status(400).send({result: false, message: "Invalid request"});
    }
    try {
      const code = generateVerifyCode();
      if (!isAuth) {
        await redis.multi().setex(getRedisStorageKey(email), EXPIRED, hashCode(code)).setex(getRedisStorageKey(email, REDIS_ATTEMPT_KEY), EXPIRED, 0).exec();
      } else {
        await redis
          .multi()
          .setex(getRedisStorageKey(email, REDIS_AUTH_CODE_APPEND), EXPIRED, hashCode(code))
          .setex(getRedisStorageKey(email, REDIS_AUTH_ATTEMPT_KEY), EXPIRED, 0)
          .exec();
      }

      validate({email, code, expired: EXPIRED})
        .then(async (loggerResult) => {
          await beginLogger({
            level: "info",
            message: `email:${email} send code success`,
            meta: {
              type: "nodemailer_send_code",
              result: loggerResult,
            },
          });
        })
        .catch(async (e) => {
          await beginLogger({
            level: "error",
            message: `email:${email} send code failed`,
            meta: {
              type: "nodemailer_send_code",
              error: e,
            },
          });
        });

      res.status(200).send({success: true, code_expired: EXPIRED, message: "code send successfully"});
    } catch (e) {
      handleApiError(req, e);
      res.status(500).send({server_error: true, message: "server error"});
    }
  });

  app.post("/verifyCode", RATE_LIMITS.LOOSE, async (req, res) => {
    const {code, email} = req.body;
    if (!(await validateRequestSender(req))) {
      return res.status(400).send({result: false, message: "invalid request"});
    }
    try {
      const attempt = await redis.get(getRedisStorageKey(email, REDIS_ATTEMPT_KEY)) || 0;
      const attemptKey = getRedisStorageKey(email, REDIS_ATTEMPT_KEY);

      if (!code || !email) {
        return res.status(400).send({
          result: false,
          left_attempt: 5 - Number(attempt),
          message: "Incomplete parameters",
        });
      }

      if (parseInt(String(attempt), 10) >= 5) {
        return res.status(429).send({
          result: false,
          message: "Too many attempts, please obtain the verification code again",
        });
      }

      const redisHashCode = await redis.get(email + "_verify_code");
      if (redisHashCode) {
        if (validateHashCode(code, redisHashCode)) {
          await redis.del(attemptKey);
          await redis.del(getRedisStorageKey(email));
          res.status(200).send({result: true, message: "validate success"});
        } else {
          await redis.incr(attemptKey);
          await redis.expire(attemptKey, EXPIRED);
          res
            .status(200)
            .send({result: false, left_attempt: 5 - Number(attempt) - 1, message: `Verification code error, you still have ${5 - Number(attempt) - 1} chances to try`});
        }
      } else {
        res.status(200).send({result: false, message: "code expired"});
      }
    } catch (e) {
      handleApiError(req, e);
      res.status(500).send({server_error: true, message: "server error"});
    }
  });
}
