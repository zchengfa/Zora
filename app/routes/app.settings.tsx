import { Page, Layout, Card, Text, BlockStack, InlineStack, TextField, Button, Select, Divider, Badge, Banner } from "@shopify/polaris";
import '@shopify/polaris/build/esm/styles.css';
import { useState, useCallback, useEffect } from 'react';
import { usePersistStorage } from '@hooks/usePersistStorage';
import { useAppTranslation } from '@hooks/useAppTranslation';
import { getAgentSettings, updateAgentSettings } from '@/network/request.ts';
import { useMessageStore } from '@/zustand/zustand';
import { useAgentOnline } from '@/hooks/useAgentOnline.ts';
import { timeFormatting } from '@/Utils/Utils.ts';

function AppSettings() {
  const {translation} = useAppTranslation()
  const settingTranslation = translation.setting;
  const messageStore = useMessageStore();
  const { settings, initSettings, updateSettings } = messageStore;
  // 客服上线/下线管理
  useAgentOnline();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 从settings中获取状态
  const {
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
    maxChatHistory
  } = settings;

  const changeTheme = useCallback(() => {
    const newState = theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: newState });
  }, [theme, updateSettings]);

  const handleEmailNotificationsChange = useCallback((event: any) => {
    updateSettings({ emailNotifications: event.target.checked });
  }, [updateSettings]);

  const handlePushNotificationsChange = useCallback((event: any) => {
    updateSettings({ pushNotifications: event.target.checked });
  }, [updateSettings]);

  const handleSoundEnabledChange = useCallback((event: any) => {
    updateSettings({ soundEnabled: event.target.checked });
  }, [updateSettings]);

  const handleAutoReplyEnabledChange = useCallback((event: any) => {
    updateSettings({ autoReplyEnabled: event.target.checked });
  }, [updateSettings]);

  const handleWorkHoursEnabledChange = useCallback((event: any) => {
    updateSettings({ workHoursEnabled: event.target.checked });
  }, [updateSettings]);

  const handleTypingIndicatorChange = useCallback((event: any) => {
    updateSettings({ typingIndicator: event.target.checked });
  }, [updateSettings]);

  const handleReadReceiptsChange = useCallback((event: any) => {
    updateSettings({ readReceipts: event.target.checked });
  }, [updateSettings]);

  // 加载设置数据
  useEffect(() => {
    const loadSettings = async () => {
      if (messageStore.customerStaff?.id) {
        try {
          const response = await getAgentSettings(messageStore.customerStaff.id);
          if (response?.data?.settings) {
            const settings = response.data.settings;
            // 初始化设置状态
            initSettings({
              theme: settings.theme ?? 'light',
              emailNotifications: settings.emailNotifications ?? true,
              pushNotifications: settings.pushNotifications ?? true,
              soundEnabled: settings.soundEnabled ?? true,
              notificationSound: settings.notificationSound ?? 'default',
              autoReplyEnabled: settings.autoReplyEnabled ?? true,
              autoReplyMessage: settings.autoReplyMessage ?? '',
              autoReplyDelay: settings.autoReplyDelay ?? 30,
              workHoursEnabled: settings.workHoursEnabled ?? true,
              workStartHour: settings.workStartHour ?? '09:00',
              workEndHour: settings.workEndHour ?? '18:00',
              workDays: settings.workDays ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
              typingIndicator: settings.typingIndicator ?? true,
              readReceipts: settings.readReceipts ?? true,
              maxChatHistory: settings.maxChatHistory ?? 30,
              updatedAt: settings.updatedAt
            });
            // 设置更新时间
            if (settings.updatedAt) {
              setLastUpdated(settings.updatedAt);
            }
          }
        } catch (error) {
          console.error('加载设置失败:', error);
        }
      }
    };

    loadSettings().then();
  }, [messageStore.customerStaff?.id, initSettings]);

  // 保存设置数据
  const handleSaveSettings = useCallback(async () => {
    if (!messageStore.customerStaff?.id) {
      console.error('未找到客服信息');
      return;
    }

    setIsSaving(true);
    try {
      const settingsData = {
        staffProfileId: messageStore.customerStaff.id,
        ...settings
      };

      const response = await updateAgentSettings(settingsData);
      setShowSaveSuccess(true);
      // 更新最后更新时间
      if (response?.data?.updatedAt) {
        setLastUpdated(response.data.updatedAt);
        // 更新settings中的updatedAt
        updateSettings({ updatedAt: response.data.updatedAt });
      }
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
    } finally {
      setIsSaving(false);
    }
  }, [messageStore.customerStaff?.id, settings, updateSettings]);

  const soundOptions = [
    { label: 'Default sound', value: 'default' },
    { label: 'Soft sound', value: 'soft' },
    { label: 'Crisp sound', value: 'crisp' },
    { label: 'No sound', value: 'none' },
  ];

  const dayOptions = [
    { label: 'Monday', value: 'Mon' },
    { label: 'Tuesday', value: 'Tue' },
    { label: 'Wednesday', value: 'Wed' },
    { label: 'Thursday', value: 'Thu' },
    { label: 'Friday', value: 'Fri' },
    { label: 'Saturday', value: 'Sat' },
    { label: 'Sunday', value: 'Sun' },
  ];

  return (
    <Page
      title={settingTranslation.app.title}
      subtitle={settingTranslation.app.subtitle}
      primaryAction={{
        content: isSaving ? 'Saving...' : settingTranslation.app.primaryAction.content,
        onAction: handleSaveSettings,
        loading: isSaving,
        disabled: isSaving,
      }}
    >
      {showSaveSuccess && (
        <Banner status="success" onDismiss={() => setShowSaveSuccess(false)}>
          Settings saved successfully!
        </Banner>
      )}
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">{settingTranslation.interface.title}</Text>
                <Divider />
                <InlineStack align="space-between">
                  <div>
                    <Text as="p" variant="bodyMd">{settingTranslation.interface.subtitle}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{settingTranslation.interface.subInfo}</Text>
                  </div>
                  <s-switch
                    label={settingTranslation.interface.label}
                    checked={theme === 'dark'}
                    onChange={changeTheme}
                  />
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">{settingTranslation.notification.title}</Text>
                <Divider />
                <InlineStack align="space-between">
                  <div>
                    <Text as="p" variant="bodyMd">{settingTranslation.notification.subtitle}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{settingTranslation.notification.subInfo}</Text>
                  </div>
                  <s-switch
                    label={settingTranslation.notification.label.email}
                    checked={emailNotifications}
                    onChange={handleEmailNotificationsChange}
                  />
                </InlineStack>
                <Divider />
                <InlineStack align="space-between">
                  <div>
                    <Text as="p" variant="bodyMd">{settingTranslation.notification.text.push}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{settingTranslation.notification.text.pushInfo}</Text>
                  </div>
                  <s-switch
                    label={settingTranslation.notification.label.push}
                    checked={pushNotifications}
                    onChange={handlePushNotificationsChange}
                  />
                </InlineStack>
                <Divider />
                <InlineStack align="space-between">
                  <div>
                    <Text as="p" variant="bodyMd">{settingTranslation.sound.text.sound}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{settingTranslation.sound.text.soundInfo}</Text>
                  </div>
                  <s-switch
                    label={settingTranslation.sound.label.sound}
                    checked={soundEnabled}
                    onChange={handleSoundEnabledChange}
                  />
                </InlineStack>
                {soundEnabled && (
                  <>
                    <Divider />
                    <Select
                      label={settingTranslation.sound.label.notificationSound}
                      options={soundOptions}
                      value={notificationSound}
                      onChange={(value) => updateSettings({ notificationSound: value })}
                    />
                  </>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">{settingTranslation.reply.title}</Text>
                <Divider />
                <InlineStack align="space-between">
                  <div>
                    <Text as="p" variant="bodyMd">{settingTranslation.reply.subtitle}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{settingTranslation.reply.subInfo}</Text>
                  </div>
                  <s-switch
                    label={settingTranslation.reply.label.reply}
                    checked={autoReplyEnabled}
                    onChange={handleAutoReplyEnabledChange}
                  />
                </InlineStack>
                {autoReplyEnabled && (
                  <>
                    <Divider />
                    <TextField
                      label={settingTranslation.reply.label.replyMessage}
                      value={autoReplyMessage}
                      onChange={(value) => updateSettings({ autoReplyMessage: value })}
                      multiline={3}
                      placeholder={settingTranslation.reply.placeholder}
                      autoComplete={'off'}/>
                    <Divider />
                    <TextField
                      label={settingTranslation.reply.label.replyDelay}
                      type="number"
                      value={autoReplyDelay}
                      onChange={(value) => updateSettings({ autoReplyDelay: parseInt(value, 10) })}
                      helpText={settingTranslation.reply.label.helpText}
                      autoComplete={'on'}/>
                  </>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">{settingTranslation.working.title}</Text>
                <Divider />
                <InlineStack align="space-between">
                  <div>
                    <Text as="p" variant="bodyMd">{settingTranslation.working.subtitle}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{settingTranslation.working.subInfo}</Text>
                  </div>
                  <s-switch
                    label={settingTranslation.working.label.online}
                    checked={workHoursEnabled}
                    onChange={handleWorkHoursEnabledChange}
                  />
                </InlineStack>
                {workHoursEnabled && (
                  <>
                    <Divider />
                    <InlineStack gap="500">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label={settingTranslation.working.label.start}
                          type="time"
                          value={workStartHour}
                          onChange={(value) => updateSettings({ workStartHour: value })}
                          autoComplete={'off'}/>
                      </div>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label={settingTranslation.working.label.end}
                          type="time"
                          value={workEndHour}
                          onChange={(value) => updateSettings({ workEndHour: value })}
                          autoComplete={'off'}/>
                      </div>
                    </InlineStack>
                    <Divider />
                    <Select
                      label="Working Days"
                      options={dayOptions}
                      value={workDays.toString()}
                      onChange={(value) => updateSettings({ workDays: value.split(',').map((day: string) => day.trim()) })}
                    />
                  </>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">{settingTranslation.chat.title}</Text>
                <Divider />
                <InlineStack align="space-between">
                  <div>
                    <Text as="p" variant="bodyMd">{settingTranslation.chat.subtitle}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{settingTranslation.chat.subInfo}</Text>
                  </div>
                  <s-switch
                    label={settingTranslation.chat.label.typingIndicator}
                    checked={typingIndicator}
                    onChange={handleTypingIndicatorChange}
                  />
                </InlineStack>
                <Divider />
                <InlineStack align="space-between">
                  <div>
                    <Text as="p" variant="bodyMd">{settingTranslation.chat.text.title}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{settingTranslation.chat.text.readReceipts}</Text>
                  </div>
                  <s-switch
                    label={settingTranslation.chat.label.readReceipts}
                    checked={readReceipts}
                    onChange={handleReadReceiptsChange}
                  />
                </InlineStack>
                <Divider />
                <TextField
                  label={settingTranslation.chat.label.maxChatHistory}
                  type="number"
                  value={maxChatHistory}
                  onChange={(value) => updateSettings({ maxChatHistory: parseInt(value, 10) })}
                  helpText={settingTranslation.chat.label.helpText}
                  autoComplete={'off'}
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">{settingTranslation.status.title}</Text>
                <Banner>
                  <p>{settingTranslation.status.subInfo}</p>
                </Banner>
                <Divider />
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="bodySm" tone="subdued" as={'span'}>{settingTranslation.status.text.lastUpdated}</Text>
                    <Badge>{lastUpdated ? timeFormatting('YYYY/MM/DD hh:mm:ss', lastUpdated) : 'Never'}</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text variant="bodySm" as={'span'} tone="subdued">{settingTranslation.status.text.version}</Text>
                    <Badge>v1.0.0</Badge>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">{settingTranslation.actions.title}</Text>
                <Button fullWidth onClick={() => {}}>
                  {settingTranslation.actions.text.reset}
                </Button>
                <Button fullWidth onClick={() => {}}>
                  {settingTranslation.actions.text.export}
                </Button>
                <Button fullWidth onClick={() => {}}>
                  {settingTranslation.actions.text.import}
                </Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">{settingTranslation.help.title}</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {settingTranslation.help.subInfo}
                </Text>
                <Button fullWidth onClick={() => {}}>
                  {settingTranslation.help.text.documentation}
                </Button>
                <Button fullWidth onClick={() => {}}>
                  {settingTranslation.help.text.support}
                </Button>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}

export default AppSettings
