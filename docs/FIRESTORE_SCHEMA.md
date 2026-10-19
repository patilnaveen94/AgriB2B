# AgriFlow B2B — Firestore Data Schema

All timestamps are stored as Firestore `Timestamp`. The client data-service
serialises them to ISO-8601 strings for the React layer (`src/types`).

```
users/{uid}
  ├─ email:               string
  ├─ role:                'super_admin' | 'staff' | 'retailer'
  ├─ staffFunction?:      'godown_worker' | 'sales_executive' | 'super_admin'
  ├─ status:              'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'
  ├─ business:            { businessName, ownerName, phone, taxId,
  │                         fertilizerLicenseNo, addressLine, city, state, pincode }
  ├─ retailer?:           { creditLimit, outstandingBalance, priceTier,
  │                         licenseDocUrl, licenseFileName }
  ├─ createdAt:           Timestamp
  ├─ approvedAt?:         Timestamp
  ├─ approvedBy?:         string (admin uid)
  └─ rejectionReason?:    string

products/{productId}
  ├─ name, brand, category, description, unit
  ├─ hsnCode:             string
  ├─ taxRatePct:          number   (GST %)
  ├─ basePrice:           number   (per unit, pre-tax)
  ├─ imageUrl?:           string
  ├─ volumeTiers:         [{ minQty, discountPct }]
  ├─ totalStock:          number   (denormalised sum of batch quantities)
  ├─ lowStockThreshold:   number
  ├─ active:              boolean
  ├─ createdAt:           Timestamp
  │
  └─ batches/{batchId}                (sub-collection)
       ├─ batchNumber:    string
       ├─ quantity:       number
       ├─ manufactureDate:Timestamp
       ├─ expiryDate:     Timestamp
       ├─ mrp:            number
       └─ createdAt:      Timestamp

orders/{orderId}
  ├─ orderNumber:         string   (human-friendly, e.g. AGF-2026-000123)
  ├─ retailerId:          string (uid)
  ├─ retailerName:        string
  ├─ poNumber:            string
  ├─ paymentMode:         'CREDIT' | 'CASH'
  ├─ status:              'SUBMITTED' | 'QUANTITY_APPROVED' | 'PACKING'
  │                       | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'REJECTED'
  ├─ items:               [OrderLineItem]
  ├─ subTotal, taxTotal, grandTotal: number
  ├─ challanNumber?, shippingNote?:  string
  ├─ timeline:            [{ status, at, by, note }]
  ├─ createdAt:           Timestamp
  └─ updatedAt:           Timestamp

inventory_logs/{logId}
  ├─ productId, productName, batchNumber?
  ├─ action:              'BATCH_ADDED' | 'BATCH_UPDATED' | 'STOCK_DEDUCTED' | 'STOCK_ADJUSTED'
  ├─ quantityDelta:       number
  ├─ by:                  string (uid)
  ├─ note?:               string
  └─ createdAt:           Timestamp

credit_ledgers/{entryId}
  ├─ retailerId:          string (uid)
  ├─ type:                'DEBIT' | 'CREDIT'
  ├─ amount:              number
  ├─ balanceAfter:        number
  ├─ reference:           string
  ├─ note?:               string
  └─ createdAt:           Timestamp

announcements/{announcementId}
  ├─ type:                'SCHEME' | 'BANNER'
  ├─ title, body, bannerColor?
  ├─ category?:           ProductCategory
  ├─ startsAt, endsAt:    Timestamp
  ├─ active:              boolean
  └─ createdAt:           Timestamp

rake_arrivals/{rakeId}
  ├─ rakeNumber, productName, category
  ├─ quantity:            number
  ├─ originStation, destinationGodown
  ├─ status:              'SCHEDULED' | 'IN_TRANSIT' | 'ARRIVED' | 'ALLOCATED'
  ├─ expectedArrival:     Timestamp
  └─ createdAt:           Timestamp
```

## Indexes (recommended composite)

| Collection      | Fields                                   | Used by                        |
| --------------- | ---------------------------------------- | ------------------------------ |
| orders          | retailerId ASC, createdAt DESC           | Retailer order tracker         |
| orders          | status ASC, createdAt DESC               | Admin order queue              |
| credit_ledgers  | retailerId ASC, createdAt DESC           | Ledger statement               |
| announcements   | active ASC, endsAt ASC                   | Active schemes on dashboard    |
| rake_arrivals   | status ASC, expectedArrival ASC          | Upcoming rakes                 |

## Roles & custom claims

On approval, a Cloud Function sets the Auth custom claims:

```json
{ "role": "retailer", "status": "ACTIVE" }
```

Staff/admins are provisioned with `{ "role": "staff", "staffFunction": "godown_worker" }`
or `{ "role": "super_admin", "staffFunction": "super_admin" }`.
