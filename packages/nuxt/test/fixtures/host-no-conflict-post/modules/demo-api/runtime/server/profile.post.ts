import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return {
    source: 'collection-post',
  }
})
