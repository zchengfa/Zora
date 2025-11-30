import jwt from 'jsonwebtoken';

const secretOrPrivateKey = process.env.JWT_PRIVATE_KEY as string;

// 定义 Token 载荷接口
interface TokenPayload {
  session_id: string;
}

// 定义 verify 回调函数的类型
interface VerifyCallback {
  (error: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined): void;
}

export const createToken = (params: TokenPayload, expiresTime: string | number): string => {
  if (!secretOrPrivateKey) {
    throw new Error('JWT_PRIVATE_KEY environment variable is not set');
  }

  // 生成token,当过期时间number类型时以秒计算
  return jwt.sign(params, secretOrPrivateKey, { expiresIn: expiresTime });
}

export const verifyToken = (token: string, callback: VerifyCallback): void => {
  if (!secretOrPrivateKey) {
    callback(new Error('JWT_PRIVATE_KEY environment variable is not set'), undefined);
    return;
  }

  jwt.verify(token, secretOrPrivateKey, callback);
}

// 可选：添加一个返回 Promise 的版本，便于异步使用
export const verifyTokenAsync = (token: string): Promise<jwt.JwtPayload | string> => {
  return new Promise((resolve, reject) => {
    verifyToken(token, (error, decoded) => {
      if (error) {
        reject(error);
      } else {
        resolve(decoded as jwt.JwtPayload | string);
      }
    });
  });
}
