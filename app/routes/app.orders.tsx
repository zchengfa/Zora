import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { authenticate } from "@/shopify.server";
import { Page, Layout, Card, Text, BlockStack, InlineStack, Button, TextField, Select, Badge, DataTable, LegacyCard, EmptyState, Divider, Modal, ChoiceList, Pagination } from "@shopify/polaris";
import '@shopify/polaris/build/esm/styles.css';
import { useState, useCallback, useMemo, useEffect,useRef } from 'react';
import { useAppTranslation } from '@hooks/useAppTranslation';
import { Post } from "@/network/network.ts";
import {getOrders, getTrackingInfo, getCarriers, getParcelTemplates} from "@/network/request.ts";
import {SHOP_INFO_QUERY_GQL} from "@Utils/graphql.ts";
import { useZoraUniversalModal } from "@/contexts/ZoraModalProvider.tsx";

interface Order {
  id: string;
  orderNumber: string;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    displayName: string;
  };
  loading?: boolean;
  fulfillments: Array<{
    id: string;
    status: string;
    trackingInfo: {
      company: string;
      number: string;
      url: string;
    };
    createdAt: string;
  }>;
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    variant: {
      id: string;
      title: string;
      price: string;
      image: {
        url: string;
      };
    };
  }>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {admin} = await authenticate.admin(request);
  try {
    const shopOwnerName = await admin.graphql(SHOP_INFO_QUERY_GQL)
    const {data} = await shopOwnerName.json()
    const response = await getOrders(data.shop.myshopifyDomain);
    return {
      orders: response?.data.data || [],
      shopDomain: data.shop.myshopifyDomain
    };
  } catch (error) {
    return {
      orders: [],
      shopDomain: ''
    };
  }
};

function OrdersPage() {
  const { orders, shopDomain } = useLoaderData<typeof loader>();
  const { translation } = useAppTranslation();
  const t = translation.orders;
  const { showModal } = useZoraUniversalModal();
  const [searchValue, setSearchValue] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedTracking, setSelectedTracking] = useState<any>(null);
  const [trackingInfo, setTrackingInfo] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [carriers, setCarriers] = useState<Array<{label: string, value: string, enabled: boolean}>>([]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [warehouseAddress, setWarehouseAddress] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [parcelTemplates, setParcelTemplates] = useState<any[]>([]);
  const [parcelTemplatesLoading, setParcelTemplatesLoading] = useState(false);
  const [selectedParcelTemplate, setSelectedParcelTemplate] = useState<any>(null);
  const [parcelTemplatesCache, setParcelTemplatesCache] = useState<Record<string, any[]>>({});

  // 使用 ref 来存储 selectedParcelTemplate 的最新值
  const selectedParcelTemplateRef = useRef(selectedParcelTemplate);

  // 当 selectedParcelTemplate 变化时，更新 ref
  useEffect(() => {
    selectedParcelTemplateRef.current = selectedParcelTemplate;
  }, [selectedParcelTemplate]);

  // 初始化时设置订单数据
  useEffect(() => {
    setOrdersData(orders);
  }, [orders]);

  // 当搜索或筛选条件改变时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, filterStatus]);

  // 计算总页数
  const totalPages = useMemo(() => {
    let filtered = ordersData;
    if (filterStatus !== 'all') {
      filtered = filtered.filter((order: Order) => {
        if (filterStatus === 'fulfilled') return order.fulfillmentStatus === 'FULFILLED';
        if (filterStatus === 'unfulfilled') return order.fulfillmentStatus === 'UNFULFILLED';
        if (filterStatus === 'processing') return order.fulfillmentStatus === 'IN_PROGRESS';
        return true;
      });
    }

    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter((order: Order) =>
        order.orderNumber.toString().includes(searchLower) ||
        order.customer?.displayName?.toLowerCase().includes(searchLower) ||
        order.customer?.email?.toLowerCase().includes(searchLower)
      );
    }

    return Math.ceil(filtered.length / itemsPerPage);
  }, [ordersData, searchValue, filterStatus, itemsPerPage]);

  // 刷新订单的函数
  const handleRefreshOrders = useCallback(async () => {
    if (!shopDomain) {
      return;
    }

    setRefreshing(true);
    try {
      // 直接调用获取订单API
      const response = await getOrders(shopDomain);
      const newOrders = response?.data?.data || [];
      // 更新订单数据
      setOrdersData(newOrders);
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  }, [shopDomain]);

  const filteredOrders = useMemo(() => {
    let filtered = ordersData;
    if (filterStatus !== 'all') {
      filtered = filtered.filter((order: Order) => {
        if (filterStatus === 'fulfilled') return order.fulfillmentStatus === 'FULFILLED';
        if (filterStatus === 'unfulfilled') return order.fulfillmentStatus === 'UNFULFILLED';
        if (filterStatus === 'processing') return order.fulfillmentStatus === 'IN_PROGRESS';
        return true;
      });
    }

    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter((order: Order) =>
        order.orderNumber.toString().includes(searchLower) ||
        order.customer?.displayName?.toLowerCase().includes(searchLower) ||
        order.customer?.email?.toLowerCase().includes(searchLower)
      );
    }

    // 分页逻辑
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [ordersData, searchValue, filterStatus, currentPage, itemsPerPage]);

  const handleFulfillOrder = useCallback(async () => {
    if (!selectedOrder) return;
    setLoading(true);

    try {
      await Post({
        url: '/orders/fulfill',
        data: {
          orderId: selectedOrder.id,
          carrier,
          trackingNumber,
          notifyCustomer,
        },
      });
      setShowFulfillModal(false);
      setCarrier('');
      setTrackingNumber('');
      window.location.reload();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [selectedOrder, carrier, trackingNumber, notifyCustomer, selectedParcelTemplate, selectedWarehouse]);

  const handleTrackPackage = useCallback(async (trackingNumber: string, carrier: string) => {
    setTrackingLoading(true);
    try {
      const response = await getTrackingInfo(trackingNumber, carrier);
      setTrackingInfo(response?.data?.data || null);
      setShowTrackingModal(true);
    } catch (error) {
    } finally {
      setTrackingLoading(false);
    }
  }, []);

  const handleFulfillOrderClick = useCallback(async (orderId: string) => {
    // 设置对应订单的加载状态
    setOrdersData(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, loading: true } : order
      )
    );

    // 重置包裹模板选择
    setSelectedParcelTemplate(null);
    setParcelTemplates([]);

    try {
      // 使用函数式更新来获取最新的 carriers 值
      setCarriers(prevCarriers => {
        // 如果承运商列表不为空，直接显示模态框
        if (prevCarriers.length > 0) {
          setShowCarrierModal(true);
          // 重置对应订单的加载状态
          setOrdersData(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId ? { ...order, loading: false } : order
            )
          );
          return prevCarriers;
        }

        // 如果为空，获取承运商列表和仓库地址
        getCarriers(shopDomain).then(response => {
          const responseData = response?.data?.data;
          if (responseData) {
            const newCarriers = responseData.carriers || [];
            setCarriers(newCarriers);
            // 保存仓库地址数组
            if (responseData.warehouseAddress && Array.isArray(responseData.warehouseAddress)) {
              setWarehouseAddress(responseData.warehouseAddress);
              // 默认选中第一个仓库
              setSelectedWarehouse(responseData.warehouseAddress[0]);
            }
          }
          setShowCarrierModal(true);
          // 重置对应订单的加载状态
          setOrdersData(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId ? { ...order, loading: false } : order
            )
          );
        }).catch(error => {
          // 重置对应订单的加载状态
          setOrdersData(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId ? { ...order, loading: false } : order
            )
          );
        });

        return prevCarriers;
      });
    } catch (error) {
      // 重置对应订单的加载状态
      setOrdersData(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, loading: false } : order
        )
      );
    }
  }, [shopDomain]);

  const handleCarrierSelect = useCallback(async (selected: string[]) => {
    if (selected.length === 0) return;
    const selectedValue = selected[0];
    const selectedCarrierData = carriers.find(c => c.value === selectedValue);

    if (!selectedCarrierData?.enabled) {
      return;
    }

    // 只更新选中的承运商，不关闭弹窗
    setCarrier(selectedValue);

    // 检查缓存中是否已有该承运商的包裹模板数据
    const cachedTemplates = parcelTemplatesCache[selectedValue];
    if (cachedTemplates && cachedTemplates.length > 0) {
      // 使用缓存数据
      setParcelTemplates(cachedTemplates);
      setSelectedParcelTemplate(cachedTemplates[0]);
      return;
    }

    // 获取该承运商的包裹模板数据
    setParcelTemplatesLoading(true);
    try {
      const response = await getParcelTemplates(selectedValue);
      const templates = response?.data?.data?.results || [];
      setParcelTemplates(templates);

      // 更新缓存
      setParcelTemplatesCache(prev => ({
        ...prev,
        [selectedValue]: templates
      }));

      // 如果有默认模板，自动选中第一个
      if (templates.length > 0) {
        setSelectedParcelTemplate(templates[0]);
      }
    } catch (error) {
      setParcelTemplates([]);
    } finally {
      setParcelTemplatesLoading(false);
    }
  }, [carriers, shopDomain]);

  const handleConfirmFulfill = useCallback(async () => {
    if (!selectedOrder || !carrier) {
      return;
    }
    setLoading(true);

    const fulfillData = {
      orderId: selectedOrder.id,
      carrier,
      warehouseAddress: selectedWarehouse,
      notifyCustomer,
      parcelTemplateToken: selectedParcelTemplateRef.current?.token || null,
    };

    try {
      const response = await Post({
        url: `/orders/fulfill?shop=${shopDomain}`,
        data: fulfillData,
      });
      // 检查响应数据
      if (response.data) {
        const { message, data } = response.data;

        // 如果没有可用的运费
        if (data && data.noRatesAvailable) {
          showModal({
            errorText: message,
            type: 'error',
          });
          setLoading(false);
          return;
        }

        // 如果承运商不支持该地区
        if (data && !data.noRatesAvailable && data.availableCarriers && data.availableCarriers.length > 0) {
          showModal({
            errorText: message,
            type: 'error',
          });
          setLoading(false);
          return;
        }
      }

      // 发货成功
      setShowCarrierModal(false);
      setCarrier('');
      setSelectedWarehouse(null);
      window.location.reload();
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }, [selectedOrder, carrier, selectedWarehouse, notifyCustomer, shopDomain]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { status: string; progress: 'complete' | 'partial' | 'incomplete' }> = {
      PAID: { status: 'Paid', progress: 'complete' },
      PENDING: { status: 'Pending', progress: 'incomplete' },
      PARTIALLY_PAID: { status: 'Partially Paid', progress: 'partial' },
      VOIDED: { status: 'Voided', progress: 'incomplete' },
      FULFILLED: { status: 'Fulfilled', progress: 'complete' },
      UNFULFILLED: { status: 'Unfulfilled', progress: 'incomplete' },
      PARTIALLY_FULFILLED: { status: 'Partially Fulfilled', progress: 'partial' },
      IN_PROGRESS: { status: 'In Progress', progress: 'partial' },
      RESTOCKED: { status: 'Restocked', progress: 'incomplete' },
    };

    const badgeConfig = statusMap[status] || { status: status, progress: 'incomplete' as const };
    return <Badge progress={badgeConfig.progress}>{badgeConfig.status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  const rows = useMemo(() => {
    return filteredOrders.map((order: Order) => [
      order.orderNumber.toString(),
      order.customer?.displayName || 'N/A',
      formatDate(order.processedAt),
      formatPrice(order.totalPriceSet.shopMoney.amount, selectedOrder?.totalPriceSet.shopMoney.currencyCode || 'USD'),
      getStatusBadge(order.fulfillmentStatus),
      <InlineStack gap="200">
        <Button
          variant="plain"
          onClick={() => setSelectedOrder(order)}
        >
          {t.order.viewDetails}
        </Button>
        {order.fulfillmentStatus === 'UNFULFILLED' && (
          <Button
            variant="primary"
            size="slim"
            loading={order.loading || false}
            onClick={() => {
              setSelectedOrder(order);
              handleFulfillOrderClick(order.id);
            }}
          >
            {t.order.fulfill}
          </Button>
        )}
      </InlineStack>,
    ]);
  }, [filteredOrders, t]);

  if (ordersData.length === 0) {
    return (
      <Page
        title={t.title}
        subtitle={t.subtitle}
      >
        <EmptyState
          heading={t.empty.title}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>{t.empty.description}</p>
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page
      title={t.title}
      subtitle={t.subtitle}
      primaryAction={{
        content: t.refresh,
        onAction: handleRefreshOrders,
        loading: refreshing,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" align="space-between">
                <div style={{ flex: 1 }}>
                  <TextField
                    placeholder={t.searchPlaceholder}
                    value={searchValue}
                    onChange={setSearchValue}
                    clearButton
                    onClearButtonClick={() => setSearchValue('')}
                   autoComplete={'on'} label={''}/>
                </div>
                <Select
                  labelInline
                  label={t.filterLabel}
                  options={[
                    { label: t.filter.all, value: 'all' },
                    { label: t.filter.fulfilled, value: 'fulfilled' },
                    { label: t.filter.unfulfilled, value: 'unfulfilled' },
                    { label: t.filter.processing, value: 'processing' },
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                />
              </InlineStack>
              <div style={{ maxHeight: '60dvh', overflowY: 'auto' }}>
                <DataTable
                  columnContentTypes={[
                    'text',
                    'text',
                    'text',
                    'text',
                    'text',
                    'text',
                  ]}
                  headings={[
                    t.order.id,
                    t.order.customer,
                    t.order.date,
                    t.order.total,
                    t.order.status,
                    '',
                  ]}
                  rows={rows}
                  footerContent={`${t.showing} ${filteredOrders.length} ${t.of} ${ordersData.length} ${t.orders}`}
                />
              </div>
              <div style={{ marginTop: '20px' }}>
                <Pagination
                  label={`${t.pagination.currentPage} ${currentPage} ${t.pagination.page} ${t.pagination.totalPages} ${totalPages} ${t.pagination.page}`}
                  hasPrevious={currentPage > 1}
                  onPrevious={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  hasNext={currentPage < totalPages}
                  onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                />
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>

        {selectedOrder && (
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">{t.orderDetails}</Text>
                <Divider />
                <BlockStack gap="200">
                  <Text variant="bodyMd" as={'strong'}>
                    <strong>{t.order.id}:</strong> {selectedOrder.orderNumber}
                  </Text>
                  <Text variant="bodyMd" as={'strong'}>
                    <strong>{t.order.customer}:</strong> {selectedOrder.customer?.displayName.split('').reverse().join('')}
                  </Text>
                  <Text variant="bodyMd" as={'strong'}>
                    <strong>{t.order.date}:</strong> {formatDate(selectedOrder.processedAt)}
                  </Text>
                  <Text variant="bodyMd" as={'strong'}>
                    <strong>{t.order.total}:</strong> {formatPrice(
                      selectedOrder.totalPriceSet.shopMoney.amount,
                      selectedOrder.totalPriceSet.shopMoney.currencyCode
                    )}
                  </Text>
                  <Text variant="bodyMd" as={'strong'}>
                    <strong>{t.order.status}:</strong> {getStatusBadge(selectedOrder.fulfillmentStatus)}
                  </Text>
                </BlockStack>

                {selectedOrder.fulfillments && selectedOrder.fulfillments.length > 0 && (
                  <>
                    <Divider />
                    <Text as="h3" variant="headingMd">{t.order.tracking.title}</Text>
                    <BlockStack gap="200">
                      {selectedOrder.fulfillments.map((fulfillment) => (
                        <LegacyCard.Section key={fulfillment.id}>
                          <BlockStack gap="200">
                            <Text variant="bodyMd" as={'strong'}>
                              <strong>{t.order.tracking.carrier}:</strong> {fulfillment.trackingInfo?.company || t.notAvailable}
                            </Text>
                            <Text variant="bodyMd" as={'strong'}>
                              <strong>{t.order.tracking.trackingNumber}:</strong> {fulfillment.trackingInfo?.number || t.notAvailable}
                            </Text>
                            {fulfillment.trackingInfo?.number && (
                              <Button onClick={() => {
                                handleTrackPackage(fulfillment.trackingInfo.number, fulfillment.trackingInfo.company);
                              }} variant="plain" loading={trackingLoading}>
                                {t.trackPackage}
                              </Button>
                            )}
                            <Divider />
                            <Text as="h4" variant="headingSm">{t.order.tracking.timeline}</Text>
                            <BlockStack gap="200">
                              <InlineStack gap="200" blockAlign="center">
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#008060'
                                }} />
                                <Text  as={'span'} variant="bodySm">{t.order.timeline.created}</Text>
                              </InlineStack>
                              <InlineStack gap="200" blockAlign="center">
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#008060'
                                }} />
                                <Text as={'span'} variant="bodySm">{t.order.timeline.paid}</Text>
                              </InlineStack>
                              <InlineStack gap="200" blockAlign="center">
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#008060'
                                }} />
                                <Text as={'span'} variant="bodySm">{t.order.timeline.fulfilled}</Text>
                              </InlineStack>
                              <InlineStack gap="200" blockAlign="center">
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#008060'
                                }} />
                                <Text as={'span'} variant="bodySm">{t.order.timeline.shipped}</Text>
                              </InlineStack>
                            </BlockStack>
                          </BlockStack>
                        </LegacyCard.Section>
                      ))}
                    </BlockStack>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>

      <Modal
        open={showFulfillModal}
        onClose={() => setShowFulfillModal(false)}
        title={t.fulfillment.title}
        primaryAction={{
          content: t.fulfillment.fulfill,
          onAction: handleFulfillOrder,
          loading,
        }}
        secondaryActions={[
          {
            content: t.fulfillment.cancel,
            onAction: () => setShowFulfillModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd" as="p">
              {t.fulfillment.selectedCarrier}: {carrier || t.fulfillment.notSelected}
            </Text>
            <TextField
              label={t.fulfillment.trackingNumber}
              value={trackingNumber}
              onChange={setTrackingNumber}
              placeholder={t.fulfillment.trackingPlaceholder}
            />
            <Button
              onClick={() => setNotifyCustomer(!notifyCustomer)}
              variant="plain"
            >
              {notifyCustomer ? '✓' : '✗'} {t.fulfillment.notifyCustomer}
            </Button>
          </BlockStack>
        </Modal.Section>
      </Modal>

      <Modal
        open={showCarrierModal}
        onClose={() => setShowCarrierModal(false)}
        title={t.fulfillment.title}
        primaryAction={{
          content: t.fulfillment.confirmFulfill,
          onAction: handleConfirmFulfill,
          disabled: !carrier || loading,
          loading: loading
        }}
        secondaryActions={[
          {
            content: t.fulfillment.cancel,
            onAction: () => setShowCarrierModal(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd" as="p">
              {t.fulfillment.selectInstructions}
            </Text>
            {warehouseAddress && warehouseAddress.length > 0 && (
              <>
                <ChoiceList
                  title={t.fulfillment.selectWarehouse}
                  choices={warehouseAddress.map((wh: any) => ({
                    label: wh.name,
                    value: wh.id
                  }))}
                  selected={selectedWarehouse ? [selectedWarehouse.id] : []}
                  onChange={(selected: string[]) => {
                    if (selected.length > 0) {
                      const selectedWh = warehouseAddress.find((wh: any) => wh.id === selected[0]);
                      setSelectedWarehouse(selectedWh);
                    }
                  }}
                />
                {selectedWarehouse && (
                  <LegacyCard.Section title={`${selectedWarehouse.name} ${t.fulfillment.warehouseDetails}`}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p"><strong>{t.fulfillment.address}:</strong> {selectedWarehouse.address.address1}</Text>
                      {selectedWarehouse.address.address2 && (
                        <Text variant="bodyMd" as="p"><strong>{t.fulfillment.address2}:</strong> {selectedWarehouse.address.address2}</Text>
                      )}
                      <Text variant="bodyMd" as="p"><strong>{t.fulfillment.city}:</strong> {selectedWarehouse.address.city}</Text>
                      <Text variant="bodyMd" as="p"><strong>{t.fulfillment.state}:</strong> {selectedWarehouse.address.province}</Text>
                      <Text variant="bodyMd" as="p"><strong>{t.fulfillment.zip}:</strong> {selectedWarehouse.address.zip}</Text>
                      <Text variant="bodyMd" as="p"><strong>{t.fulfillment.country}:</strong> {selectedWarehouse.address.country}</Text>
                      <Text variant="bodyMd" as="p"><strong>{t.fulfillment.countryCode}:</strong> {selectedWarehouse.address.countryCode}</Text>
                    </BlockStack>
                  </LegacyCard.Section>
                )}
              </>
            )}
            <ChoiceList
              title={t.fulfillment.selectCarrier}
              choices={carriers.map(carrier => ({
                label: carrier.label,
                value: carrier.value,
                disabled: !carrier.enabled
              }))}
              selected={[carrier]}
              onChange={handleCarrierSelect}
            />

            {parcelTemplatesLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Text as={'span'} variant="bodyMd">加载包裹模板中...</Text>
              </div>
            ) : parcelTemplates.length > 0 ? (
              <>
                <Divider />
                <ChoiceList
                  title="选择包裹模板"
                  choices={parcelTemplates.map(template => ({
                    label: template.name,
                    value: template.token
                  }))}
                  selected={selectedParcelTemplate ? [selectedParcelTemplate.token] : []}
                  onChange={(selected: string[]) => {
                    if (selected.length > 0) {
                      const selectedTemplate = parcelTemplates.find(t => t.token === selected[0]);
                      setSelectedParcelTemplate(selectedTemplate);
                    } else {
                      setSelectedParcelTemplate(null);
                    }
                  }}
                />
                {selectedParcelTemplate && (
                  <LegacyCard.Section title="包裹模板详情">
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p"><strong>名称:</strong> {selectedParcelTemplate.name}</Text>
                      <Text variant="bodyMd" as="p"><strong>承运商:</strong> {selectedParcelTemplate.carrier}</Text>
                      <Text variant="bodyMd" as="p"><strong>长度:</strong> {selectedParcelTemplate.length} {selectedParcelTemplate.distanceUnit}</Text>
                      <Text variant="bodyMd" as="p"><strong>宽度:</strong> {selectedParcelTemplate.width} {selectedParcelTemplate.distanceUnit}</Text>
                      <Text variant="bodyMd" as="p"><strong>高度:</strong> {selectedParcelTemplate.height} {selectedParcelTemplate.distanceUnit}</Text>
                      <Text variant="bodyMd" as="p"><strong>可变尺寸:</strong> {selectedParcelTemplate.isVariableDimensions ? '是' : '否'}</Text>
                    </BlockStack>
                  </LegacyCard.Section>
                )}
              </>
            ) : carrier && !parcelTemplatesLoading ? (
              <Text variant="bodyMd" tone="subdued">该承运商暂无可用包裹模板</Text>
            ) : null}
          </BlockStack>
        </Modal.Section>
      </Modal>

      <Modal
        open={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        title={t.order.tracking.title}
        size="large"
      >
        <Modal.Section>
          {trackingLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text as={'span'} variant="bodyMd">{t.order.tracking.loading}</Text>
            </div>
          ) : trackingInfo ? (
            <BlockStack gap="400">
              <Text variant="bodyMd" as={'strong'}>
                <strong>{t.order.tracking.carrier}:</strong> {trackingInfo.carrier || t.notAvailable}
              </Text>
              <Text variant="bodyMd" as={'strong'}>
                <strong>{t.order.tracking.trackingNumber}:</strong> {trackingInfo.tracking_number || t.notAvailable}
              </Text>
              <Divider />
              <Text as="h4" variant="headingSm">{t.order.tracking.timeline}</Text>
              <BlockStack gap="200">
                {trackingInfo.tracking_history && trackingInfo.tracking_history.length > 0 ? (
                  trackingInfo.tracking_history.map((event: any, index: number) => (
                    <InlineStack key={index} gap="200" blockAlign="center">
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: index === 0 ? '#008060' : '#E1E3E5'
                      }} />
                      <BlockStack gap="100">
                        <Text as={'span'} variant="bodySm" fontWeight={index === 0 ? 'bold' : 'regular'}>
                          {event.status || event.status_details || 'Unknown status'}
                        </Text>
                        {event.location && (
                          <Text as={'span'} variant="bodySm" tone="subdued">
                            {event.location}
                          </Text>
                        )}
                        {event.datetime && (
                          <Text as={'span'} variant="bodySm" tone="subdued">
                            {new Date(event.datetime).toLocaleString()}
                          </Text>
                        )}
                      </BlockStack>
                    </InlineStack>
                  ))
                ) : (
                  <Text as={'span'} variant="bodySm" tone="subdued">
                    {t.order.tracking.noHistory}
                  </Text>
                )}
              </BlockStack>
            </BlockStack>
          ) : (
            <Text as={'span'} variant="bodyMd" tone="subdued">{t.order.tracking.noInfo}</Text>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default OrdersPage;
