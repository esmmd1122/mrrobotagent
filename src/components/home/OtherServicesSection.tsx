'use client'

import { motion } from 'framer-motion'
import { otherServices } from '@/data/otherServices'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'

export function OtherServicesSection() {
  return (
    <section id="other" className="border-t border-mr-border py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="سایر خدمات دیجیتال"
          description="خدمات تکمیلی برای اکوسیستم Apple و تلگرام — بدون نیاز به جستجوی پراکنده."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {otherServices.map((service, i) => (
            <motion.div
              key={service.id}
              className="card-shop p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <h3 className="text-lg font-bold">{service.title}</h3>
              <p className="mt-2 text-sm text-mr-muted">{service.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                {service.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-mr-red">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button href="/contact" variant="secondary">
            مشاوره رایگان
          </Button>
        </div>
      </div>
    </section>
  )
}
