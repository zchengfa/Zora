import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  EmptyState,
  IndexTable,
  Badge,
  Text,
  Spinner,
  Modal,
  FormLayout,
  TextField,
  Select,
  InlineStack,
  Banner,
} from '@shopify/polaris';

interface Discount {
  id: string;
  title: string;
  classes: string;
  startTime: string;
  endTime: string;
  functionHandle: string;
  status: 'active' | 'expired' | 'draft';
}

const FUNCTION_OPTIONS = [
  { label: '默认自动折扣', value: 'default-automatic-discount' },
  { label: '会员专享折扣', value: 'member-exclusive-discount' },
  { label: '新品折扣', value: 'new-product-discount' },
];

const CLASSES_OPTIONS = [
  { label: '全场折扣', value: 'all' },
  { label: '指定商品', value: 'specific-products' },
  { label: '指定品类', value: 'specific-collections' },
];

export default function DiscountsPage() {
  const [loading, setLoading] = useState(true);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [banner, setBanner] = useState<{content: string; status?: 'success' | 'error'} | null>(null);

  const [title, setTitle] = useState('');
  const [classes, setClasses] = useState('all');
  const [functionHandle, setFunctionHandle] = useState('default-automatic-discount');
  const [startTime, setStartTime] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        setDiscounts([
          {
            id: '1',
            title: '春季新品折扣',
            classes: 'all',
            startTime: '2026-03-01',
            endTime: '2026-06-30',
            functionHandle: 'new-product-discount',
            status: 'active',
          },
          {
            id: '2',
            title: '会员专属优惠',
            classes: 'specific-collections',
            startTime: '2026-01-01',
            endTime: '2026-12-31',
            functionHandle: 'member-exclusive-discount',
            status: 'active',
          },
          {
            id: '3',
            title: '年终大促',
            classes: 'all',
            startTime: '2025-12-01',
            endTime: '2025-12-31',
            functionHandle: 'default-automatic-discount',
            status: 'expired',
          },
        ]);
      } catch (err) {
        showBanner('获取折扣失败', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDiscounts();
  }, []);

  const showBanner = (content: string, status: 'success' | 'error' = 'success') => {
    setBanner({ content, status });
    setTimeout(() => setBanner(null), 3000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getLabelByValue = (options: {label: string; value: string}[], value: string) => {
    return options.find(opt => opt.value === value)?.label || value;
  };

  const handleOpenModal = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setTitle(discount.title);
      setClasses(discount.classes);
      setFunctionHandle(discount.functionHandle);
      setStartTime(discount.startTime);
      setEndTime(discount.endTime);
    } else {
      setEditingDiscount(null);
      setTitle('');
      setClasses('all');
      setFunctionHandle('default-automatic-discount');
      setStartTime(new Date().toISOString().split('T')[0]);
      setEndTime('');
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingDiscount(null);
  };

  const validateForm = () => {
    if (!title.trim()) {
      showBanner('请输入折扣标题', 'error');
      return false;
    }
    if (!endTime) {
      showBanner('请选择过期时间', 'error');
      return false;
    }
    if (startTime > endTime) {
      showBanner('开始时间不能晚于过期时间', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingDiscount) {
      const updatedDiscount: Discount = {
        ...editingDiscount,
        title,
        classes,
        startTime,
        endTime,
        functionHandle,
        status: startTime <= new Date().toISOString().split('T')[0] && endTime >= new Date().toISOString().split('T')[0] ? 'active' : 'draft',
      };
      setDiscounts(discounts.map(d => d.id === editingDiscount.id ? updatedDiscount : d));
      showBanner('折扣更新成功');
    } else {
      const newDiscount: Discount = {
        id: Date.now().toString(),
        title,
        classes,
        startTime,
        endTime,
        functionHandle,
        status: 'active',
      };
      setDiscounts([newDiscount, ...discounts]);
      showBanner('折扣创建成功');
    }
    setModalOpen(false);
    setEditingDiscount(null);
  };

  const handleDelete = (id: string) => {
    setDiscounts(discounts.filter(d => d.id !== id));
    showBanner('折扣删除成功');
  };

  const filteredDiscounts = discounts.filter(d =>
    d.title.toLowerCase().includes(searchValue.toLowerCase()) ||
    d.classes.toLowerCase().includes(searchValue.toLowerCase())
  );

  const renderStatusBadge = (status: Discount['status']) => {
    switch (status) {
      case 'active': return <Badge tone="success">已启用</Badge>;
      case 'expired': return <Badge tone="critical">已过期</Badge>;
      case 'draft': return <Badge tone="info">草稿</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Page title="折扣管理">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <Spinner size="large" />
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <>
      {banner && (
        <Banner
          status={banner.status === 'error' ? 'critical' : 'success'}
          onDismiss={() => setBanner(null)}
        >
          {banner.content}
        </Banner>
      )}

      <Page
        title="折扣管理"
        primaryAction={
          <Button variant="primary" onClick={() => handleOpenModal()}>
            创建折扣
          </Button>
        }
      >
        <Layout>
          <Layout.Section>
            {filteredDiscounts.length === 0 ? (
              <Card sectioned>
                <EmptyState
                  heading={searchValue ? '未找到匹配的折扣' : '暂无折扣规则'}
                  action={{
                    content: searchValue ? '清除搜索' : '创建第一个折扣',
                    onAction: searchValue ? () => setSearchValue('') : () => handleOpenModal(),
                  }}
                >
                  <Text variant="bodyMd">
                    {searchValue
                      ? '尝试使用其他关键词搜索'
                      : '创建后自动生效，无需折扣码、无需设置金额门槛'
                    }
                  </Text>
                </EmptyState>
              </Card>
            ) : (
              <Card sectioned>
                <TextField
                  value={searchValue}
                  onChange={setSearchValue}
                  placeholder="搜索折扣标题或分类..."
                  autoComplete="off"
                  style={{ marginBottom: '1.5rem' }}
                />
                <IndexTable
                  resourceName={{ singular: '折扣', plural: '折扣' }}
                  itemCount={filteredDiscounts.length}
                  headings={[
                    { title: '标题', width: '20%' },
                    { title: '分类', width: '15%' },
                    { title: '函数句柄', width: '20%' },
                    { title: '时间范围', width: '25%' },
                    { title: '状态', width: '10%' },
                    { title: '操作', width: '10%' },
                  ]}
                  selectable={false}
                >
                  {filteredDiscounts.map((item) => (
                    <IndexTable.Row id={item.id} key={item.id}>
                      <IndexTable.Cell>
                        <Text fontWeight="semibold">{item.title}</Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone="info">{getLabelByValue(CLASSES_OPTIONS, item.classes)}</Badge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text variant="bodySm" tone="secondary">
                          {getLabelByValue(FUNCTION_OPTIONS, item.functionHandle)}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text variant="bodySm">
                          {formatDate(item.startTime)}
                          <Text tone="secondary"> ～ </Text>
                          {formatDate(item.endTime)}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>{renderStatusBadge(item.status)}</IndexTable.Cell>
                      <IndexTable.Cell>
                        <InlineStack gap="50">
                          <Button variant="plain" onClick={() => handleOpenModal(item)}>
                            编辑
                          </Button>
                          <Button variant="plain" destructive onClick={() => handleDelete(item.id)}>
                            删除
                          </Button>
                        </InlineStack>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              </Card>
            )}
          </Layout.Section>
        </Layout>
      </Page>

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingDiscount ? '编辑折扣规则' : '创建折扣规则'}
        primaryAction={{
          content: editingDiscount ? '确认更新' : '确认创建',
          onAction: handleSubmit
        }}
        secondaryActions={[{ content: '取消', onAction: handleCloseModal }]}
        size="large"
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="折扣标题"
              value={title}
              onChange={setTitle}
              placeholder="例如：春季限时折扣"
              autoComplete="off"
            />

            <Select
              label="折扣分类"
              options={CLASSES_OPTIONS}
              value={classes}
              onChange={setClasses}
            />

            <Select
              label="函数句柄"
              options={FUNCTION_OPTIONS}
              value={functionHandle}
              onChange={setFunctionHandle}
            />

            <InlineStack gap="200" blockAlign="center">
              <TextField
                label="开始时间"
                type="date"
                value={startTime}
                onChange={setStartTime}
              />
              <TextField
                label="过期时间"
                type="date"
                value={endTime}
                onChange={setEndTime}
              />
            </InlineStack>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </>
  );
}
