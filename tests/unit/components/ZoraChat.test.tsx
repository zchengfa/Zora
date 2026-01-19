import { render, screen, fireEvent } from '@testing-library/react';
import ZoraChat from '../../../app/components/ZoraChat';

describe('ZoraChat Component', () => {
  const mockSendMessage = jest.fn();

  beforeEach(() => {
    mockSendMessage.mockClear();
  });

  it('should render chat input component', () => {
    render(<ZoraChat sendMessage={mockSendMessage} />);

    // 检查输入框是否存在
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toBeInTheDocument();
  });

  it('should send message on button click', () => {
    render(<ZoraChat sendMessage={mockSendMessage} />);

    const inputElement = screen.getByRole('textbox');
    const sendButton = screen.getByText('发送');

    // 输入消息
    fireEvent.change(inputElement, { target: { value: '测试消息' } });

    // 点击发送按钮
    fireEvent.click(sendButton);

    // 验证是否调用了sendMessage
    expect(mockSendMessage).toHaveBeenCalledWith('测试消息');
  });

  it('should send message on Enter key press', () => {
    render(<ZoraChat sendMessage={mockSendMessage} />);

    const inputElement = screen.getByRole('textbox');

    // 输入消息
    fireEvent.change(inputElement, { target: { value: '测试消息2' } });

    // 按Enter键
    fireEvent.keyDown(inputElement, { key: 'Enter', code: 'Enter' });

    // 验证是否调用了sendMessage
    expect(mockSendMessage).toHaveBeenCalledWith('测试消息2');
  });

  it('should not send empty message', () => {
    render(<ZoraChat sendMessage={mockSendMessage} />);

    const sendButton = screen.getByText('发送');

    // 尝试发送空消息
    fireEvent.click(sendButton);

    // 验证没有调用sendMessage
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('should clear input after sending message', () => {
    render(<ZoraChat sendMessage={mockSendMessage} />);

    const inputElement = screen.getByRole('textbox');
    const sendButton = screen.getByText('发送');

    // 输入并发送消息
    fireEvent.change(inputElement, { target: { value: '测试消息' } });
    fireEvent.click(sendButton);

    // 验证输入框已清空
    expect(inputElement).toHaveValue('');
  });
});
