-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkingHours" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "WorkingHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdminUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AdminRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT NOT NULL,
    "detailsJson" TEXT NOT NULL DEFAULT '[]',
    "featuresJson" TEXT NOT NULL DEFAULT '[]',
    "price" REAL,
    "promoPrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'RECORDED',
    "emailAttempted" BOOLEAN NOT NULL DEFAULT false,
    "smsAttempted" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerNotification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "subtotalAmount" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "discountCode" TEXT,
    "termsAcceptedAt" DATETIME,
    "idempotencyKey" TEXT,
    "customerViewTokenHash" TEXT,
    "fulfillmentType" TEXT NOT NULL DEFAULT 'MANUAL',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "deliveryInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productSlug" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "listUnitPrice" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL NOT NULL,
    "lineTotal" REAL NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderFulfillment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedAdminId" TEXT,
    "assignedAt" DATETIME,
    "deliveryInfo" TEXT,
    "internalNotes" TEXT,
    "failureReason" TEXT,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderFulfillmentFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fulfillmentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByAdminId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderFulfillmentFile_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "OrderFulfillment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "refundStatus" TEXT NOT NULL DEFAULT 'NONE',
    "verifiedAt" DATETIME,
    "failureReason" TEXT,
    "redirectUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawPayload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIServiceOffering" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titleFa" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "price" REAL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIServiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "offeringId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "delivery" TEXT,
    "contact" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIServiceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIServiceRequest_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "AIServiceOffering" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebsiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "draftConfig" TEXT NOT NULL,
    "publishedConfig" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebsiteSettingsRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configJson" TEXT NOT NULL,
    "label" TEXT,
    "adminId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SitePage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "heroImageUrl" TEXT,
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "productIdsJson" TEXT NOT NULL DEFAULT '[]',
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" DATETIME,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalonPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "monthlyBookingLimit" INTEGER NOT NULL,
    "employeeLimit" INTEGER NOT NULL,
    "aiTokenLimit" INTEGER NOT NULL,
    "priceToman" INTEGER NOT NULL,
    "featuresJson" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "SalonBusiness" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'HAIR_SALON',
    "description" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tehran',
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#111111',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancellationHours" INTEGER NOT NULL DEFAULT 2,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "minAdvanceMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxHorizonDays" INTEGER NOT NULL DEFAULT 60,
    "slotStepMinutes" INTEGER NOT NULL DEFAULT 30,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalonBranch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonBranch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "employeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonMembership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonBusinessHour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SalonBusinessHour_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonHoliday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "SalonHoliday_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonBusinessBreak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "SalonBusinessBreak_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonExceptionHour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT NOT NULL DEFAULT '10:00',
    "endTime" TEXT NOT NULL DEFAULT '20:00',
    CONSTRAINT "SalonExceptionHour_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonEmployee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonEmployee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalonEmployee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "SalonBranch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonEmployeeHour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "SalonEmployeeHour_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "SalonEmployee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonEmployeeBreak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "SalonEmployeeBreak_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "SalonEmployee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonDayOff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    CONSTRAINT "SalonDayOff_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "SalonEmployee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonEmployeeBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "SalonEmployeeBlock_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "SalonEmployee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonServiceCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "SalonServiceCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonOffering" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceToman" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonOffering_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalonOffering_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SalonServiceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonEmployeeService" (
    "employeeId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,

    PRIMARY KEY ("employeeId", "offeringId"),
    CONSTRAINT "SalonEmployeeService_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "SalonEmployee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalonEmployeeService_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "SalonOffering" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonGuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonGuest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "reference" TEXT NOT NULL,
    "slotKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalonBooking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalonBooking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "SalonBranch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalonBooking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "SalonEmployee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalonBooking_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "SalonOffering" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalonBooking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "SalonGuest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonOtp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonOtp_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SalonSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalonSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SalonPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonNotification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonAiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonAiUsage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonAgentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL DEFAULT 'دستیار سالن',
    "language" TEXT NOT NULL DEFAULT 'fa',
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "escalationRules" TEXT NOT NULL DEFAULT '{}',
    "allowedActions" TEXT NOT NULL DEFAULT '{"faq":true,"services":true,"slots":true,"appointments":true,"book":true,"reschedule":true,"cancel":true}',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalonAgentConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonAgentFaq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SalonAgentFaq_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonAiProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT,
    "baseUrl" TEXT,
    "secretCiphertext" TEXT NOT NULL DEFAULT '',
    "secretIv" TEXT NOT NULL DEFAULT '',
    "secretTag" TEXT NOT NULL DEFAULT '',
    "activeForAgent" BOOLEAN NOT NULL DEFAULT false,
    "lastTestAt" DATETIME,
    "lastTestOk" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalonAiProvider_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonAgentConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'website',
    "guestPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalonAgentConversation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonAgentMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonAgentMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SalonAgentConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonAgentPendingAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonAgentPendingAction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalonAgentPendingAction_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SalonAgentConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalonAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalonAudit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "SalonBusiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRole_slug_key" ON "AdminRole"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "CustomerNotification_customerId_readAt_idx" ON "CustomerNotification"("customerId", "readAt");

-- CreateIndex
CREATE INDEX "CustomerNotification_customerId_createdAt_idx" ON "CustomerNotification"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_customerViewTokenHash_key" ON "Order"("customerViewTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "OrderFulfillment_orderId_key" ON "OrderFulfillment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_provider_key" ON "PaymentGatewayConfig"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "AIServiceOffering_slug_key" ON "AIServiceOffering"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SiteContent_key_key" ON "SiteContent"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SitePage_slug_key" ON "SitePage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SalonPlan_slug_key" ON "SalonPlan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SalonBusiness_slug_key" ON "SalonBusiness"("slug");

-- CreateIndex
CREATE INDEX "SalonBranch_businessId_idx" ON "SalonBranch"("businessId");

-- CreateIndex
CREATE INDEX "SalonMembership_email_idx" ON "SalonMembership"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SalonMembership_businessId_email_key" ON "SalonMembership"("businessId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SalonBusinessHour_businessId_dayOfWeek_key" ON "SalonBusinessHour"("businessId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "SalonHoliday_businessId_date_key" ON "SalonHoliday"("businessId", "date");

-- CreateIndex
CREATE INDEX "SalonBusinessBreak_businessId_dayOfWeek_idx" ON "SalonBusinessBreak"("businessId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "SalonExceptionHour_businessId_date_key" ON "SalonExceptionHour"("businessId", "date");

-- CreateIndex
CREATE INDEX "SalonEmployee_businessId_idx" ON "SalonEmployee"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonEmployeeHour_employeeId_dayOfWeek_key" ON "SalonEmployeeHour"("employeeId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "SalonDayOff_employeeId_date_key" ON "SalonDayOff"("employeeId", "date");

-- CreateIndex
CREATE INDEX "SalonEmployeeBlock_employeeId_date_idx" ON "SalonEmployeeBlock"("employeeId", "date");

-- CreateIndex
CREATE INDEX "SalonServiceCategory_businessId_idx" ON "SalonServiceCategory"("businessId");

-- CreateIndex
CREATE INDEX "SalonOffering_businessId_idx" ON "SalonOffering"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonGuest_businessId_phone_key" ON "SalonGuest"("businessId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "SalonBooking_reference_key" ON "SalonBooking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "SalonBooking_slotKey_key" ON "SalonBooking"("slotKey");

-- CreateIndex
CREATE INDEX "SalonBooking_employeeId_startTime_idx" ON "SalonBooking"("employeeId", "startTime");

-- CreateIndex
CREATE INDEX "SalonBooking_businessId_startTime_idx" ON "SalonBooking"("businessId", "startTime");

-- CreateIndex
CREATE INDEX "SalonBooking_guestId_idx" ON "SalonBooking"("guestId");

-- CreateIndex
CREATE INDEX "SalonOtp_businessId_phone_idx" ON "SalonOtp"("businessId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "SalonSubscription_businessId_key" ON "SalonSubscription"("businessId");

-- CreateIndex
CREATE INDEX "SalonNotification_businessId_createdAt_idx" ON "SalonNotification"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "SalonAiUsage_businessId_createdAt_idx" ON "SalonAiUsage"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalonAgentConfig_businessId_key" ON "SalonAgentConfig"("businessId");

-- CreateIndex
CREATE INDEX "SalonAgentFaq_businessId_sortOrder_idx" ON "SalonAgentFaq"("businessId", "sortOrder");

-- CreateIndex
CREATE INDEX "SalonAiProvider_businessId_idx" ON "SalonAiProvider"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonAiProvider_businessId_provider_key" ON "SalonAiProvider"("businessId", "provider");

-- CreateIndex
CREATE INDEX "SalonAgentConversation_businessId_updatedAt_idx" ON "SalonAgentConversation"("businessId", "updatedAt");

-- CreateIndex
CREATE INDEX "SalonAgentMessage_conversationId_createdAt_idx" ON "SalonAgentMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "SalonAgentPendingAction_businessId_expiresAt_idx" ON "SalonAgentPendingAction"("businessId", "expiresAt");

-- CreateIndex
CREATE INDEX "SalonAgentPendingAction_conversationId_idx" ON "SalonAgentPendingAction"("conversationId");

-- CreateIndex
CREATE INDEX "SalonAudit_businessId_createdAt_idx" ON "SalonAudit"("businessId", "createdAt");
