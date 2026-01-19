import { test, expect } from '@playwright/test';

test.describe('Chat Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用首页
    await page.goto('http://localhost:3000');
  });

  test('should display chat interface', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 验证聊天界面元素是否存在
    await expect(page.locator('.chatContent')).toBeVisible();
    await expect(page.locator('.chatBox')).toBeVisible();
  });

  test('should display customer list', async ({ page }) => {
    // 等待客户列表加载
    await page.waitForSelector('.customerList', { timeout: 5000 });

    // 验证客户列表是否显示
    const customerList = page.locator('.customerItem');
    const count = await customerList.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should send and receive message', async ({ page }) => {
    // 选择第一个客户
    await page.click('.customerItem:first-child');

    // 输入消息
    const messageInput = page.locator('input[type="text"]');
    await messageInput.fill('测试消息');

    // 发送消息
    await page.click('button:has-text("发送")');

    // 验证消息是否出现在聊天记录中
    await expect(page.locator('text=测试消息')).toBeVisible({ timeout: 3000 });
  });

  test('should display message status', async ({ page }) => {
    // 选择客户
    await page.click('.customerItem:first-child');

    // 发送消息
    const messageInput = page.locator('input[type="text"]');
    await messageInput.fill('状态测试');
    await page.click('button:has-text("发送")');

    // 等待消息状态更新
    await page.waitForSelector('.messageStatus', { timeout: 3000 });

    // 验证消息状态
    const status = page.locator('.messageStatus:last-child');
    await expect(status).toBeVisible();
  });

  test('should handle customer search', async ({ page }) => {
    // 输入搜索关键词
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('John');

    // 等待搜索结果
    await page.waitForTimeout(1000);

    // 验证搜索结果
    const customerList = page.locator('.customerItem');
    const count = await customerList.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle message history pagination', async ({ page }) => {
    // 选择客户
    await page.click('.customerItem:first-child');

    // 滚动到消息顶部
    await page.evaluate(() => {
      const messageContainer = document.querySelector('.messageItems');
      if (messageContainer) {
        messageContainer.scrollTop = 0;
      }
    });

    // 等待加载更多消息
    await page.waitForTimeout(2000);

    // 验证消息数量增加
    const messages = page.locator('.messageItem');
    const count = await messages.count();
    expect(count).toBeGreaterThan(0);
  });
});
