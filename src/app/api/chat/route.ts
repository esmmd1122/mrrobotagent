import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { createBookingTools } from '@/ai/tools'

export async function POST(req: Request) {
  try {
    const { messages, businessSlug } = await req.json()

    const slug = businessSlug || 'default-salon'
    const tools = createBookingTools(slug)

    const result = await streamText({
      model: openai('gpt-4o'),
      messages,
      system: `تو یک منشی هوشمند، حرفه‌ای و خوش‌برخورد برای سالن زیبایی هستی. 
      وظیفه داری با مشتریان گفتگو کنی، اطلاعات خدمات و قیمت‌ها را از طریق ابزارها به آن‌ها بگویی و در نهایت برایشان نوبت ثبت کنی.
      همیشه پاسخ‌هایت را به زبان فارسی روان و صمیمی بنویس. پیش از ثبت نوبت نهایی، حتماً شماره تماس، نام و سرویس مدنظر مشتری را تایید کن.`,
      tools,
      maxSteps: 5,
    })

    return result.toDataStreamResponse()
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}