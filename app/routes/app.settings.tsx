import { Page, Layout, Card, Text, BlockStack, InlineStack, TextField, Button, Select, Divider, Badge, Banner } from "@shopify/polaris";
import '@shopify/polaris/build/esm/styles.css';
import { useState, useCallback } from 'react';
import { usePersistStorage } from '@hooks/usePersistStorage';
import { useAppTranslation } from '@hooks/useAppTranslation';

function AppSettings() {
  const LOCALSTORAGE_KEY = 'zora_application_theme';
  const {translation} = useAppTranslation()
  const [theme, setPersistTheme] = usePersistStorage(LOCALSTORAGE_KEY, 'light');
  const settingTranslation = translation.setting;

  const changeTheme = useCallback(() => {
    const newState = theme === 'dark' ? 'light' : 'dark';
    setPersistTheme(newState);
    const htmlEl = document.getElementsByTagName('html')[0];
    htmlEl.setAttribute('data-theme', newState);
  }, [theme, setPersistTheme]);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationSound, setNotificationSound] = useState('default');

  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyMessage, setAutoReplyMessage] = useState('');
  const [autoReplyDelay, setAutoReplyDelay] = useState('30');

  const [workHoursEnabled, setWorkHoursEnabled] = useState(true);
  const [workStartHour, setWorkStartHour] = useState('09:00');
  const [workEndHour, setWorkEndHour] = useState('18:00');
  const [workDays, setWorkDays] = useState(()=> ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].toString());

  const [typingIndicator, setTypingIndicator] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [maxChatHistory, setMaxChatHistory] = useState('30');

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
        content: settingTranslation.app.primaryAction.content,
        onAction: () => {},
      }}
    >
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
                  />
                </InlineStack>
                {soundEnabled && (
                  <>
                    <Divider />
                    <Select
                      label={settingTranslation.sound.label.notificationSound}
                      options={soundOptions}
                      value={notificationSound}
                      onChange={setNotificationSound}
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
                  />
                </InlineStack>
                {autoReplyEnabled && (
                  <>
                    <Divider />
                    <TextField
                      label={settingTranslation.reply.label.replyMessage}
                      value={autoReplyMessage}
                      onChange={setAutoReplyMessage}
                      multiline={3}
                      placeholder={settingTranslation.reply.placeholder}
                      autoComplete={'off'}/>
                    <Divider />
                    <TextField
                      label={settingTranslation.reply.label.replyDelay}
                      type="number"
                      value={autoReplyDelay}
                      onChange={setAutoReplyDelay}
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
                          onChange={setWorkStartHour}
                          autoComplete={'off'}/>
                      </div>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label={settingTranslation.working.label.end}
                          type="time"
                          value={workEndHour}
                          onChange={setWorkEndHour}
                          autoComplete={'off'}/>
                      </div>
                    </InlineStack>
                    <Divider />
                    <Select
                      label="Working Days"
                      options={dayOptions}
                      value={workDays.toString()}
                      onChange={setWorkDays}
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
                  />
                </InlineStack>
                <Divider />
                <TextField
                  label={settingTranslation.chat.label.maxChatHistory}
                  type="number"
                  value={maxChatHistory}
                  onChange={setMaxChatHistory}
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
                    <Badge>Just Now</Badge>
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
