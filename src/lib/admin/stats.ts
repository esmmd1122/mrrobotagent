import { prisma } from '@/lib/db'

export async function getDashboardStats() {
  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    unpaidOrders,
    paidOrders,
    pendingFulfillment,
    totalCustomers,
    totalProducts,
    revenueAgg,
    recentOrders,
    recentCustomers,
    recentActivity,
    recentPayments,
    topProducts,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: { status: { in: ['PENDING_PAYMENT', 'PROCESSING'] } },
    }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.count({ where: { paymentStatus: 'UNPAID' } }),
    prisma.order.count({ where: { paymentStatus: 'PAID' } }),
    prisma.order.count({
      where: {
        paymentStatus: 'PAID',
        fulfillmentStatus: { in: ['PENDING', 'PROCESSING', 'WAITING_FOR_CUSTOMER'] },
      },
    }),
    prisma.customer.count(),
    prisma.product.count({ where: { isVisible: true } }),
    prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    }),
    prisma.customer.findMany({ take: 6, orderBy: { createdAt: 'desc' } }),
    prisma.activityLog.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: { admin: true },
    }),
    prisma.payment.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { order: { include: { customer: true } } },
    }),
    prisma.orderItem.groupBy({
      by: ['productName'],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5,
    }),
  ])

  const ordersLast30Days = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    select: { createdAt: true, totalAmount: true, paymentStatus: true },
  })

  const chartMap = new Map<string, { orders: number; revenue: number }>()
  for (const o of ordersLast30Days) {
    const key = o.createdAt.toISOString().slice(0, 10)
    const row = chartMap.get(key) || { orders: 0, revenue: 0 }
    row.orders += 1
    if (o.paymentStatus === 'PAID') row.revenue += o.totalAmount
    chartMap.set(key, row)
  }

  const chart = Array.from(chartMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    unpaidOrders,
    paidOrders,
    pendingFulfillment,
    totalCustomers,
    totalProducts,
    totalRevenue: revenueAgg._sum.totalAmount ?? 0,
    recentOrders,
    recentCustomers,
    recentActivity,
    recentPayments,
    topProducts,
    chart,
  }
}