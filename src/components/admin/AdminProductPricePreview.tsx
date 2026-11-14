import { effectiveUnitPrice } from '@/modules/commerce/unit-price'
import { formatStoreMoney, STORE_CURRENCY_CODE, STORE_CURRENCY_LABEL_FA } from '@/modules/commerce/money'
import { isPurchasableProduct } from '@/modules/commerce/product-pricing'

type Props = {
  price: number | null
  promoPrice: number | null
  isVisible: boolean
  isAvailable: boolean
}

export function AdminProductPricePreview({ price, promoPrice, isVisible, isAvailable }: Props) {
  const unit = effectiveUnitPrice(price, promoPrice)
  const purchasable = isPurchasableProduct({ price, promoPrice, isVisible, isAvailable })

  return (
    <div className="admin-card space-y-2 p-4 text-sm">
      <h2 className="font-semibold">پیش‌نمایش قیمت برای مشتری</h2>
      <p className="text-white/70">
        مبالغ را به <strong>{STORE_CURRENCY_LABEL_FA}</strong> وارد کنید؛ تبدیل خودکار ریال انجام نمی‌شود.
      </p>
      <p>
        قیمت موثر:{' '}
        <strong>{unit != null ? formatStoreMoney(unit, STORE_CURRENCY_CODE) : 'تماس بگیرید (بدون خرید آنلاین)'}</strong>
      </p>
      <p>
        وضعیت خرید آنلاین:{' '}
        <strong className={purchasable ? 'text-green-300' : 'text-amber-300'}>
          {purchasable ? 'قابل افزودن به سبد' : 'غیرقابل خرید آنلاین'}
        </strong>
      </p>
      {isVisible && !purchasable ? (
        <p className="text-amber-200/90">
          این محصول در سایت نمایش داده می‌شود اما بدون قیمت ثابت وارد تسویه‌حساب نمی‌شود.
        </p>
      ) : null}
    </div>
  )
}