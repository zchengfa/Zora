import { render, screen, fireEvent } from '@testing-library/react';
import ZoraCustomerList from '../../../app/components/ZoraCustomerList';

describe('ZoraCustomerList Component', () => {
  const mockCustomerData = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      avatar: 'avatar1.jpg',
      lastMessage: 'Hello',
      conversationId: 'conv1',
      lastTimestamp: '2024-01-01T12:00:00Z'
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      avatar: 'avatar2.jpg',
      lastMessage: 'Hi there',
      conversationId: 'conv2',
      lastTimestamp: '2024-01-01T11:00:00Z'
    }
  ];

  const mockItemClick = jest.fn();

  beforeEach(() => {
    mockItemClick.mockClear();
  });

  it('should render customer list', () => {
    render(<ZoraCustomerList customerData={mockCustomerData} ItemClick={mockItemClick} />);

    // 验证客户列表项是否渲染
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should render empty state when no customers', () => {
    render(<ZoraCustomerList customerData={[]} ItemClick={mockItemClick} />);

    // 验证空状态提示
    expect(screen.getByText(/暂无客户/i)).toBeInTheDocument();
  });

  it('should handle item click', () => {
    render(<ZoraCustomerList customerData={mockCustomerData} ItemClick={mockItemClick} />);

    const firstCustomer = screen.getByText('John Doe');
    fireEvent.click(firstCustomer);

    // 验证是否调用了ItemClick回调
    expect(mockItemClick).toHaveBeenCalledWith('conv1');
  });

  it('should display last message preview', () => {
    render(<ZoraCustomerList customerData={mockCustomerData} ItemClick={mockItemClick} />);

    // 验证最后一条消息是否显示
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('should display customer avatars', () => {
    render(<ZoraCustomerList customerData={mockCustomerData} ItemClick={mockItemClick} />);

    // 验证头像图片是否存在
    const avatars = screen.getAllByRole('img');
    expect(avatars.length).toBe(2);
    expect(avatars[0]).toHaveAttribute('src', 'avatar1.jpg');
    expect(avatars[1]).toHaveAttribute('src', 'avatar2.jpg');
  });
});
