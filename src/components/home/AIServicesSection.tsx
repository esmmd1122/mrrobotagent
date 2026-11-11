'use client'

import { motion } from 'framer-motion'
import { aiServices } from '@/data/aiServices'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ServiceIcon } from '@/components/icons/ServiceIcons'
import { Button } from '@/components/ui/Button'

export function AIServicesSection({
  title,
  description,
}: {
  title?: string
  description?: string
}) {
  return (
    <section id="ai" className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-mr-black via-[#0d0e14] to-mr-black" />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-mr-red/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-mr-red/5 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          titleEn="MR.ROBOT AI"
          title={title || 'MR.ROBOT AI'}
          description={description || 'راهکارهای هوشمند برای زندگی و کسب‌وکار'}
          align="center"
        />

        <div className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-2">
          {aiServices.map((service, index) => (
            <motion.article
              key={service.id}
              className="card-ai flex flex-col gap-4 p-6 sm:p-7"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: index * 0.06, duration: 0.45 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-mr-red/25 bg-mr-red/5">
                  <ServiceIcon icon={service.icon} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mr-muted">
                    {service.description}
                  </p>
                </div>
              </div>
              <p className="rounded-xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white/85">
                {service.useCase}
              </p>
              <Button
                href={`/contact?subject=${encodeURIComponent(`درخواست: ${service.title}`)}`}
                variant="primary"
                className="mt-auto w-full sm:w-fit"
              >
                درخواست سرویس
              </Button>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
