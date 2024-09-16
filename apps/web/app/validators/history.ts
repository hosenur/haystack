import vine from '@vinejs/vine'
export const createHistoryValidator = vine.compile(vine.array(
    vine.object({
        id: vine.string(),
        lastVisitTime: vine.number(),
        typedCount: vine.number(),
        title: vine.string(),
        url: vine.string(),
        visitCount: vine.number(),
    })).minLength(1)
)