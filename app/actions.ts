'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { kv } from '@vercel/kv'

import { auth } from '@/auth'
import { type Chat } from '@/lib/types'
import {
  deleteChatById,
  deleteChatsByUserId,
  getChatById,
  getChatsByUserId,
  insertChat,
  updateChat
} from '@/lib/storage'

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }

  try {
    return getChatsByUserId(userId)
  } catch (error) {
    return []
  }
}

export async function getChat(id: string, userId: string) {
  const chat = await getChatById(id)

  if (!chat || (userId && chat.userId !== userId)) {
    return null
  }

  return chat
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  //Convert uid to string for consistent comparison with session.user.id
  const uid = (await getChatById(id))?.userId

  if (uid !== session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  await deleteChatById(id)

  revalidatePath('/')
  return revalidatePath(path)
}

export async function clearChats() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  await deleteChatsByUserId(session.user.id)

  revalidatePath('/')
  return redirect('/')
}

export async function getSharedChat(id: string) {
  const chat = await getChatById(id)

  if (!chat || !chat.sharePath) {
    return null
  }

  return chat
}

export async function shareChat(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chat = await getChatById(id)

  if (!chat || chat.userId !== session.user.id) {
    return {
      error: 'Something went wrong'
    }
  }

  const payload = {
    ...chat,
    sharePath: `/share/${chat.id}`
  }

  await updateChat(id, payload)

  return payload
}

export async function saveChat(chat: Chat) {
  const session = await auth()

  if (session && session.user) {
    await insertChat(chat)
  } else {
    return
  }
}

export async function refreshHistory(path: string) {
  redirect(path)
}

export async function getMissingKeys() {
  const keysRequired = ['OPENAI_API_KEY']
  return keysRequired
    .map(key => (process.env[key] ? '' : key))
    .filter(key => key !== '')
}
