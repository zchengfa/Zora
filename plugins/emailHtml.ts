export const generateEmailHtml = (code: string, verifyCodeExpired: number,title:string): string => {
  return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .code { font-size: 24px; font-weight: bold; color: #ff4400; letter-spacing: 2px; margin: 15px 0; }
              .expire { color: #999; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <p>Hello！</p>
              <p>Thank you for using Zora services. Your verification code is:</p>
              <div class="code">${code}</div>
              <p class="expire">Please use it within <strong>${verifyCodeExpired/60}</strong> minute， It is invalid after expiration!</p>
              <p>If it is not operated by you personally, please ignore this email.</p>
          </div>
      </body>
      </html>
    `;
};
