import type { WebsiteConfig } from '@/lib/site-config/types'
import { themeToCssVars } from '@/lib/site-config/service'

export function SiteThemeStyles({ theme }: { theme: WebsiteConfig['theme'] }) {
  const vars = themeToCssVars(theme)
  const css = `
    html[data-site-theme="${theme.mode}"] {
      --color-mr-red: ${theme.primaryColor};
      --color-mr-charcoal: ${theme.secondaryColor};
      --color-mr-black: ${theme.backgroundColor};
      font-size: calc(16px * ${theme.fontScale});
    }
    html[data-site-theme="light"] body {
      background: #f4f4f5;
      color: #111;
    }
    html[data-site-theme="light"] .card-shop,
    html[data-site-theme="light"] .card-ai {
      background: #fff;
      color: #111;
    }
  `

  return (
    <style
      dangerouslySetInnerHTML={{ __html: css }}
    />
  )
}
